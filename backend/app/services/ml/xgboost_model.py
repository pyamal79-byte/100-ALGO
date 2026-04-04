import os
import logging
import pandas as pd
import numpy as np
import xgboost as xgb
import joblib
from sklearn.metrics import log_loss
from sqlalchemy.orm import Session

# Import des modèles SQLAlchemy
from app.models.models import Match, Prediction, MatchStatus

logger = logging.getLogger(__name__)

# Chemin où le modèle sera sauvegardé localement
MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "xgboost_model.joblib")

class AlgoPredictor:
    def __init__(self, model_path: str = MODEL_PATH):
        self.model_path = model_path
        
        # =====================================================================
        # HYPERPARAMÈTRES XGBOOST (À ajuster selon vos expérimentations)
        # =====================================================================
        self.model = xgb.XGBClassifier(
            n_estimators=100,          # Nombre d'arbres (plus d'arbres = plus complexe, risque d'overfitting)
            learning_rate=0.05,        # Taux d'apprentissage (0.01 à 0.1 recommandé. Plus bas = plus précis mais plus lent)
            max_depth=5,               # Profondeur max des arbres (3 à 7 recommandé pour éviter l'overfitting)
            subsample=0.8,             # % de données utilisées pour chaque arbre (aide à la généralisation)
            colsample_bytree=0.8,      # % de features utilisées pour chaque arbre
            objective='multi:softprob',# Objectif : classification multi-classes avec probabilités en sortie
            eval_metric='mlogloss',    # Métrique interne d'évaluation (Multi-class Log Loss)
            random_state=42            # Seed pour la reproductibilité
        )
        
        # Charger le modèle s'il a déjà été entraîné et sauvegardé
        if os.path.exists(self.model_path):
            self.model = joblib.load(self.model_path)

    def train_model(self, df: pd.DataFrame, target_col: str = 'target'):
        """
        Entraîne le modèle XGBoost sur l'historique des matchs.
        
        :param df: DataFrame Pandas contenant les features et la colonne cible.
        :param target_col: Nom de la colonne cible (ex: 0=Away, 1=Draw, 2=Home).
        """
        logger.info("Début de l'entraînement du modèle XGBoost...")
        
        # Séparation des features (X) et de la cible (y)
        X = df.drop(columns=[target_col])
        y = df[target_col]

        # Entraînement du modèle
        self.model.fit(X, y)
        
        # Création du dossier si inexistant puis sauvegarde du modèle
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump(self.model, self.model_path)
        logger.info(f"Modèle entraîné et sauvegardé sous {self.model_path}")

    def predict_match(self, features: pd.DataFrame) -> np.ndarray:
        """
        Renvoie les probabilités brutes pour un match à venir.
        
        :param features: DataFrame contenant les statistiques du match (1 ligne).
        :return: Array des probabilités [proba_away, proba_draw, proba_home]
        """
        if not hasattr(self.model, "classes_"):
            raise ValueError("Le modèle n'est pas encore entraîné. Veuillez lancer train_model() d'abord.")
        
        # predict_proba renvoie un tableau 2D, on prend la première ligne
        # L'ordre dépend de l'encodage de la target (ex: 0=Away, 1=Draw, 2=Home)
        probabilities = self.model.predict_proba(features)[0]
        return probabilities


def auto_retrain(db: Session):
    """
    Feedback Loop : Récupère les matchs terminés, évalue les anciennes prédictions (Log Loss),
    et ré-entraîne le modèle XGBoost avec ces nouvelles données pour qu'il s'améliore en continu.
    """
    logger.info("Démarrage de la Feedback Loop (Auto-Retrain)...")
    
    # 1. Récupérer les matchs terminés qui ont une prédiction associée
    finished_matches = db.query(Match, Prediction).join(Prediction).filter(
        Match.status == MatchStatus.FINISHED
    ).all()

    if not finished_matches:
        logger.warning("Aucun match terminé trouvé pour la Feedback Loop.")
        return

    y_true = []
    y_pred = []
    training_data = []

    for match, prediction in finished_matches:
        # Déterminer le résultat réel (Target)
        # Encodage choisi : 0 = Victoire Extérieur, 1 = Nul, 2 = Victoire Domicile
        if match.home_score > match.away_score:
            actual_result = 2
        elif match.home_score == match.away_score:
            actual_result = 1
        else:
            actual_result = 0
            
        y_true.append(actual_result)
        
        # Récupérer les probabilités prédites (pour le calcul de la Log Loss)
        proba_draw = prediction.proba_draw if prediction.proba_draw is not None else 0.0
        y_pred.append([prediction.proba_away, proba_draw, prediction.proba_home])

        # --- Construction du dataset d'entraînement ---
        # Ici, on extrait les features du match. Dans le système final, 
        # on fera une jointure avec FootballStat / BasketballStat.
        features = {
            # Exemple de feature basique : différence de ELO
            "elo_diff": match.home_team.elo_rating - match.away_team.elo_rating if match.home_team and match.away_team else 0,
            # TODO: Ajouter xG, PPDA, Pace, eFG% depuis les tables de stats
            "target": actual_result
        }
        training_data.append(features)

    # 2. Évaluation des performances passées (Log Loss)
    try:
        # labels=[0, 1, 2] garantit que la fonction comprend les 3 classes possibles
        current_log_loss = log_loss(y_true, y_pred, labels=[0, 1, 2])
        logger.info(f"Évaluation du modèle actuel - Log Loss: {current_log_loss:.4f}")
        # Plus la Log Loss est proche de 0, meilleures sont les prédictions.
    except Exception as e:
        logger.error(f"Erreur lors du calcul de la Log Loss: {e}")

    # 3. Ré-entraînement du modèle (Mise à jour)
    df_train = pd.DataFrame(training_data)
    
    # On s'assure d'avoir un minimum de données avant de ré-entraîner
    if len(df_train) > 50:
        predictor = AlgoPredictor()
        predictor.train_model(df_train, target_col='target')
        logger.info("Feedback Loop terminée avec succès. Modèle mis à jour avec les dernières données.")
    else:
        logger.info(f"Pas assez de nouvelles données pour ré-entraîner le modèle (actuel: {len(df_train)}, minimum: 50).")

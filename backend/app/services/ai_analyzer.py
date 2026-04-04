import os
import logging
from openai import OpenAI, OpenAIError

logger = logging.getLogger(__name__)

# =====================================================================
# CONFIGURATION DE L'API OPENAI
# =====================================================================
from app.config import config

# L'API Key est chargée depuis config.py
OPENAI_API_KEY = config.OPENAI_API_KEY

# Initialisation du client OpenAI (le client gère automatiquement la clé si elle est dans l'environnement, 
# mais nous la passons explicitement par sécurité)
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

def generate_expert_analysis(match_data: dict, algo_probabilities: dict, value_bet_margin: float) -> str:
    """
    Génère une courte analyse experte (3 phrases max) expliquant le Value Bet
    en utilisant l'IA générative d'OpenAI (gpt-4o).
    
    :param match_data: Dictionnaire contenant les infos du match (équipes, cotes, stats réelles).
    :param algo_probabilities: Dictionnaire contenant les probabilités calculées par notre algo.
    :param value_bet_margin: L'avantage mathématique calculé (Edge en %).
    :return: Un court paragraphe d'analyse.
    """
    if not client:
        logger.error("OPENAI_API_KEY n'est pas définie. Impossible de générer l'analyse.")
        return "Analyse IA indisponible (Clé API manquante)."

    try:
        # 1. Extraction des données pour le prompt
        home_team = match_data.get('home_team', 'Équipe Domicile')
        away_team = match_data.get('away_team', 'Équipe Extérieur')
        bookmaker_odds = match_data.get('bookmaker_odds', 'N/A')
        prediction = match_data.get('prediction', 'N/A')
        stats = match_data.get('stats', {})
        
        algo_prob = algo_probabilities.get('probability', 0)

        # 2. Construction du prompt dynamique
        prompt = f"""
        Analyse cette situation de pari (Value Bet) et rédige un court paragraphe (3 phrases MAXIMUM) pour justifier le choix de l'algorithme.
        Sois précis, analytique, professionnel et va droit au but. Utilise un ton de trader sportif quantitatif.
        
        DONNÉES DU MATCH :
        - Match : {home_team} vs {away_team}
        - Prédiction de l'algorithme : {prediction}
        - Probabilité calculée par notre modèle : {algo_prob}%
        - Cote du bookmaker : {bookmaker_odds}
        - Avantage mathématique (Value/Edge) : +{value_bet_margin}%
        - Statistiques clés du match : {stats}
        """

        logger.info(f"Génération de l'analyse IA pour {home_team} vs {away_team}...")

        # 3. Appel à l'API OpenAI
        response = client.chat.completions.create(
            model="gpt-4o", # Modèle très performant pour le raisonnement analytique
            messages=[
                {
                    "role": "system", 
                    "content": "Tu es un analyste quantitatif expert en paris sportifs et en data science. Tu expliques de manière concise pourquoi un pari est mathématiquement rentable en te basant sur les statistiques."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            max_tokens=150,      # Limite stricte pour garantir une réponse courte
            temperature=0.7      # Température équilibrée (ni trop créatif, ni trop robotique)
        )

        # 4. Extraction et retour de la réponse
        analysis = response.choices[0].message.content.strip()
        logger.info("Analyse IA générée avec succès.")
        return analysis

    except OpenAIError as e:
        # Gestion spécifique des erreurs de l'API OpenAI (Rate limit, Auth error, etc.)
        logger.error(f"Erreur lors de l'appel à l'API OpenAI : {e}")
        return "L'analyse détaillée est temporairement indisponible suite à une erreur du service IA."
    except Exception as e:
        # Gestion des erreurs inattendues (ex: KeyError sur les dictionnaires)
        logger.error(f"Erreur inattendue dans generate_expert_analysis : {e}")
        return "Erreur interne lors de la génération de l'analyse."

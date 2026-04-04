import numpy as np
from typing import Dict

def simulate_football_match(home_xg: float, away_xg: float, iterations: int = 10000) -> Dict[str, float]:
    """
    Simule un match de football en utilisant la loi de Poisson basée sur les Expected Goals (xG).
    Utilise NumPy pour une exécution vectorisée ultra-rapide.
    
    :param home_xg: Expected Goals de l'équipe à domicile.
    :param away_xg: Expected Goals de l'équipe à l'extérieur.
    :param iterations: Nombre de simulations (défaut: 10000).
    :return: Dictionnaire contenant les probabilités en pourcentage.
    """
    # Génération vectorisée de 10 000 scores selon la loi de Poisson
    home_goals = np.random.poisson(home_xg, iterations)
    away_goals = np.random.poisson(away_xg, iterations)

    # Calcul des résultats (tableaux booléens convertis en sommes)
    home_wins = np.sum(home_goals > away_goals)
    draws = np.sum(home_goals == away_goals)
    away_wins = np.sum(home_goals < away_goals)

    # Conversion en pourcentages
    return {
        "proba_home": float((home_wins / iterations) * 100.0),
        "proba_draw": float((draws / iterations) * 100.0),
        "proba_away": float((away_wins / iterations) * 100.0)
    }

def simulate_basketball_match(home_rating: float, away_rating: float, pace: float, iterations: int = 10000) -> Dict[str, float]:
    """
    Simule un match de basketball en utilisant une distribution normale.
    Le score attendu est calculé via l'efficacité offensive (rating) et le rythme (pace).
    
    :param home_rating: Efficacité offensive de l'équipe à domicile (ex: points pour 100 possessions).
    :param away_rating: Efficacité offensive de l'équipe à l'extérieur.
    :param pace: Nombre de possessions estimé pour le match.
    :param iterations: Nombre de simulations (défaut: 10000).
    :return: Dictionnaire avec probabilités de victoire et le score total médian.
    """
    # Calcul des points attendus (Expected Points)
    home_expected = (home_rating / 100.0) * pace
    away_expected = (away_rating / 100.0) * pace

    # Écart-type typique pour un score d'équipe NBA (environ 11 à 13 points)
    std_dev = 12.0

    # Génération vectorisée des scores (distribution normale)
    home_scores = np.random.normal(home_expected, std_dev, iterations)
    away_scores = np.random.normal(away_expected, std_dev, iterations)

    # Au basket, il n'y a pas de match nul (prolongations). 
    # Avec des floats continus, l'égalité stricte est quasi-impossible, mais on filtre par sécurité.
    home_wins = np.sum(home_scores > away_scores)
    away_wins = np.sum(home_scores < away_scores)
    total_decisive = home_wins + away_wins

    # Calcul du score total pour le marché Over/Under
    total_scores = home_scores + away_scores
    median_total = np.median(total_scores)

    # Sécurité anti-division par zéro
    if total_decisive == 0:
        proba_h, proba_a = 50.0, 50.0
    else:
        proba_h = (home_wins / total_decisive) * 100.0
        proba_a = (away_wins / total_decisive) * 100.0

    return {
        "proba_home": float(proba_h),
        "proba_away": float(proba_a),
        "median_total": float(median_total)
    }

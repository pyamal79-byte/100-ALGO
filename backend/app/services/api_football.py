import os
import time
import logging
import requests
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# =====================================================================
# CONFIGURATION DE L'API
# =====================================================================
from app.config import config

# L'API Key est chargée depuis config.py
API_FOOTBALL_KEY = config.API_FOOTBALL_KEY
BASE_URL = "https://v3.football.api-sports.io"

HEADERS = {
    "x-apisports-key": API_FOOTBALL_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io"
}

# IDs des 5 grands championnats européens + Champions League (selon API-Football)
LEAGUES_IDS = {
    "Champions League": 2,
    "Premier League": 39,
    "Ligue 1": 61,
    "Bundesliga": 78,
    "Serie A": 135,
    "La Liga": 140
}

# =====================================================================
# GESTIONNAIRE DE RATE LIMIT (QUOTA)
# =====================================================================
def _make_request(url: str, params: dict = None, retries: int = 3) -> Optional[Dict]:
    """
    Fonction utilitaire pour faire des requêtes à l'API avec gestion du Rate Limit.
    Le plan gratuit de API-Football autorise généralement 10 requêtes / minute.
    """
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, params=params, timeout=10)
            
            # Si on dépasse le quota par minute ou par jour (HTTP 429 Too Many Requests)
            if response.status_code == 429:
                logger.warning(f"Rate limit atteint (429). Tentative {attempt + 1}/{retries}. Pause de 6 secondes...")
                time.sleep(6) # Pause pour laisser passer la minute
                continue
                
            response.raise_for_status()
            
            data = response.json()
            
            # API-Football renvoie parfois les erreurs dans le body JSON plutôt qu'en HTTP status
            if data.get("errors") and len(data["errors"]) > 0:
                logger.error(f"Erreur API-Football : {data['errors']}")
                return None
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur réseau lors de l'appel à {url} : {e}")
            if attempt == retries - 1:
                return None
            time.sleep(2)
            
    return None

# =====================================================================
# FONCTIONS MÉTIER
# =====================================================================
def get_daily_fixtures() -> List[Dict]:
    """
    Récupère les matchs du jour pour les 5 grands championnats + Champions League.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    # Calcul basique de la saison en cours (ex: en mai 2024, la saison est 2023)
    current_month = datetime.now().month
    current_year = datetime.now().year
    season = current_year if current_month >= 7 else current_year - 1
    
    all_fixtures = []
    
    logger.info(f"Récupération des matchs du {today} pour la saison {season}...")
    
    for league_name, league_id in LEAGUES_IDS.items():
        url = f"{BASE_URL}/fixtures"
        params = {
            "date": today,
            "league": league_id,
            "season": season
        }
        
        data = _make_request(url, params)
        if data and "response" in data:
            fixtures = data["response"]
            logger.info(f"{league_name} : {len(fixtures)} match(s) trouvé(s).")
            all_fixtures.extend(fixtures)
            
    return all_fixtures

def get_team_statistics(team_id: int, league_id: int, season: int) -> Optional[Dict]:
    """
    Récupère les statistiques avancées d'une équipe pour une saison et une ligue données.
    Ces données (Buts marqués/encaissés, tirs, etc.) alimenteront le simulateur Monte Carlo.
    
    :param team_id: ID de l'équipe (ex: 85 pour PSG)
    :param league_id: ID de la ligue (ex: 61 pour Ligue 1)
    :param season: Année de début de la saison (ex: 2023)
    """
    url = f"{BASE_URL}/teams/statistics"
    params = {
        "team": team_id,
        "league": league_id,
        "season": season
    }
    
    logger.info(f"Récupération des stats pour l'équipe {team_id} (Ligue {league_id}, Saison {season})...")
    data = _make_request(url, params)
    
    if not data or "response" not in data:
        return None
        
    stats = data["response"]
    
    # Extraction des données pertinentes pour notre algorithme
    try:
        # Buts marqués et encaissés en moyenne
        goals_for_avg = float(stats["goals"]["for"]["average"]["total"])
        goals_against_avg = float(stats["goals"]["against"]["average"]["total"])
        
        # On pourrait extraire d'autres données utiles si disponibles dans le plan (tirs cadrés, possession...)
        # Pour l'instant, on se concentre sur les métriques clés pour estimer les xG
        
        extracted_stats = {
            "team_id": team_id,
            "league_id": league_id,
            "matches_played": stats["fixtures"]["played"]["total"],
            "goals_for_avg": goals_for_avg,
            "goals_against_avg": goals_against_avg,
            "clean_sheets": stats["clean_sheet"]["total"],
            "failed_to_score": stats["failed_to_score"]["total"],
            # Forme récente (ex: "WWDLD")
            "form": stats.get("form", "")
        }
        return extracted_stats
        
    except (KeyError, TypeError, ValueError) as e:
        logger.error(f"Erreur lors du parsing des statistiques de l'équipe {team_id}: {e}")
        return None

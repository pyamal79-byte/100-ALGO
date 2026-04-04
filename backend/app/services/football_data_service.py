import time
import logging
import requests
from typing import List, Dict, Optional
from app.config import config

logger = logging.getLogger(__name__)

# =====================================================================
# CONFIGURATION DE L'API FOOTBALL-DATA.ORG
# =====================================================================
FOOTBALL_DATA_KEY = config.FOOTBALL_DATA_KEY
BASE_URL = "https://api.football-data.org/v4"

HEADERS = {
    "X-Auth-Token": FOOTBALL_DATA_KEY
}

# Codes des compétitions majeures pour football-data.org
COMPETITIONS = {
    "Champions League": "CL",
    "Premier League": "PL",
    "Ligue 1": "FL1",
    "Bundesliga": "BL1",
    "Serie A": "SA",
    "La Liga": "PD"
}

# =====================================================================
# GESTIONNAIRE DE RATE LIMIT (QUOTA)
# =====================================================================
def _make_request(url: str, params: dict = None, retries: int = 3) -> Optional[Dict]:
    """
    Fonction utilitaire pour faire des requêtes à l'API avec gestion du Rate Limit.
    Le plan gratuit de football-data.org autorise 10 requêtes / minute.
    """
    if not FOOTBALL_DATA_KEY:
        logger.error("FOOTBALL_DATA_KEY n'est pas configurée.")
        return None

    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, params=params, timeout=10)
            
            # Gestion du Rate Limit (HTTP 429)
            if response.status_code == 429:
                logger.warning(f"Rate limit atteint (429). Tentative {attempt + 1}/{retries}. Pause de 6 secondes...")
                time.sleep(6)
                continue
                
            response.raise_for_status()
            return response.json()
            
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
    Récupère les matchs du jour pour les compétitions majeures.
    """
    url = f"{BASE_URL}/matches"
    
    logger.info("Récupération des matchs du jour via football-data.org...")
    data = _make_request(url)
    
    if not data or "matches" not in data:
        return []
        
    # Filtrer pour ne garder que nos compétitions cibles
    target_codes = list(COMPETITIONS.values())
    filtered_matches = [m for m in data["matches"] if m.get("competition", {}).get("code") in target_codes]
    
    logger.info(f"{len(filtered_matches)} match(s) trouvé(s) dans les ligues majeures.")
    return filtered_matches

def get_standings(competition_code: str) -> Optional[List[Dict]]:
    """
    Récupère le classement complet d'une compétition.
    """
    url = f"{BASE_URL}/competitions/{competition_code}/standings"
    
    logger.info(f"Récupération du classement pour la compétition {competition_code}...")
    data = _make_request(url)
    
    if not data or "standings" not in data:
        return None
        
    try:
        # On cherche le classement général ("TOTAL")
        for standing in data["standings"]:
            if standing.get("type") == "TOTAL":
                return standing.get("table", [])
        return None
    except Exception as e:
        logger.error(f"Erreur lors du parsing du classement de {competition_code}: {e}")
        return None

def get_team_statistics(team_id: int, competition_code: str) -> Optional[Dict]:
    """
    Récupère les statistiques d'une équipe via le classement de sa compétition.
    Utile pour calculer les moyennes de buts (Proxy pour les xG).
    
    :param team_id: ID de l'équipe (ex: 86 pour Real Madrid)
    :param competition_code: Code de la compétition (ex: 'PD' pour La Liga)
    """
    url = f"{BASE_URL}/competitions/{competition_code}/standings"
    
    logger.info(f"Récupération des stats pour l'équipe {team_id} (Compétition {competition_code})...")
    data = _make_request(url)
    
    if not data or "standings" not in data:
        return None
        
    try:
        # On cherche le classement général ("TOTAL")
        for standing in data["standings"]:
            if standing.get("type") == "TOTAL":
                for table_row in standing.get("table", []):
                    if table_row.get("team", {}).get("id") == team_id:
                        games_played = table_row.get("playedGames", 1)
                        if games_played == 0: games_played = 1 # Sécurité
                        
                        goals_for = table_row.get("goalsFor", 0)
                        goals_against = table_row.get("goalsAgainst", 0)
                        
                        extracted_stats = {
                            "team_id": team_id,
                            "competition_code": competition_code,
                            "matches_played": games_played,
                            "goals_for_avg": round(goals_for / games_played, 2),
                            "goals_against_avg": round(goals_against / games_played, 2),
                            "form": table_row.get("form", ""), # Forme récente ex: "W,W,D,L,W"
                            "points": table_row.get("points", 0),
                            "position": table_row.get("position", 0)
                        }
                        return extracted_stats
                        
        logger.warning(f"Équipe {team_id} non trouvée dans le classement de {competition_code}.")
        return None
        
    except Exception as e:
        logger.error(f"Erreur lors du parsing des statistiques de l'équipe {team_id}: {e}")
        return None

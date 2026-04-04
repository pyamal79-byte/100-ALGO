import os
import time
import logging
import requests
from datetime import datetime
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# =====================================================================
# CONFIGURATION DE L'API (API-Basketball par API-Sports)
# =====================================================================
from app.config import config

# L'API Key est chargée depuis config.py
API_BASKET_KEY = config.API_BASKET_KEY
BASE_URL = "https://v1.basketball.api-sports.io"

HEADERS = {
    "x-apisports-key": API_BASKET_KEY,
    "x-rapidapi-host": "v1.basketball.api-sports.io"
}

# IDs des ligues cibles (selon la documentation API-Basketball)
LEAGUES_IDS = {
    "NBA": 12,
    "Euroleague": 116
}

# =====================================================================
# GESTIONNAIRE DE RATE LIMIT (QUOTA)
# =====================================================================
def _make_request(url: str, params: dict = None, retries: int = 3) -> Optional[Dict]:
    """
    Fonction utilitaire pour faire des requêtes à l'API avec gestion du Rate Limit.
    """
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=HEADERS, params=params, timeout=10)
            
            # Gestion du Rate Limit (HTTP 429)
            if response.status_code == 429:
                logger.warning(f"Rate limit atteint (429). Tentative {attempt + 1}/{retries}. Pause de 6 secondes...")
                time.sleep(6)
                continue
                
            response.raise_for_status()
            data = response.json()
            
            if data.get("errors") and len(data["errors"]) > 0:
                logger.error(f"Erreur API-Basketball : {data['errors']}")
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
def get_nba_euroleague_games() -> List[Dict]:
    """
    Récupère le calendrier exact des matchs du jour ou de la nuit à venir
    pour la NBA et l'Euroleague.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    # La saison NBA commence généralement en octobre
    current_month = datetime.now().month
    current_year = datetime.now().year
    season = f"{current_year}-{current_year+1}" if current_month >= 10 else f"{current_year-1}-{current_year}"
    
    all_games = []
    
    logger.info(f"Récupération des matchs de Basketball du {today} (Saison {season})...")
    
    for league_name, league_id in LEAGUES_IDS.items():
        url = f"{BASE_URL}/games"
        params = {
            "date": today,
            "league": league_id,
            "season": season
        }
        
        data = _make_request(url, params)
        if data and "response" in data:
            games = data["response"]
            logger.info(f"{league_name} : {len(games)} match(s) trouvé(s).")
            all_games.extend(games)
            
    return all_games

def get_basketball_stats(team_id: int, league_id: int, season: str) -> Optional[Dict]:
    """
    Récupère les statistiques réelles d'une équipe (Points par match, pourcentages, rebonds).
    Ces données alimenteront le calcul du Pace et de l'eFG% pour le modèle XGBoost.
    
    :param team_id: ID de l'équipe (ex: 145 pour les Lakers)
    :param league_id: ID de la ligue (ex: 12 pour NBA)
    :param season: Saison (ex: "2023-2024")
    """
    url = f"{BASE_URL}/statistics"
    params = {
        "team": team_id,
        "league": league_id,
        "season": season
    }
    
    logger.info(f"Récupération des stats Basket pour l'équipe {team_id}...")
    data = _make_request(url, params)
    
    if not data or "response" not in data:
        return None
        
    stats = data["response"]
    
    try:
        # Extraction des métriques clés
        games_played = stats.get("games", {}).get("played", {}).get("all", 1)
        if games_played == 0: games_played = 1 # Sécurité division par zéro
        
        points_for = stats.get("points", {}).get("for", {}).get("total", {}).get("all", 0)
        points_against = stats.get("points", {}).get("against", {}).get("total", {}).get("all", 0)
        
        extracted_stats = {
            "team_id": team_id,
            "league_id": league_id,
            "games_played": games_played,
            "ppg_for": round(points_for / games_played, 1),      # Points Per Game (Marqués)
            "ppg_against": round(points_against / games_played, 1), # Points Per Game (Encaissés)
            # L'API-Basketball fournit souvent un résumé des tirs et rebonds dans d'autres endpoints ou sections
            # On prépare la structure pour l'algorithme
            "form": stats.get("form", "")
        }
        return extracted_stats
        
    except Exception as e:
        logger.error(f"Erreur lors du parsing des statistiques Basket (Team {team_id}): {e}")
        return None

def get_injured_players(team_id: int, date: str = None) -> List[Dict]:
    """
    Récupère la liste des joueurs blessés ou incertains pour une équipe donnée.
    L'absence de joueurs majeurs (Star Players) impacte massivement les probabilités.
    
    :param team_id: ID de l'équipe
    :param date: Date du match (YYYY-MM-DD). Si None, utilise la date du jour.
    """
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
        
    url = f"{BASE_URL}/injuries"
    params = {
        "team": team_id,
        "date": date
    }
    
    logger.info(f"Vérification des blessures pour l'équipe {team_id} à la date du {date}...")
    data = _make_request(url, params)
    
    injured_players = []
    if data and "response" in data:
        for injury in data["response"]:
            player_info = {
                "player_name": injury.get("player", {}).get("name"),
                "reason": injury.get("player", {}).get("reason"),
                "type": injury.get("player", {}).get("type"), # ex: "Missing Fixture", "Questionable"
            }
            injured_players.append(player_info)
            
    logger.info(f"{len(injured_players)} joueur(s) listé(s) dans le rapport de blessures.")
    return injured_players

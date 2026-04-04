import os
import requests
import logging
from sqlalchemy.orm import Session
from app.models.models import Match, Team
from app.config import config

logger = logging.getLogger(__name__)

# La clé API est chargée depuis config.py
ODDS_API_KEY = config.THE_ODDS_API_KEY
BASE_URL = "https://api.the-odds-api.com/v4/sports"

def fetch_upcoming_odds(sport_key: str, regions: str = "eu", markets: str = "h2h"):
    """
    Récupère les cotes des matchs à venir depuis The-Odds-API.
    Exemples de sport_key : 'soccer_epl' (Premier League), 'basketball_nba' (NBA).
    """
    url = f"{BASE_URL}/{sport_key}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": regions,
        "markets": markets,
        "oddsFormat": "decimal"
    }
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Erreur lors de la récupération des cotes pour {sport_key}: {e}")
        return None

def update_match_odds_in_db(db: Session, sport_key: str):
    """
    Récupère les cotes et met à jour la base de données.
    """
    odds_data = fetch_upcoming_odds(sport_key)
    if not odds_data:
        logger.warning(f"Aucune donnée récupérée pour {sport_key}.")
        return False

    try:
        updated_count = 0
        for game in odds_data:
            home_team_name = game.get("home_team")
            away_team_name = game.get("away_team")
            bookmakers = game.get("bookmakers", [])
            
            if not bookmakers:
                continue
                
            # On prend le premier bookmaker disponible pour l'exemple (ou on pourrait faire une moyenne)
            markets = bookmakers[0].get("markets", [])
            if not markets or markets[0].get("key") != "h2h":
                continue
                
            outcomes = markets[0].get("outcomes", [])
            
            home_odds = None
            away_odds = None
            draw_odds = None
            
            for outcome in outcomes:
                if outcome["name"] == home_team_name:
                    home_odds = outcome["price"]
                elif outcome["name"] == away_team_name:
                    away_odds = outcome["price"]
                elif outcome["name"].lower() == "draw":
                    draw_odds = outcome["price"]

            # Recherche du match dans la BDD (simplifié : on cherche par nom d'équipe)
            # Dans la vraie vie, il faudra un système de mapping des noms d'équipes
            match = db.query(Match).join(Team, Match.home_team_id == Team.id)\
                .filter(Team.name == home_team_name).first()
                
            if match:
                match.home_odds = home_odds
                match.away_odds = away_odds
                match.draw_odds = draw_odds
                updated_count += 1
                
        db.commit()
        logger.info(f"Mise à jour réussie : {updated_count} matchs mis à jour pour {sport_key}.")
        return True
        
    except Exception as e:
        logger.error(f"Erreur base de données lors de la mise à jour des cotes : {e}")
        db.rollback()
        return False

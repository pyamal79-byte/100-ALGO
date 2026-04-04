from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from app.services.football_data_service import COMPETITIONS, get_standings, get_team_statistics
from app.services.ai_analyzer import generate_expert_analysis

app = FastAPI(
    title="100%ALGO API",
    description="API Backend pour le moteur de prédictions de paris sportifs",
    version="1.0.0"
)

# Configuration CORS pour autoriser le frontend React à communiquer avec l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier l'URL exacte du frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/competitions")
def get_competitions():
    """
    Renvoie la liste des compétitions supportées.
    """
    return [{"name": name, "code": code} for name, code in COMPETITIONS.items()]

@app.get("/api/standings/{competition_code}")
def get_competition_standings(competition_code: str):
    """
    Renvoie le classement d'une compétition spécifique.
    """
    standings = get_standings(competition_code)
    if standings is None:
        raise HTTPException(status_code=404, detail="Classement non trouvé ou erreur API")
    return standings

@app.get("/api/team/{competition_code}/{team_id}/analysis")
def get_team_analysis(competition_code: str, team_id: int):
    """
    Génère une analyse IA pour une équipe spécifique basée sur ses statistiques.
    """
    stats = get_team_statistics(team_id, competition_code)
    if not stats:
        raise HTTPException(status_code=404, detail="Statistiques de l'équipe non trouvées")
    
    # Simuler des probabilités pour l'analyse (dans un cas réel, cela viendrait du modèle XGBoost)
    algo_probabilities = {"probability": 65.0}
    value_bet_margin = 5.5
    
    match_data = {
        "home_team": f"Équipe {team_id}",
        "away_team": "Adversaire Moyen",
        "bookmaker_odds": 1.85,
        "prediction": "Victoire ou Nul",
        "stats": stats
    }
    
    analysis = generate_expert_analysis(match_data, algo_probabilities, value_bet_margin)
    
    return {
        "team_id": team_id,
        "stats": stats,
        "analysis": analysis
    }

@app.get("/api/alerts")
def get_alerts():
    """
    Renvoie la liste des "Value Bets" du jour générés par l'algorithme.
    Ces données sont générées par le croisement du modèle XGBoost et du Value Scanner.
    """
    # Données fictives pour l'exemple (à remplacer par une requête SQLAlchemy)
    now = datetime.now()
    return [
        {
            "id": 1,
            "match_date": (now + timedelta(hours=2)).isoformat(),
            "home_team": "Real Madrid",
            "away_team": "Barcelona",
            "sport": "football",
            "prediction": "Victoire Domicile",
            "probability": 55.0,
            "bookmaker_odds": 2.10,
            "value_percentage": 15.5,
            "recommended_stake": 25.50
        },
        {
            "id": 2,
            "match_date": (now + timedelta(hours=5)).isoformat(),
            "home_team": "Lakers",
            "away_team": "Warriors",
            "sport": "basketball",
            "prediction": "Victoire Extérieur",
            "probability": 48.0,
            "bookmaker_odds": 2.35,
            "value_percentage": 12.8,
            "recommended_stake": 18.20
        },
        {
            "id": 3,
            "match_date": (now + timedelta(hours=24)).isoformat(),
            "home_team": "Arsenal",
            "away_team": "Chelsea",
            "sport": "football",
            "prediction": "Match Nul",
            "probability": 30.0,
            "bookmaker_odds": 3.60,
            "value_percentage": 8.0,
            "recommended_stake": 10.00
        }
    ]

@app.get("/api/stats")
def get_stats():
    """
    Renvoie les statistiques globales de l'algorithme (KPIs).
    """
    return {
        "current_bankroll": 10540.20,
        "starting_bankroll": 10000.00,
        "roi_percentage": 12.4,
        "hit_rate": 56.8,
        "total_bets": 142,
        "history": [10000, 10100, 9950, 10200, 10350, 10540.20]
    }

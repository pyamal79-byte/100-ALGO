import os
from dotenv import load_dotenv

# Charge les variables d'environnement depuis le fichier .env
load_dotenv()

class Config:
    API_FOOTBALL_KEY = os.getenv("API_FOOTBALL_KEY")
    API_BASKET_KEY = os.getenv("API_BASKET_KEY")
    THE_ODDS_API_KEY = os.getenv("THE_ODDS_API_KEY")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    FOOTBALL_DATA_KEY = os.getenv("FOOTBALL_DATA_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/dbname")

config = Config()

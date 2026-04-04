from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()

class SportType(enum.Enum):
    FOOTBALL = "football"
    BASKETBALL = "basketball"

class MatchStatus(enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"
    POSTPONED = "postponed"

class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    sport_type = Column(Enum(SportType), nullable=False)
    elo_rating = Column(Float, default=1500.0)

    # Relationships
    home_matches = relationship("Match", foreign_keys="[Match.home_team_id]", back_populates="home_team")
    away_matches = relationship("Match", foreign_keys="[Match.away_team_id]", back_populates="away_team")

class Match(Base):
    __tablename__ = "matches"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False, index=True)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    sport_type = Column(Enum(SportType), nullable=False)
    status = Column(Enum(MatchStatus), default=MatchStatus.SCHEDULED)
    home_score = Column(Integer, nullable=True)
    away_score = Column(Integer, nullable=True)
    home_odds = Column(Float, nullable=True)
    draw_odds = Column(Float, nullable=True)
    away_odds = Column(Float, nullable=True)

    # Relationships
    home_team = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    football_stats = relationship("FootballStat", back_populates="match", uselist=False)
    basketball_stats = relationship("BasketballStat", back_populates="match", uselist=False)
    prediction = relationship("Prediction", back_populates="match", uselist=False)

class FootballStat(Base):
    __tablename__ = "football_stats"

    match_id = Column(Integer, ForeignKey("matches.id"), primary_key=True)
    xG_home = Column(Float, nullable=True)
    xG_away = Column(Float, nullable=True)
    ppda_home = Column(Float, nullable=True)
    ppda_away = Column(Float, nullable=True)

    # Relationships
    match = relationship("Match", back_populates="football_stats")

class BasketballStat(Base):
    __tablename__ = "basketball_stats"

    match_id = Column(Integer, ForeignKey("matches.id"), primary_key=True)
    pace = Column(Float, nullable=True)
    eFG_home = Column(Float, nullable=True)
    eFG_away = Column(Float, nullable=True)
    tov_home = Column(Float, nullable=True)
    tov_away = Column(Float, nullable=True)

    # Relationships
    match = relationship("Match", back_populates="basketball_stats")

class Prediction(Base):
    __tablename__ = "predictions"

    match_id = Column(Integer, ForeignKey("matches.id"), primary_key=True)
    proba_home = Column(Float, nullable=False)
    proba_draw = Column(Float, nullable=True) # Nullable car pas de match nul au basket
    proba_away = Column(Float, nullable=False)
    predicted_value_bet = Column(String, nullable=True)
    kelly_stake = Column(Float, nullable=True)

    # Relationships
    match = relationship("Match", back_populates="prediction")

import logging
from typing import Tuple

logger = logging.getLogger(__name__)

def detect_value_bet(true_probability: float, bookmaker_odds: float) -> Tuple[bool, float]:
    """
    Calcule l'Espérance Mathématique (EV) et détecte si un pari est un Value Bet.
    
    :param true_probability: Probabilité réelle estimée par notre algorithme (ex: 0.55 pour 55%).
    :param bookmaker_odds: Cote décimale proposée par le bookmaker (ex: 2.10).
    :return: Un tuple (is_value_bet, ev_percentage).
             is_value_bet est True UNIQUEMENT si l'avantage est > 5%.
    """
    if true_probability <= 0 or bookmaker_odds <= 1.0:
        return False, 0.0

    # Calcul de l'avantage (Edge) / Expected Value (EV)
    # Formule : (Probabilité * Cote) - 1
    # Exemple : (0.55 * 2.10) - 1 = 1.155 - 1 = 0.155 (soit +15.5% d'EV)
    ev = (true_probability * bookmaker_odds) - 1.0
    ev_percentage = ev * 100.0

    # L'alerte est validée uniquement si l'avantage est strictement supérieur à 5% (Marge de sécurité)
    is_value = ev_percentage > 5.0

    if is_value:
        logger.info(f"Value Bet détecté ! EV: +{ev_percentage:.2f}% (Proba: {true_probability:.2f}, Cote: {bookmaker_odds})")

    return is_value, round(ev_percentage, 2)


def calculate_kelly_stake(true_probability: float, bookmaker_odds: float, bankroll: float, kelly_fraction: float = 0.25) -> float:
    """
    Implémente le Critère de Kelly pour calculer le montant exact à miser en Euros.
    Intègre un Kelly fractionné et un plafond de sécurité stricts.
    
    :param true_probability: Probabilité réelle estimée (ex: 0.55).
    :param bookmaker_odds: Cote décimale du bookmaker (ex: 2.10).
    :param bankroll: Capital total disponible en Euros.
    :param kelly_fraction: Fraction de Kelly à appliquer (défaut: 0.25 pour un quart de Kelly).
    :return: Montant exact à miser en Euros (arrondi à 2 décimales).
    """
    if true_probability <= 0 or bookmaker_odds <= 1.0 or bankroll <= 0:
        return 0.0

    # b = cotes nettes (bénéfice pur pour 1€ misé)
    b = bookmaker_odds - 1.0
    p = true_probability
    q = 1.0 - p

    # Formule de Kelly : f* = (bp - q) / b
    # Représente le pourcentage optimal de la bankroll à miser
    kelly_percentage = (b * p - q) / b

    # Si le pourcentage est négatif ou nul, l'espérance est négative : on ne parie pas.
    if kelly_percentage <= 0:
        return 0.0

    # Application du Kelly fractionné (ex: 1/4 de Kelly) pour minimiser la variance et le risque de ruine
    adjusted_kelly_percentage = kelly_percentage * kelly_fraction

    # Plafond de sécurité absolu : 3% maximum de la bankroll sur un seul pari
    max_stake_percentage = 0.03
    final_percentage = min(adjusted_kelly_percentage, max_stake_percentage)

    # Calcul du montant final en Euros
    stake = final_percentage * bankroll

    logger.info(f"Mise calculée: {stake:.2f}€ (Kelly brut: {kelly_percentage*100:.2f}%, "
                f"Ajusté: {adjusted_kelly_percentage*100:.2f}%, Plafonné: {final_percentage*100:.2f}%)")

    return round(stake, 2)

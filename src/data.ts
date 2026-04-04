import { Match } from './types';

export const mockMatches: Match[] = [
  {
    id: '1',
    sport: 'FOOTBALL',
    league: 'Champions League',
    time: '21:00',
    homeTeam: { 
      name: 'Real Madrid', shortName: 'RMA', color: 'bg-white text-gray-900', 
      form: ['W', 'W', 'D', 'W', 'W'], injuries: ['Courtois (Genou)', 'Alaba (Croisés)'] 
    },
    awayTeam: { 
      name: 'Manchester City', shortName: 'MCI', color: 'bg-sky-400 text-sky-950', 
      form: ['W', 'W', 'W', 'D', 'W'], injuries: ['Walker (Cuisse)'] 
    },
    prediction: 'Victoire Domicile',
    algoProbability: 42.5,
    bookmakerOdds: 2.80,
    valuePercentage: 19.0,
    stats: { 
      homeXg: 2.1, awayXg: 1.8, 
      keyFactor: 'Avantage historique à domicile et xG créés en hausse (+15% sur les 3 derniers matchs).' 
    }
  },
  {
    id: '2',
    sport: 'FOOTBALL',
    league: 'Premier League',
    time: '17:30',
    homeTeam: { 
      name: 'Arsenal', shortName: 'ARS', color: 'bg-red-600 text-white', 
      form: ['W', 'L', 'W', 'W', 'D'], injuries: ['Saka (Incertain)'] 
    },
    awayTeam: { 
      name: 'Chelsea', shortName: 'CHE', color: 'bg-blue-700 text-white', 
      form: ['D', 'D', 'W', 'L', 'W'], injuries: ['James (Ischio)', 'Lavia (Cheville)'] 
    },
    prediction: 'Match Nul',
    algoProbability: 31.0,
    bookmakerOdds: 3.50,
    valuePercentage: 8.5,
    stats: { 
      homeXg: 1.9, awayXg: 1.5, 
      keyFactor: 'Forte probabilité de match fermé. Le PPDA de Chelsea est excellent à l\'extérieur.' 
    }
  },
  {
    id: '3',
    sport: 'FOOTBALL',
    league: 'Ligue 1',
    time: '20:45',
    homeTeam: { 
      name: 'PSG', shortName: 'PSG', color: 'bg-blue-900 text-white', 
      form: ['W', 'W', 'W', 'W', 'W'], injuries: ['Kimpembe (Achille)'] 
    },
    awayTeam: { 
      name: 'Marseille', shortName: 'OM', color: 'bg-sky-200 text-sky-900', 
      form: ['W', 'L', 'W', 'D', 'L'], injuries: ['Rongier (Genou)'] 
    },
    prediction: 'Victoire Extérieur',
    algoProbability: 18.0,
    bookmakerOdds: 5.20,
    valuePercentage: -6.4,
    stats: { 
      homeXg: 2.8, awayXg: 1.1, 
      keyFactor: 'Cote bookmaker trop basse pour l\'OM. EV négative, pari à éviter absolument.' 
    }
  },
  {
    id: '4',
    sport: 'BASKETBALL',
    league: 'NBA',
    time: '04:30',
    homeTeam: { 
      name: 'Lakers', shortName: 'LAL', color: 'bg-yellow-400 text-purple-900', 
      form: ['W', 'L', 'L', 'W', 'W'], injuries: ['Vanderbilt (Pied)'] 
    },
    awayTeam: { 
      name: 'Warriors', shortName: 'GSW', color: 'bg-blue-600 text-yellow-400', 
      form: ['W', 'W', 'L', 'W', 'D'], injuries: ['Paul (Main)'] 
    },
    prediction: 'Victoire Extérieur',
    algoProbability: 52.0,
    bookmakerOdds: 2.15,
    valuePercentage: 11.8,
    stats: { 
      homePace: 101.5, awayPace: 99.2, 
      keyFactor: 'Efficacité offensive (eFG%) des Warriors supérieure de 4% sur les 5 derniers matchs à l\'extérieur.' 
    }
  },
  {
    id: '5',
    sport: 'BASKETBALL',
    league: 'Euroleague',
    time: '20:00',
    homeTeam: { 
      name: 'Panathinaikos', shortName: 'PAO', color: 'bg-green-700 text-white', 
      form: ['W', 'W', 'W', 'L', 'W'], injuries: [] 
    },
    awayTeam: { 
      name: 'Olympiacos', shortName: 'OLY', color: 'bg-red-600 text-white', 
      form: ['W', 'L', 'W', 'W', 'L'], injuries: ['Milutinov (Cheville)'] 
    },
    prediction: 'Victoire Domicile',
    algoProbability: 68.0,
    bookmakerOdds: 1.65,
    valuePercentage: 12.2,
    stats: { 
      homePace: 82.1, awayPace: 79.5, 
      keyFactor: 'Avantage terrain massif (OAKA) et absence du pivot titulaire adverse.' 
    }
  }
];

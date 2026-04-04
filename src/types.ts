export type Sport = 'FOOTBALL' | 'BASKETBALL';

export interface Team {
  name: string;
  shortName: string;
  color: string;
  form: ('W' | 'D' | 'L')[];
  injuries: string[];
}

export interface Match {
  id: string;
  sport: Sport;
  league: string;
  time: string;
  homeTeam: Team;
  awayTeam: Team;
  prediction: string;
  algoProbability: number;
  bookmakerOdds: number;
  valuePercentage: number;
  stats: {
    homeXg?: number;
    awayXg?: number;
    homePace?: number;
    awayPace?: number;
    keyFactor: string;
  };
}

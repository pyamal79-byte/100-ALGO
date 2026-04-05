import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { GoogleGenAI } from '@google/genai';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');
if (fs.existsSync(backendEnvPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(backendEnvPath));
  for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express.json());

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const FOOTBALL_BASE_URL = 'https://api.football-data.org/v4';

// Helper: fetch from football-data.org
async function footballFetch(endpoint: string): Promise<any> {
  const url = `${FOOTBALL_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY || '' }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Football API error ${res.status}: ${errText}`);
  }
  return res.json();
}

// --- API ROUTES ---

// GET /api/standings/:code - Classement d'une competition
app.get('/api/standings/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const data = await footballFetch(`/competitions/${code}/standings`);
    const standings = data.standings?.[0]?.table || [];
    res.json(standings);
  } catch (err: any) {
    console.error('Standings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/matches/:code - Matchs a venir d'une competition
app.get('/api/matches/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const data = await footballFetch(`/competitions/${code}/matches?dateFrom=${today}&dateTo=${future}&status=SCHEDULED`);
    res.json(data.matches || []);
  } catch (err: any) {
    console.error('Matches error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/match/:code/:matchId/analysis - Analyse IA d'un match
app.get('/api/match/:code/:matchId/analysis', async (req, res) => {
  try {
    const { code, matchId } = req.params;
    const matchData = await footballFetch(`/matches/${matchId}`);
    const homeTeam = matchData.homeTeam?.name || 'Equipe Domicile';
    const awayTeam = matchData.awayTeam?.name || 'Equipe Exterieur';
    const competition = matchData.competition?.name || code;

    let analysis = `Analyse du match ${homeTeam} vs ${awayTeam} en ${competition}.`;

    if (GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const prompt = `Tu es un expert en analyse football et paris sportifs. Analyse ce match: ${homeTeam} vs ${awayTeam} dans la competition ${competition}. Donne une analyse experte en francais incluant: forme recente des equipes, forces et faiblesses, prediction et conseil de pari. Sois precis et concis (300 mots max).`;
        const result = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
        analysis = result.text || analysis;
      } catch (aiErr: any) {
        console.error('Gemini error:', aiErr.message);
      }
    }

    res.json({ matchId, homeTeam, awayTeam, competition, analysis });
  } catch (err: any) {
    console.error('Match analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team/:code/:teamId/analysis - Analyse IA d'une equipe
app.get('/api/team/:code/:teamId/analysis', async (req, res) => {
  try {
    const { code, teamId } = req.params;

    // Recuperer les stats de l'equipe dans le classement
    const standingsData = await footballFetch(`/competitions/${code}/standings`);
    const table = standingsData.standings?.[0]?.table || [];
    const teamRow = table.find((row: any) => row.team?.id === parseInt(teamId));

    const stats = teamRow ? {
      matches_played: teamRow.playedGames,
      won: teamRow.won,
      draw: teamRow.draw,
      lost: teamRow.lost,
      goals_for: teamRow.goalsFor,
      goals_against: teamRow.goalsAgainst,
      goal_difference: teamRow.goalDifference,
      points: teamRow.points,
      position: teamRow.position,
      form: teamRow.form,
      goals_for_avg: teamRow.playedGames > 0 ? (teamRow.goalsFor / teamRow.playedGames).toFixed(2) : '0',
      goals_against_avg: teamRow.playedGames > 0 ? (teamRow.goalsAgainst / teamRow.playedGames).toFixed(2) : '0'
    } : null;

    const teamName = teamRow?.team?.name || `Equipe ${teamId}`;
    let analysis = `Analyse de ${teamName}: Position ${stats?.position || 'N/A'}, ${stats?.points || 0} points en ${stats?.matches_played || 0} matchs.`;

    if (GEMINI_API_KEY && stats) {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const prompt = `Tu es un expert en football et paris sportifs. Analyse l'equipe ${teamName} dans la competition ${code}. Statistiques: Position ${stats.position}, ${stats.points} pts, ${stats.matches_played} matchs joues, ${stats.won}V ${stats.draw}N ${stats.lost}D, ${stats.goals_for} buts marques, ${stats.goals_against} buts encaisses, forme: ${stats.form}. Donne une analyse experte en francais: forces, faiblesses, tendance, et recommandation paris sportifs (300 mots max).`;
        const result = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
        analysis = result.text || analysis;
      } catch (aiErr: any) {
        console.error('Gemini error:', aiErr.message);
      }
    }

    res.json({ team_id: parseInt(teamId), stats, analysis });
  } catch (err: any) {
    console.error('Team analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/competitions - Liste des competitions
app.get('/api/competitions', (req, res) => {
  res.json([
    { name: 'Champions League', code: 'CL' },
    { name: 'Premier League', code: 'PL' },
    { name: 'Ligue 1', code: 'FL1' },
    { name: 'Bundesliga', code: 'BL1' },
    { name: 'Serie A', code: 'SA' },
    { name: 'La Liga', code: 'PD' },
    { name: 'Europa League', code: 'EL' }
  ]);
});

// GET /api/alerts - Value bets du jour
app.get('/api/alerts', (req, res) => {
  const now = new Date();
  res.json([
    {
      id: 1,
      match_date: new Date(now.getTime() + 2 * 3600000).toISOString(),
      home_team: 'Real Madrid', away_team: 'Barcelona',
      sport: 'football', prediction: 'Victoire Domicile',
      probability: 55.0, bookmaker_odds: 2.10,
      value_percentage: 15.5, recommended_stake: 25.50
    },
    {
      id: 2,
      match_date: new Date(now.getTime() + 5 * 3600000).toISOString(),
      home_team: 'Lakers', away_team: 'Warriors',
      sport: 'basketball', prediction: 'Victoire Exterieur',
      probability: 48.0, bookmaker_odds: 2.35,
      value_percentage: 12.8, recommended_stake: 18.20
    }
  ]);
});

// GET /api/stats - Statistiques globales
app.get('/api/stats', (req, res) => {
  res.json({
    current_bankroll: 10540.20,
    starting_bankroll: 10000.00,
    roi_percentage: 12.4,
    hit_rate: 56.8,
    total_bets: 142,
    history: [10000, 10100, 9950, 10200, 10350, 10540.20]
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    football_api: FOOTBALL_DATA_KEY ? 'configured' : 'missing',
    gemini_api: GEMINI_API_KEY ? 'configured' : 'missing'
  });
});

// Serve static files from dist
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Football API: ${FOOTBALL_DATA_KEY ? 'OK' : 'MISSING'}`);
  console.log(`Gemini API: ${GEMINI_API_KEY ? 'OK' : 'MISSING'}`);
});

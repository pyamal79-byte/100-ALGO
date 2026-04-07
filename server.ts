import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import Groq from 'groq-sdk';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');F
if (fs.existsSync(backendEnvPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(backendEnvPath));
  for (const k in envConfig) { process.env[k] = envConfig[k]; }
}

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.use(express.json());

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const groqClient = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

const FOOTBALL_BASE_URL = 'https://api.football-data.org/v4';

async function footballFetch(endpoint: string): Promise<any> {
  const url = `${FOOTBALL_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY || '' }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Football API Error ${res.status}: ${errText}`);
  }
  return res.json();
}

// GET /api/standings/:code
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

// GET /api/matches/:code
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

// GET /api/match/:code/:matchId/analysis
app.get('/api/match/:code/:matchId/analysis', async (req, res) => {
  try {
    const { code, matchId } = req.params;
    
    // 1. Récupère les données du match
    const matchData = await footballFetch(`/matches/${matchId}`);
    const homeTeam = matchData.homeTeam?.name || 'Home Team';
    const awayTeam = matchData.awayTeam?.name || 'Away Team';
    const homeTeamId = matchData.homeTeam?.id;
    const awayTeamId = matchData.awayTeam?.id;
    const competition = matchData.competition?.name || code;
    
    let analysis = `Analyse du match ${homeTeam} vs ${awayTeam} en ${competition}.`;
    
    if (groqClient) {
      try {
        // 2. Récupère le classement pour avoir les stats des équipes
        const standingsData = await footballFetch(`/competitions/${code}/standings`);
        const table = standingsData.standings?.[0]?.table || [];
        
        const homeStats = table.find((row: any) => row.team?.id === homeTeamId);
        const awayStats = table.find((row: any) => row.team?.id === awayTeamId);
        
        // 3. Récupère l'historique H2H (confrontations directes)
        let h2hData = null;
        try {
          h2hData = await footballFetch(`/matches/${matchId}/head2head?limit=5`);
        } catch (e) {
          console.log('H2H non disponible');
        }
        
        // 4. Construit un prompt enrichi avec TOUTES les données
        const prompt = `Tu es un analyste sportif professionnel expert en football et paris sportifs.

MATCH À ANALYSER : ${homeTeam} vs ${awayTeam}
COMPÉTITION : ${competition}

DONNÉES ÉQUIPE DOMICILE - ${homeTeam} :
${homeStats ? `
- Position au classement : ${homeStats.position}/${table.length}
- Points : ${homeStats.points} pts (${homeStats.won}V ${homeStats.draw}N ${homeStats.lost}D)
- Matchs joués : ${homeStats.playedGames}
- Buts marqués : ${homeStats.goalsFor} (moyenne ${(homeStats.goalsFor/homeStats.playedGames).toFixed(2)}/match)
- Buts encaissés : ${homeStats.goalsAgainst} (moyenne ${(homeStats.goalsAgainst/homeStats.playedGames).toFixed(2)}/match)
- Différence de buts : ${homeStats.goalDifference}
- Forme récente (5 derniers matchs) : ${homeStats.form || 'Non disponible'}
` : 'Statistiques non disponibles'}

DONNÉES ÉQUIPE EXTÉRIEUR - ${awayTeam} :
${awayStats ? `
- Position au classement : ${awayStats.position}/${table.length}
- Points : ${awayStats.points} pts (${awayStats.won}V ${awayStats.draw}N ${awayStats.lost}D)
- Matchs joués : ${awayStats.playedGames}
- Buts marqués : ${awayStats.goalsFor} (moyenne ${(awayStats.goalsFor/awayStats.playedGames).toFixed(2)}/match)
- Buts encaissés : ${awayStats.goalsAgainst} (moyenne ${(awayStats.goalsAgainst/awayStats.playedGames).toFixed(2)}/match)
- Différence de buts : ${awayStats.goalDifference}
- Forme récente (5 derniers matchs) : ${awayStats.form || 'Non disponible'}
` : 'Statistiques non disponibles'}

${h2hData && h2hData.matches?.length > 0 ? `
CONFRONTATIONS DIRECTES (H2H - 5 derniers matchs) :
${h2hData.matches.slice(0, 5).map((m: any, i: number) => 
  `${i+1}. ${new Date(m.utcDate).toLocaleDateString('fr-FR')} : ${m.homeTeam.name} ${m.score.fullTime.home || '?'}-${m.score.fullTime.away || '?'} ${m.awayTeam.name}`
).join('\n')}
` : ''}

MÉTHODOLOGIE D'ANALYSE REQUISE :
1. Analyse comparative des forces et faiblesses des deux équipes
2. Impact de la forme récente et du classement
3. Analyse statistique (buts marqués/encaissés, différence de buts)
4. Avantage domicile/extérieur
5. Historique des confrontations directes (si disponible)

PRÉDICTION DEMANDÉE :
- Pronostic principal (Victoire ${homeTeam} / Match Nul / Victoire ${awayTeam})
- Probabilité estimée (en %)
- Conseil de pari avec niveau de confiance (Faible/Moyen/Élevé)
- Autres paris potentiels (ex: Plus/Moins 2.5 buts, BTTS)

Réponds en français de manière structurée, professionnelle et argumentée (400 mots max).`;

        const completion = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.7
        });
        
        analysis = completion.choices[0]?.message?.content || analysis;
      } catch (aiErr: any) {
        console.error('Groq error:', aiErr.message);
      }
    }
    
    res.json({
      matchId,
      homeTeam,
      awayTeam,
      competition,
      analysis
    });
  } catch (err: any) {
    console.error('Match analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
   

// GET /api/team/:code/:teamId/analysis
app.get('/api/team/:code/:teamId/analysis', async (req, res) => {
  try {
    const { code, teamId } = req.params;
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
    let analysis = `Analyse de ${teamName}: Position ${stats?.position || 'N/A'}, ${stats?.points || 0} points.`;

    if (groqClient && stats) {
      try {
        const prompt = `Tu es un expert en football et paris sportifs. Analysez l'equipe ${teamName} dans la competition ${code}. Statistiques: Position ${stats.position}, ${stats.points} pts, ${stats.matches_played} matchs joues, ${stats.won}V ${stats.draw}N ${stats.lost}D, ${stats.goals_for} buts marques, ${stats.goals_against} buts encaisses, forme: ${stats.form}. Donne une analyse experte en francais: forces, faiblesses, tendance, et recommandation paris sportifs (300 mots max).`;
        const completion = await groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
          temperature: 0.7
        });
        analysis = completion.choices[0]?.message?.content || analysis;
      } catch (aiErr: any) {
        console.error('Groq error:', aiErr.message);
      }
    }

    res.json({ team_id: parseInt(teamId), stats, analysis });
  } catch (err: any) {
    console.error('Team analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/competitions
app.get('/api/competitions', (req, res) => {
  res.json([
    { name: 'Ligue des Champions', code: 'CL' },
    { name: 'Premier League', code: 'PL' },
    { name: 'Ligue 1', code: 'FL1' },
    { name: 'Bundesliga', code: 'BL1' },
    { name: 'Serie A', code: 'SA' },
    { name: 'La Liga', code: 'PD' },
    { name: 'Ligue Europa', code: 'EL' },
    { name: 'Europa Conference League', code: 'ECL' },
    { name: 'Eredivisie', code: 'DED' },
    { name: 'Primeira Liga', code: 'PPL' },
    { name: 'Championship', code: 'ELC' },
    { name: 'Ligue des Champions (AFC)', code: 'CLI' }
  ]);
});

// GET /api/alerts
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

// GET /api/stats
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
    groq_api: GROQ_API_KEY ? 'configured' : 'missing'
  });
});

// Serve static files
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
  console.log(`Groq API: ${GROQ_API_KEY ? 'OK' : 'MISSING'}`);
});

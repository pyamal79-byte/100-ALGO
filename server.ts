import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { GoogleGenAI } from '@google/genai';

// Fix for Node.js 18+ fetch failing with IPv6
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
dotenv.config();
const backendEnvPath = path.resolve(process.cwd(), 'backend/.env');
if (fs.existsSync(backendEnvPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(backendEnvPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const app = express();
const PORT = 3000;

app.use(express.json());

const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const COMPETITIONS = {
  "Champions League": "CL",
  "Europa League": "EL",
  "Europa Conference League": "ECL",
  "Premier League": "PL",
  "Ligue 1": "FL1",
  "Bundesliga": "BL1",
  "Serie A": "SA",
  "La Liga": "PD",
  "Primeira Liga (Portugal)": "PPL",
  "Eredivisie (Pays-Bas)": "DED",
  "Championship (Angleterre)": "ELC",
  "Série A (Brésil)": "BSA",
  "Copa Libertadores": "CLI",
  "Euro": "EC",
  "Coupe du Monde": "WC"
};

app.get('/api/competitions', (req, res) => {
  res.json(Object.entries(COMPETITIONS).map(([name, code]) => ({ name, code })));
});

app.get('/api/standings/:code', async (req, res) => {
  try {
    if (!FOOTBALL_DATA_KEY) {
      return res.status(500).json({ error: "La clé API FOOTBALL_DATA_KEY est manquante." });
    }
    const response = await fetch(`https://api.football-data.org/v4/competitions/${req.params.code}/standings`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
    });
    
    if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit atteint sur l'API Football-Data (10 requêtes / minute). Veuillez patienter un instant." });
    }
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur API (${response.status}): ${errText}`);
    }
    
    const data = await response.json();
    const totalStanding = data.standings?.find((s: any) => s.type === 'TOTAL');
    res.json(totalStanding?.table || []);
  } catch (error: any) {
    console.error("Standings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to call Gemini with retry
async function generateContentWithRetry(ai: any, params: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('503') || error?.message?.includes('high demand');
      if (isRateLimit && attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`Gemini API rate limited/high demand (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

app.get('/api/team/:code/:team_id/analysis', async (req, res) => {
  try {
    const { code, team_id } = req.params;
    
    if (!FOOTBALL_DATA_KEY) {
      return res.status(500).json({ error: "La clé API FOOTBALL_DATA_KEY est manquante." });
    }

    const response = await fetch(`https://api.football-data.org/v4/competitions/${code}/standings`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
    });
    
    if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit atteint sur l'API Football-Data (10 requêtes / minute). Veuillez patienter." });
    }
    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
    
    const data = await response.json();
    const totalStanding = data.standings?.find((s: any) => s.type === 'TOTAL');
    const teamRow = totalStanding?.table?.find((r: any) => r.team.id.toString() === team_id);
    
    if (!teamRow) {
      return res.status(404).json({ error: "Équipe non trouvée dans le classement" });
    }

    const gamesPlayed = Math.max(teamRow.playedGames, 1);
    const stats = {
      team_id: parseInt(team_id),
      competition_code: code,
      matches_played: gamesPlayed,
      goals_for_avg: (teamRow.goalsFor / gamesPlayed).toFixed(2),
      goals_against_avg: (teamRow.goalsAgainst / gamesPlayed).toFixed(2),
      form: teamRow.form || "",
      points: teamRow.points,
      position: teamRow.position
    };

    let analysisText = "Analyse IA non disponible (Clé API Gemini manquante).";
    if (GEMINI_API_KEY) {
      const prompt = `
        Agis comme un expert en paris sportifs. Analyse ces statistiques pour l'équipe ${teamRow.team.name} :
        - Position: ${stats.position}
        - Matchs joués: ${stats.matches_played}
        - Buts marqués par match: ${stats.goals_for_avg}
        - Buts encaissés par match: ${stats.goals_against_avg}
        - Forme récente: ${stats.form}
        
        Rédige un court paragraphe (3 phrases maximum) expliquant la dynamique actuelle de l'équipe et si elle représente une bonne opportunité de pari en général. Sois professionnel et concis.
      `;

      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        
        if (aiResponse.text) {
          analysisText = aiResponse.text;
        } else {
          analysisText = "Erreur lors de la génération de l'analyse IA.";
        }
      } catch (aiError: any) {
        console.error("Gemini API Error:", aiError);
        const errorMsg = aiError.message || JSON.stringify(aiError);
        if (errorMsg.includes('503') || errorMsg.includes('high demand')) {
          analysisText = "Le service IA de Google est temporairement surchargé en raison d'une forte demande. Veuillez réessayer dans quelques instants.";
        } else {
          analysisText = `Erreur lors de la communication avec l'API Gemini: ${errorMsg}`;
        }
      }
    }

    res.json({
      team_id: parseInt(team_id),
      stats: stats,
      analysis: analysisText
    });

  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/matches/:code', async (req, res) => {
  try {
    if (!FOOTBALL_DATA_KEY) {
      return res.status(500).json({ error: "La clé API FOOTBALL_DATA_KEY est manquante." });
    }
    // Get scheduled matches
    const response = await fetch(`https://api.football-data.org/v4/competitions/${req.params.code}/matches?status=SCHEDULED`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
    });
    
    if (response.status === 429) {
        return res.status(429).json({ error: "Rate limit atteint sur l'API Football-Data. Veuillez patienter." });
    }
    if (!response.ok) throw new Error(`Erreur API: ${response.status}`);
    
    const data = await response.json();
    res.json(data.matches || []);
  } catch (error: any) {
    console.error("Matches error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/match/:code/:match_id/analysis', async (req, res) => {
  try {
    const { code, match_id } = req.params;
    
    if (!FOOTBALL_DATA_KEY) {
      return res.status(500).json({ error: "La clé API FOOTBALL_DATA_KEY est manquante." });
    }

    // 1. Fetch match details
    const matchRes = await fetch(`https://api.football-data.org/v4/matches/${match_id}`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
    });
    if (!matchRes.ok) throw new Error(`Erreur API Match: ${matchRes.status}`);
    const matchData = await matchRes.json();

    // 2. Fetch standings to get team stats
    const standingsRes = await fetch(`https://api.football-data.org/v4/competitions/${code}/standings`, {
      headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY }
    });
    let standingsData: any = { standings: [] };
    if (standingsRes.ok) {
      standingsData = await standingsRes.json();
    }

    const totalStanding = standingsData.standings?.find((s: any) => s.type === 'TOTAL');
    const homeTeamRow = totalStanding?.table?.find((r: any) => r.team.id === matchData.homeTeam.id);
    const awayTeamRow = totalStanding?.table?.find((r: any) => r.team.id === matchData.awayTeam.id);

    const getStats = (row: any) => {
      if (!row) return "Données non disponibles";
      const games = Math.max(row.playedGames, 1);
      return `Position: ${row.position}, Points: ${row.points}, Buts marqués/match: ${(row.goalsFor / games).toFixed(2)}, Buts encaissés/match: ${(row.goalsAgainst / games).toFixed(2)}, Forme: ${row.form || "N/A"}`;
    };

    let analysisText = "Analyse IA non disponible (Clé API Gemini manquante).";
    if (GEMINI_API_KEY) {
      const systemInstruction = `À partir de maintenant, tu dois répondre comme un analyste sportif expert spécialisé dans la prédiction de matchs de football.

Ton objectif est de fournir une analyse complète, structurée, sérieuse et argumentée d’un match, en t’appuyant uniquement sur les données disponibles, la logique statistique, la forme récente, le contexte du match et les tendances des équipes.

IMPORTANT :
- Tu ne dois jamais inventer des données absentes.
- Si certaines informations ne sont pas disponibles, tu dois l’indiquer clairement.
- Pour les prédictions sur les corners, les cartons, ou certains marchés secondaires, tu dois répondre "si possible" selon la qualité des données disponibles.
- Tu dois toujours distinguer ce qui est :
  1. fortement probable,
  2. modérément probable,
  3. incertain.

Je veux que ta réponse soit organisée exactement comme ceci :

## 1. Résumé rapide du match
- Compétition :
- Date :
- Équipes :
- Contexte :
- Importance du match :

## 2. Analyse des équipes
Analyse les points suivants :
- forme récente des deux équipes
- performances domicile / extérieur
- dynamique offensive et défensive
- xG / xGA si disponibles
- absences importantes, blessures, suspensions
- style de jeu
- motivation / enjeu
- fatigue / calendrier
- confrontations directes si elles sont pertinentes
- arbitre si cela a un impact potentiel sur les cartons

## 3. Lecture tactique du match
Explique le scénario tactique le plus probable :
- quelle équipe devrait avoir la possession
- quelle équipe devrait subir
- rythme probable du match
- probabilité d’un match fermé ou ouvert
- moments où le match peut basculer

## 4. Prédictions principales
Donne une prédiction claire et synthétique sur :
- Résultat probable : victoire domicile / nul / victoire extérieur
- Double chance si utile
- Score probable
- Nombre de buts probable
- Over/Under buts si pertinent
- BTTS (les deux équipes marquent) si pertinent

## 5. Prédictions secondaires (SI POSSIBLE)
Seulement si les données permettent une estimation sérieuse, donne :
- Nombre total de corners probable
- Fourchette probable des corners
- Nombre total de cartons probable
- Fourchette probable des cartons
- Équipe la plus susceptible d’obtenir le plus de corners
- Équipe la plus susceptible d’obtenir le plus de cartons

Si les données sont insuffisantes pour les corners ou les cartons, écris clairement :
"Données insuffisantes pour une estimation fiable des corners/cartons."

## 6. Scénario probable du match
Décris en 4 à 8 lignes le déroulé le plus probable du match.

## 7. Niveau de confiance
Ajoute une note de confiance sur 10 pour :
- résultat principal
- nombre de buts
- corners (si possible)
- cartons (si possible)

## 8. Conclusion finale
Termine par une conclusion concise avec :
- le pari ou la prédiction la plus solide
- le principal risque qui peut faire échouer l’analyse
- une phrase finale claire et professionnelle

RÈGLES DE RÉDACTION :
- Réponse en français
- Sépare bien tes réponses en paragraphes distincts (saute des lignes) pour faciliter la lecture
- Mets les titres et les éléments importants en **gras**
- Style professionnel, clair et crédible
- Pas de ton exagéré
- Pas de certitude absolue
- Utilise des termes comme : "probable", "possible", "plus plausible", "à surveiller"
- Argumente chaque prédiction après l’analyse
- Ne donne pas juste un pronostic brut : explique pourquoi
- Si les données sont limitées, sois honnête et précise les limites`;

      const prompt = `Analyse le match suivant :
Compétition : ${matchData.competition.name}
Date : ${new Date(matchData.utcDate).toLocaleString('fr-FR')}
Équipe Domicile : ${matchData.homeTeam.name} (${getStats(homeTeamRow)})
Équipe Extérieur : ${matchData.awayTeam.name} (${getStats(awayTeamRow)})
`;

      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: {
            systemInstruction: systemInstruction
          }
        });
        
        if (aiResponse.text) {
          analysisText = aiResponse.text;
        } else {
          analysisText = "Erreur lors de la génération de l'analyse IA.";
        }
      } catch (aiError: any) {
        console.error("Gemini API Error:", aiError);
        const errorMsg = aiError.message || JSON.stringify(aiError);
        if (errorMsg.includes('503') || errorMsg.includes('high demand')) {
          analysisText = "Le service IA de Google est temporairement surchargé en raison d'une forte demande. Veuillez réessayer dans quelques instants.";
        } else {
          analysisText = `Erreur lors de la communication avec l'API Gemini: ${errorMsg}`;
        }
      }
    }

    res.json({
      match_id: parseInt(match_id),
      match: matchData,
      analysis: analysisText
    });

  } catch (error: any) {
    console.error("Match Analysis error:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

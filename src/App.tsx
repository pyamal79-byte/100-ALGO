import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Wallet, Target, Activity, AlertCircle, 
  ChevronRight, X, ShieldCheck, Info,
  Trophy, Calendar, BarChart3, ListOrdered, Search, LayoutDashboard, Menu
} from 'lucide-react';
import { Match, Sport } from './types';
import { mockMatches } from './data';
import Markdown from 'react-markdown';

type ViewMode = 'DASHBOARD' | 'STANDINGS' | 'ANALYSIS' | 'MATCHES';

// --- Composant: MatchesView ---

const MatchesView = ({ sport, league }: { sport: Sport, league: string }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState('');

  const codes: Record<string, string> = {
    'Champions League': 'CL',
    'Europa League': 'EL',
    'Europa Conference League': 'ECL',
    'Premier League': 'PL',
    'Ligue 1': 'FL1',
    'Bundesliga': 'BL1',
    'Serie A': 'SA',
    'La Liga': 'PD',
    'Primeira Liga (Portugal)': 'PPL',
    'Eredivisie (Pays-Bas)': 'DED',
    'Championship (Angleterre)': 'ELC',
    'Série A (Brésil)': 'BSA',
    'Copa Libertadores': 'CLI',
    'Euro': 'EC',
    'Coupe du Monde': 'WC'
  };

  useEffect(() => {
    if (sport !== 'FOOTBALL') {
      setMatches([]);
      setSelectedMatch(null);
      setAnalysis(null);
      return;
    }
    const fetchMatches = async () => {
      setLoading(true);
      setError('');
      try {
        const code = league === 'Toutes' ? 'CL' : codes[league];
        if (!code) return;
        const res = await fetch(`/api/matches/${code}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la récupération des matchs');
        setMatches(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [sport, league]);

  const handleAnalyze = async (matchId: number) => {
    setSelectedMatch(matchId);
    setLoadingAnalysis(true);
    setError('');
    setAnalysis(null);
    try {
      const code = league === 'Toutes' ? 'CL' : codes[league];
      const res = await fetch(`/api/match/${code}/${matchId}/analysis`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'analyse");
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  if (sport !== 'FOOTBALL') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
        <Calendar className="w-12 h-12 mb-4 opacity-50" />
        <p>Les matchs ne sont disponibles que pour le Football pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-emerald-500" />
        Matchs à venir {league === 'Toutes' ? '(Ligue des Champions)' : `- ${league}`}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 h-[600px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Sélectionner un match</h3>
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map(match => (
                <button
                  key={match.id}
                  onClick={() => handleAnalyze(match.id)}
                  className={`w-full flex flex-col gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    selectedMatch === match.id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-gray-950 border border-gray-800 hover:bg-gray-800'
                  }`}
                >
                  <div className="text-xs text-gray-500">{new Date(match.utcDate).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2 w-[45%]">
                      {match.homeTeam.crest ? (
                        <img src={match.homeTeam.crest} alt="" className="w-5 h-5 object-contain shrink-0" />
                      ) : (
                        <div className="w-5 h-5 bg-gray-800 rounded-full shrink-0"></div>
                      )}
                      <span className="text-gray-300 truncate">{match.homeTeam.shortName || match.homeTeam.name}</span>
                    </div>
                    <span className="text-gray-600 text-xs shrink-0">vs</span>
                    <div className="flex items-center justify-end gap-2 w-[45%]">
                      <span className="text-gray-300 truncate text-right">{match.awayTeam.shortName || match.awayTeam.name}</span>
                      {match.awayTeam.crest ? (
                        <img src={match.awayTeam.crest} alt="" className="w-5 h-5 object-contain shrink-0" />
                      ) : (
                        <div className="w-5 h-5 bg-gray-800 rounded-full shrink-0"></div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm px-2">Aucun match à venir trouvé.</div>
          )}
        </div>
        <div className="lg:col-span-2">
          {loadingAnalysis ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p>Génération de l'analyse IA experte en cours...</p>
            </div>
          ) : error ? (
            <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>
          ) : analysis ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-2xl">🤖</div>
                <div>
                  <h3 className="text-xl font-bold text-white">Analyse Experte IA</h3>
                  <p className="text-sm text-gray-400">Prédiction détaillée basée sur les statistiques et la forme.</p>
                </div>
              </div>
              <div className="prose prose-invert prose-emerald max-w-none">
                <Markdown>{analysis.analysis}</Markdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 border-2 border-dashed border-gray-800 rounded-2xl p-8">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p>Sélectionnez un match pour générer une analyse experte.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const getValueBadge = (value: number) => {
  if (value >= 10) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (value >= 5) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return 'bg-red-500/10 text-red-400 border-red-500/20';
};

const FormBadge = ({ result }: { result: string }) => {
  const colors = {
    W: 'bg-emerald-500/20 text-emerald-400',
    D: 'bg-gray-500/20 text-gray-400',
    L: 'bg-red-500/20 text-red-400'
  };
  return (
    <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${colors[result as keyof typeof colors] || 'bg-gray-500/20 text-gray-400'}`}>
      {result}
    </span>
  );
};
// --- Composant: Sidebar ---

const Sidebar = ({ 
  sport, setSport, league, setLeague, viewMode, setViewMode, isOpen, setIsOpen
}: { 
  sport: Sport, setSport: (s: Sport) => void, 
  league: string, setLeague: (l: string) => void,
  viewMode: ViewMode, setViewMode: (v: ViewMode) => void,
  isOpen: boolean, setIsOpen: (o: boolean) => void
}) => {
  const FOOTBALL_LEAGUES = ['Toutes', 'Champions League', 'Europa League', 'Europa Conference League', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1', 'Primeira Liga (Portugal)', 'Eredivisie (Pays-Bas)', 'Championship (Angleterre)'];
  const BASKETBALL_LEAGUES = ['Toutes', 'NBA', 'Euroleague'];
  const currentLeagues = sport === 'FOOTBALL' ? FOOTBALL_LEAGUES : BASKETBALL_LEAGUES;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full shrink-0 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <Activity className="text-emerald-500 h-6 w-6" />
            100%ALGO
          </h1>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setIsOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex p-1 bg-gray-950 rounded-xl border border-gray-800 mb-8">
            <button onClick={() => { setSport('FOOTBALL'); setLeague('Toutes'); setIsOpen(false); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sport === 'FOOTBALL' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>FOOTBALL</button>
            <button onClick={() => { setSport('BASKETBALL'); setLeague('Toutes'); setIsOpen(false); }} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${sport === 'BASKETBALL' ? 'bg-gray-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>BASKETBALL</button>
          </div>
          <div className="space-y-1 mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">Vues</h3>
            <button onClick={() => { setViewMode('DASHBOARD'); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'DASHBOARD' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              <LayoutDashboard className="w-4 h-4" />Dashboard
            </button>
            <button onClick={() => { setViewMode('STANDINGS'); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'STANDINGS' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              <ListOrdered className="w-4 h-4" />Classements
            </button>
            <button onClick={() => { setViewMode('ANALYSIS'); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'ANALYSIS' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              <Search className="w-4 h-4" />Analyse Équipe
            </button>
            <button onClick={() => { setViewMode('MATCHES'); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'MATCHES' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              <Calendar className="w-4 h-4" />Matchs à venir
            </button>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">Championnats</h3>
            {currentLeagues.map(l => (
              <button key={l} onClick={() => { setLeague(l); setIsOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${league === l ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
                <Trophy className="w-4 h-4" />{l}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};
// --- Composant: Match Modal ---

const MatchModal = ({ match, onClose }: { match: any | null, onClose: () => void }) => {
  if (!match) return null;
  const isMock = 'algoProbability' in match;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-gray-800 text-xs font-medium text-gray-300 border border-gray-700">{isMock ? match.league : match.competition?.name}</span>
            <span className="text-sm text-gray-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {isMock ? `Aujourd'hui, ${match.time}` : new Date(match.utcDate).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center gap-3 w-1/3">
              {match.homeTeam.crest ? <img src={match.homeTeam.crest} alt={match.homeTeam.name} className="w-16 h-16 object-contain" /> : <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${match.homeTeam.color || 'bg-gray-800'}`}>{match.homeTeam.shortName || match.homeTeam.name.substring(0, 3).toUpperCase()}</div>}
              <span className="font-semibold text-white text-center">{match.homeTeam.name}</span>
              {isMock && <div className="flex gap-1">{match.homeTeam.form.map((f: string, i: number) => <FormBadge key={i} result={f} />)}</div>}
            </div>
            <div className="flex flex-col items-center gap-2 w-1/3">
              {isMock ? (
                <>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Prédiction ML</span>
                  <span className="px-4 py-1.5 rounded-full bg-gray-800 text-sm font-medium text-white border border-gray-700">{match.prediction}</span>
                  <div className="text-3xl font-bold text-emerald-400 font-mono mt-2">{match.algoProbability}%</div>
                </>
              ) : (
                <div className="text-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Statut</span>
                  <span className="px-4 py-1.5 rounded-full bg-gray-800 text-sm font-medium text-emerald-400 border border-gray-700">À venir</span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-3 w-1/3">
              {match.awayTeam.crest ? <img src={match.awayTeam.crest} alt={match.awayTeam.name} className="w-16 h-16 object-contain" /> : <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${match.awayTeam.color || 'bg-gray-800'}`}>{match.awayTeam.shortName || match.awayTeam.name.substring(0, 3).toUpperCase()}</div>}
              <span className="font-semibold text-white text-center">{match.awayTeam.name}</span>
              {isMock && <div className="flex gap-1">{match.awayTeam.form.map((f: string, i: number) => <FormBadge key={i} result={f} />)}</div>}
            </div>
          </div>
          {isMock ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-950 rounded-xl p-5 border border-gray-800">
                <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Statistiques Clés</h4>
                <div className="space-y-3">
                  {match.sport === 'FOOTBALL' ? (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">xG Domicile</span><span className="text-white font-mono">{match.stats.homeXg}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">xG Extérieur</span><span className="text-white font-mono">{match.stats.awayXg}</span></div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Pace Domicile</span><span className="text-white font-mono">{match.stats.homePace}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">Pace Extérieur</span><span className="text-white font-mono">{match.stats.awayPace}</span></div>
                    </>
                  )}
                  <div className="pt-3 mt-3 border-t border-gray-800">
                    <span className="text-xs text-gray-500 block mb-1">Absences Notables</span>
                    <p className="text-xs text-red-400">{[...match.homeTeam.injuries, ...match.awayTeam.injuries].join(', ') || 'Aucune blessure majeure'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-950 rounded-xl p-5 border border-gray-800 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Analyse de Valeur</h4>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">Cote Bookmaker</span>
                    <span className="text-lg text-white font-mono font-medium">{match.bookmakerOdds.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Avantage (Edge)</span>
                    <span className={`px-2 py-0.5 rounded text-sm font-mono font-bold border ${getValueBadge(match.valuePercentage)}`}>{match.valuePercentage > 0 ? '+' : ''}{match.valuePercentage.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800">
                  <p className="text-xs text-gray-400 leading-relaxed flex gap-2"><Info className="w-4 h-4 text-emerald-500 shrink-0" />{match.stats.keyFactor}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-950 rounded-xl p-5 border border-gray-800 text-center">
              <p className="text-gray-400 text-sm">Allez dans l'onglet "Matchs à venir" pour générer une analyse IA complète de cette rencontre.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// --- Composant: StandingsView ---

const StandingsView = ({ sport, league }: { sport: Sport, league: string }) => {
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sport !== 'FOOTBALL') { setStandings([]); return; }
    const fetchStandings = async () => {
      setLoading(true); setError('');
      try {
        const codes: Record<string, string> = { 'Champions League': 'CL', 'Premier League': 'PL', 'Ligue 1': 'FL1', 'Bundesliga': 'BL1', 'Serie A': 'SA', 'La Liga': 'PD', 'Toutes': 'CL' };
        const code = codes[league];
        if (!code) return;
        const res = await fetch(`/api/standings/${code}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la récupération du classement');
        setStandings(data);
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };
    fetchStandings();
  }, [sport, league]);

  if (sport !== 'FOOTBALL') return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
      <ListOrdered className="w-12 h-12 mb-4 opacity-50" />
      <p>Les classements ne sont disponibles que pour le Football pour le moment.</p>
    </div>
  );

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <ListOrdered className="w-6 h-6 text-emerald-500" />
        Classements {league === 'Toutes' ? '(Ligue des Champions)' : `- ${league}`}
      </h2>
      {loading ? <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
      : error ? <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>
      : standings.length > 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-950/50 text-xs uppercase text-gray-500 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Pos</th><th className="px-6 py-4 font-medium">Équipe</th>
                  <th className="px-4 py-4 font-medium text-center">J</th><th className="px-4 py-4 font-medium text-center">V</th>
                  <th className="px-4 py-4 font-medium text-center">N</th><th className="px-4 py-4 font-medium text-center">D</th>
                  <th className="px-4 py-4 font-medium text-center">BP</th><th className="px-4 py-4 font-medium text-center">BC</th>
                  <th className="px-4 py-4 font-medium text-center">Diff</th><th className="px-6 py-4 font-medium text-right">Pts</th>
                  <th className="px-6 py-4 font-medium text-center">Forme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {standings.map((row: any) => (
                  <tr key={row.team.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{row.position}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-3"><img src={row.team.crest} alt={row.team.name} className="w-6 h-6 object-contain" /><span className="font-medium text-gray-200">{row.team.name}</span></div></td>
                    <td className="px-4 py-4 text-center">{row.playedGames}</td><td className="px-4 py-4 text-center">{row.won}</td>
                    <td className="px-4 py-4 text-center">{row.draw}</td><td className="px-4 py-4 text-center">{row.lost}</td>
                    <td className="px-4 py-4 text-center">{row.goalsFor}</td><td className="px-4 py-4 text-center">{row.goalsAgainst}</td>
                    <td className="px-4 py-4 text-center">{row.goalDifference}</td><td className="px-6 py-4 text-right font-bold text-white">{row.points}</td>
                    <td className="px-6 py-4 text-center"><div className="flex justify-center gap-1">{(row.form || '').split(',').map((f: string, i: number) => <FormBadge key={i} result={f} />)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : <div className="text-gray-400">Aucune donnée disponible.</div>}
    </div>
  );
};

// --- Composant: AnalysisView ---

const AnalysisView = ({ sport, league }: { sport: Sport, league: string }) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [error, setError] = useState('');
  const codes: Record<string, string> = { 'Champions League': 'CL', 'Premier League': 'PL', 'Ligue 1': 'FL1', 'Bundesliga': 'BL1', 'Serie A': 'SA', 'La Liga': 'PD', 'Toutes': 'CL' };

  useEffect(() => {
    if (sport !== 'FOOTBALL') { setTeams([]); setSelectedTeam(null); setAnalysis(null); return; }
    const fetchTeams = async () => {
      setLoading(true);
      try {
        const code = codes[league];
        if (!code) return;
        const res = await fetch(`/api/standings/${code}`);
        if (res.ok) { const data = await res.json(); setTeams(data.map((row: any) => row.team)); }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchTeams();
  }, [sport, league]);

  const handleAnalyze = async (teamId: number) => {
    setSelectedTeam(teamId); setLoadingAnalysis(true); setError(''); setAnalysis(null);
    try {
      const code = codes[league];
      const res = await fetch(`/api/team/${code}/${teamId}/analysis`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'analyse");
      setAnalysis(data);
    } catch (err: any) { setError(err.message); } finally { setLoadingAnalysis(false); }
  };

  if (sport !== 'FOOTBALL') return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
      <Search className="w-12 h-12 mb-4 opacity-50" /><p>L'analyse n'est disponible que pour le Football pour le moment.</p>
    </div>
  );

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <Search className="w-6 h-6 text-emerald-500" />
        Analyse d'Équipe {league === 'Toutes' ? '(Ligue des Champions)' : `- ${league}`}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-2xl p-4 h-[600px] overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Sélectionner une équipe</h3>
          {loading ? <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div> : (
            <div className="space-y-1">
              {teams.map(team => (
                <button key={team.id} onClick={() => handleAnalyze(team.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${selectedTeam === team.id ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-gray-300 hover:bg-gray-800'}`}>
                  <img src={team.crest} alt={team.name} className="w-6 h-6 object-contain" />{team.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2">
          {loadingAnalysis ? <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><p>Génération de l'analyse IA en cours...</p></div>
          : error ? <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>
          : analysis ? (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
              <div className="flex items-center gap-4 border-b border-gray-800 pb-6">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center text-2xl">🤖</div>
                <div><h3 className="text-xl font-bold text-white">Rapport d'Analyse IA</h3><p className="text-sm text-gray-400">Basé sur les performances récentes et les statistiques avancées.</p></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800"><p className="text-xs text-gray-500 mb-1">Matchs Joués</p><p className="text-xl font-bold text-white">{analysis.stats.matches_played}</p></div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800"><p className="text-xs text-gray-500 mb-1">Buts Marqués /m</p><p className="text-xl font-bold text-emerald-400">{analysis.stats.goals_for_avg}</p></div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800"><p className="text-xs text-gray-500 mb-1">Buts Encaissés /m</p><p className="text-xl font-bold text-red-400">{analysis.stats.goals_against_avg}</p></div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800"><p className="text-xs text-gray-500 mb-1">Position</p><p className="text-xl font-bold text-white">{analysis.stats.position}</p></div>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4" />Avis de l'Expert IA</h4>
                <p className="text-gray-300 leading-relaxed text-sm">{analysis.analysis}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl p-8 text-center">
              <Search className="w-12 h-12 mb-4 opacity-50" /><p>Sélectionnez une équipe dans la liste pour générer une analyse détaillée par l'Intelligence Artificielle.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// --- Composant: DashboardView ---

const DashboardView = ({ sport, league, onAnalyze }: { sport: Sport, league: string, onAnalyze: (match: any) => void }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const nextDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  const codes: Record<string, string> = { 'Champions League': 'CL', 'Premier League': 'PL', 'Ligue 1': 'FL1', 'Bundesliga': 'BL1', 'Serie A': 'SA', 'La Liga': 'PD', 'Toutes': 'ALL' };

  useEffect(() => {
    if (sport !== 'FOOTBALL') { setMatches([]); return; }
    const fetchMatches = async () => {
      setLoading(true); setError('');
      try {
        const code = league === 'Toutes' ? 'CL' : codes[league];
        if (!code) return;
        const res = await fetch(`/api/matches/${code}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur lors de la récupération des matchs');
        const filtered = data.filter((m: any) => m.utcDate.startsWith(selectedDate));
        setMatches(filtered);
      } catch (err: any) { setError(err.message); } finally { setLoading(false); }
    };
    fetchMatches();
  }, [sport, league, selectedDate]);

  if (sport !== 'FOOTBALL') return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
      <Calendar className="w-12 h-12 mb-4 opacity-50" /><p>Le calendrier n'est disponible que pour le Football pour le moment.</p>
    </div>
  );

  return (
    <div className="p-4 lg:p-8 flex-1 overflow-y-auto space-y-8">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 lg:p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Calendrier des matchs
        </h3>
        <div className="flex gap-2 lg:gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {nextDays.map((date, i) => {
            const dateStr = date.toISOString().split('T')[0];
            const isSelected = selectedDate === dateStr;
            const isToday = i === 0;
            return (
              <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center justify-center min-w-[70px] lg:min-w-[90px] py-3 rounded-xl border transition-all ${isSelected ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-300'}`}
              >
                <span className="text-xs font-medium uppercase mb-1">
                  {isToday ? "Auj." : ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()]}
                </span>
                <span className={`text-xl lg:text-2xl font-bold ${isSelected ? 'text-emerald-400' : 'text-gray-300'}`}>{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-500" />
            Rencontres {league === 'Toutes' ? '(Ligue des Champions par défaut)' : `- ${league}`}
          </h2>
        </div>
        <div className="p-4 lg:p-6">
          {loading ? <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
          : error ? <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">{error}</div>
          : matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {matches.map(match => (
                <div key={match.id} className="bg-gray-950 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                  <div className="text-xs text-gray-500 mb-3 flex justify-between items-center">
                    <span>{new Date(match.utcDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="px-2 py-0.5 bg-gray-900 rounded text-gray-400 border border-gray-800">{match.competition.name}</span>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">{match.homeTeam.crest && <img src={match.homeTeam.crest} alt="" className="w-6 h-6 object-contain" />}<span className="font-medium text-gray-200">{match.homeTeam.shortName || match.homeTeam.name}</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">{match.awayTeam.crest && <img src={match.awayTeam.crest} alt="" className="w-6 h-6 object-contain" />}<span className="font-medium text-gray-200">{match.awayTeam.shortName || match.awayTeam.name}</span></div>
                    </div>
                  </div>
                  <button onClick={() => onAnalyze(match)} className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-lg transition-colors border border-emerald-500/20">
                    Analyser ce match
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Aucun match prévu pour cette date dans ce championnat.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Composant Principal: App ---

export default function App() {
  const [sport, setSport] = useState<Sport>('FOOTBALL');
  const [league, setLeague] = useState<string>('Toutes');
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredMatches = useMemo(() => {
    return mockMatches.filter(m => {
      if (m.sport !== sport) return false;
      if (league !== 'Toutes' && m.league !== league) return false;
      return true;
    });
  }, [sport, league]);

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      <Sidebar sport={sport} setSport={setSport} league={league} setLeague={setLeague} viewMode={viewMode} setViewMode={setViewMode} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        <header className="h-20 border-b border-gray-800 bg-gray-950/50 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-white hidden sm:block">
              {viewMode === 'DASHBOARD' && `Dashboard ${sport === 'FOOTBALL' ? 'Football' : 'Basketball'}`}
              {viewMode === 'STANDINGS' && `Classements ${sport === 'FOOTBALL' ? 'Football' : 'Basketball'}`}
              {viewMode === 'ANALYSIS' && `Analyse IA ${sport === 'FOOTBALL' ? 'Football' : 'Basketball'}`}
              {viewMode === 'MATCHES' && `Matchs à venir ${sport === 'FOOTBALL' ? 'Football' : 'Basketball'}`}
            </h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-emerald-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs sm:text-sm font-medium">API Active</span>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-xs sm:text-sm">
              AL
            </div>
          </div>
        </header>
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {viewMode === 'DASHBOARD' && <DashboardView sport={sport} league={league} onAnalyze={(match) => setSelectedMatch(match)} />}
          {viewMode === 'STANDINGS' && <StandingsView sport={sport} league={league} />}
          {viewMode === 'ANALYSIS'  && <AnalysisView  sport={sport} league={league} />}
          {viewMode === 'MATCHES'   && <MatchesView   sport={sport} league={league} />}
        </div>
      </main>
      <MatchModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </div>
  );
}

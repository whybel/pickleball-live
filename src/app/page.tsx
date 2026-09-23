"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DEFAULT_CATEGORIES = ["Singles", "Doubles", "Men's Singles", "Men's Doubles", "Women's Singles", "Women's Doubles", "Mixed Doubles"];

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("All Teams");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [categoryOptions, setCategoryOptions] = useState<string[]>(["All Categories", ...DEFAULT_CATEGORIES]);
  const [competitionName, setCompetitionName] = useState("PickleballLive Tournament");
  const [loading, setLoading] = useState(true);
  const [showTeamName, setShowTeamName] = useState(true);
  const [showPlayerName, setShowPlayerName] = useState(true);

  const fetchData = async () => {
    const { data: comps } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    const comp = comps && comps[0];
    if (!comp) {
      setMatches([]);
      setTeams([]);
      setLoading(false);
      return;
    }

    const { data: m } = await supabase
      .from("matches")
      .select("*, team1:team1_id(name), team2:team2_id(name)")
      .eq("competition_id", comp.id)
      .order("match_number");
    const list = m || [];

    // ONLY teams that belong to THIS tournament (from its games + its standings rows)
    const { data: st } = await supabase
      .from("group_standings")
      .select("team_id")
      .eq("competition_id", comp.id);
    const ids = new Set<string>();
    list.forEach((x: any) => {
      if (x.team1_id) ids.add(x.team1_id);
      if (x.team2_id) ids.add(x.team2_id);
    });
    (st || []).forEach((x: any) => {
      if (x.team_id) ids.add(x.team_id);
    });
    const { data: t } = await supabase.from("teams").select("*").order("name");
    const compTeams = (t || []).filter((x: any) => ids.has(x.id));

    // ONLY categories that occur in THIS tournament
    const cats = Array.from(new Set(list.map((x: any) => x.category).filter(Boolean))) as string[];
    const opts = ["All Categories", ...(cats.length ? cats.sort() : DEFAULT_CATEGORIES)];

    setCompetitionName(comp.name);
    setShowTeamName(comp.show_team_name !== false);
    setShowPlayerName(comp.show_player_name !== false);
    setMatches(list);
    setTeams(compTeams);
    setCategoryOptions(opts);
    setSelectedCategory((prev) => (opts.includes(prev) ? prev : "All Categories"));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("public:live_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "competitions" }, () => fetchData())
      .subscribe();

    const refreshChannel = supabase
      .channel("live-refresh")
      .on("broadcast", { event: "refresh" }, () => fetchData())
      .subscribe();

    const interval = setInterval(fetchData, 3000);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(refreshChannel);
      clearInterval(interval);
    };
  }, []);

  const filteredMatches = matches.filter((match) => {
    const teamMatch = selectedTeam === "All Teams" ||
      match.team1?.name === selectedTeam ||
      match.team2?.name === selectedTeam ||
      match.team1_custom_name === selectedTeam ||
      match.team2_custom_name === selectedTeam;
    const categoryMatch = selectedCategory === "All Categories" || match.category === selectedCategory;
    return teamMatch && categoryMatch;
  });

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#C9A959' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <style>{`
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background-color: #0a0a0a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .match-box { break-inside: avoid; page-break-inside: avoid; margin-bottom: 16px !important; border: 1px solid #C9A959 !important; }
          nav { display: none !important; }
        }
      `}</style>

      <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>{competitionName}</h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>Live scores and results</p>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Follow Your Team</label>
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', fontSize: '14px' }}>
            <option value="All Teams">Show All Teams</option>
            {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Category</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', fontSize: '14px' }}>
            {categoryOptions.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>LIVE & UPCOMING GAMES</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMatches.map((match: any) => {
            const t1Name = match.team1_custom_name?.trim() || match.team1?.name || 'TBD';
            const t2Name = match.team2_custom_name?.trim() || match.team2?.name || 'TBD';
            return (
              <div key={match.id} className="match-box" style={{ background: '#111111', border: match.is_knockout ? '1px solid #C9A959' : '1px solid #1a1a1a', borderRadius: '4px', padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959' }}>
                      Game #{match.match_number} {match.is_knockout && `(${match.knockout_round || match.round})`}
                    </span>
                    <span style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px' }}>Category: {match.category}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888888' }}>{match.court} | {match.scheduled_time}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    {showTeamName && (
                      <div style={{ fontSize: '16px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff', marginBottom: showPlayerName ? '4px' : '0' }}>
                        {t1Name}
                      </div>
                    )}
                    {showPlayerName && (
                      <div style={{ fontSize: '12px', color: '#888888' }}>{match.team1_players?.trim() || match.game_type || '-'}</div>
                    )}
                  </div>
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    {match.status === 'completed' || match.status === 'live' ? (
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff' }}>{match.team1_score} - {match.team2_score}</div>
                    ) : (
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888888' }}>VS</div>
                    )}
                  </div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    {showTeamName && (
                      <div style={{ fontSize: '16px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff', marginBottom: showPlayerName ? '4px' : '0' }}>
                        {t2Name}
                      </div>
                    )}
                    {showPlayerName && (
                      <div style={{ fontSize: '12px', color: '#888888' }}>{match.team2_players?.trim() || match.game_type || '-'}</div>
                    )}
                  </div>
                </div>

                {match.status === 'completed' && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>Winner: {match.winner_id === match.team1_id ? t1Name : t2Name}</span>
                  </div>
                )}
                {match.status === 'live' && (
                  <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>LIVE</span>
                  </div>
                )}
              </div>
            );
          })}
          {filteredMatches.length === 0 && <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>No games found</div>}
        </div>
      </div>
    </div>
  );
}
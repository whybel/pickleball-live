"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("All Teams");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: m } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").order("match_number");
      const { data: t } = await supabase.from("teams").select("*").order("name");
      setMatches(m || []);
      setTeams(t || []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel("public:matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (payload) => {
        setMatches((currentMatches) => {
          if (payload.eventType === "INSERT") {
            return [...currentMatches, payload.new];
          } else if (payload.eventType === "UPDATE") {
            return currentMatches.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m));
          }
          return currentMatches;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredMatches = selectedTeam === "All Teams" 
    ? matches 
    : matches.filter(m => m.team1?.name === selectedTeam || m.team2?.name === selectedTeam);

  if (loading) return <div style={{textAlign: 'center', padding: '40px', color: '#fbbf24'}}>Loading...</div>;

  return (
    <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
      {/* Header */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #334155', paddingBottom: '20px'}}>
        <div>
          <h1 style={{fontSize: '2rem', fontWeight: 'bold', color: '#fbbf24', margin: 0}}>AIWM</h1>
          <p style={{margin: '5px 0 0 0', color: '#94a3b8', fontSize: '0.9rem'}}>Charity Pickleball Tournament</p>
        </div>
        <a href="/admin" style={{background: '#334155', color: 'white', padding: '8px 16px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.85rem'}}>Admin</a>
      </div>

      {/* Team Filter */}
      <div className="match-card">
        <label style={{display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600'}}>FOLLOW YOUR TEAM</label>
        <select 
          value={selectedTeam} 
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', fontSize: '1rem'}}
        >
          <option value="All Teams">Show All Matches</option>
          {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {/* Matches */}
      <h2 style={{fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '20px', color: 'white'}}>
        <span style={{display: 'inline-block', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', marginRight: '8px', animation: 'pulse 2s infinite'}}></span>
        Live & Upcoming Matches
      </h2>

      {filteredMatches.map((match: any) => (
        <div key={match.id} className="match-card">
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', fontSize: '0.85rem', color: '#94a3b8'}}>
            <span>{match.court} • {match.scheduled_time}</span>
            <span className="badge">{match.game_type}</span>
          </div>
          
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
            <div style={{flex: 1}}>
              <div className={`team-name ${match.winner_id === match.team1_id ? 'winner' : ''}`}>
                {match.team1?.name || 'TBD'}
              </div>
            </div>
            
            <div className="score-display">
              {match.status === 'completed' || match.status === 'live' ? (
                `${match.team1_score} - ${match.team2_score}`
              ) : (
                <span style={{fontSize: '1rem', color: '#64748b'}}>VS</span>
              )}
            </div>

            <div style={{flex: 1, textAlign: 'right'}}>
              <div className={`team-name ${match.winner_id === match.team2_id ? 'winner' : ''}`}>
                {match.team2?.name || 'TBD'}
              </div>
            </div>
          </div>

          {match.status === 'completed' && (
            <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #334155', textAlign: 'center', color: '#22c55e', fontWeight: '700', fontSize: '0.9rem'}}>
              WINNER: {(match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name)?.toUpperCase()}
            </div>
          )}
        </div>
      ))}

      {filteredMatches.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>No matches found for this team.</div>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("All Teams");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [competitionName, setCompetitionName] = useState("PickleballLive Tournament");
  const [loading, setLoading] = useState(true);

  const categories = [
    "All Categories",
    "Singles",
    "Doubles",
    "Men's Singles",
    "Men's Doubles",
    "Women's Singles",
    "Women's Doubles",
    "Mixed Doubles"
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: m } = await supabase
        .from("matches")
        .select("*, team1:team1_id(name), team2:team2_id(name)")
        .order("match_number");
      
      const { data: t } = await supabase.from("teams").select("*").order("name");
      
      const { data: settings } = await supabase
        .from("competition_settings")
        .select("*")
        .single();
      
      setMatches(m || []);
      setTeams(t || []);
      if (settings) setCompetitionName(settings.competition_name);
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

  const filteredMatches = matches.filter((match) => {
    const teamMatch = selectedTeam === "All Teams" || 
      match.team1?.name === selectedTeam || 
      match.team2?.name === selectedTeam;
    
    const categoryMatch = selectedCategory === "All Categories" || 
      match.category === selectedCategory;
    
    return teamMatch && categoryMatch;
  });

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px', color: '#C9A959' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Competition Header */}
      <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>{competitionName}</h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>Live scores and results</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Follow Your Team
          </label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', fontSize: '14px' }}
          >
            <option value="All Teams">Show All Teams</option>
            {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Category
          </label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', fontSize: '14px' }}
          >
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Matches */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>
          LIVE & UPCOMING MATCHES
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredMatches.map((match: any) => (
            <div key={match.id} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '20px' }}>
              {/* Match Header */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959' }}>Match #{match.match_number}</span>
                  <span style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Category: {match.category}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#888888', marginBottom: '4px' }}>
                  {match.court} | {match.scheduled_time}
                </div>
                <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                  Player/s: {match.game_type}
                </div>
              </div>

              {/* Teams and Score */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                    {match.team1?.name || 'TBD'}
                  </div>
                </div>
                
                <div style={{ textAlign: 'center', minWidth: '120px' }}>
                  {match.status === 'completed' || match.status === 'live' ? (
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff' }}>
                        {match.team1_score} - {match.team2_score}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888888' }}>VS</div>
                  )}
                </div>

                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                    {match.team2?.name || 'TBD'}
                  </div>
                </div>
              </div>

              {match.status === 'completed' && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '600' }}>
                    Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                  </span>
                </div>
              )}

              {match.status === 'live' && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>
                    LIVE
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {filteredMatches.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>
              No matches found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
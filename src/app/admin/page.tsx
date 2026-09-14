"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [currentCompId, setCurrentCompId] = useState<string>("");
  const [newCompName, setNewCompName] = useState("");
  const [setsFormat, setSetsFormat] = useState("1");
  const [compType, setCompType] = useState("Tournament");

  const categories = [
    "Men's Singles", "Men's Doubles", "Women's Singles", 
    "Women's Doubles", "Mixed Doubles", "Gender Neutral Doubles",
    "Singles", "Doubles"
  ];

  // 1. Fetch competitions on login
  useEffect(() => {
    if (isAuthenticated) {
      fetchCompetitions();
    }
  }, [isAuthenticated]);

  // 2. Fetch matches ONLY when a competition is selected
  useEffect(() => {
    if (isAuthenticated && currentCompId) {
      fetchData();
    }
  }, [isAuthenticated, currentCompId]);

  const fetchCompetitions = async () => {
    const { data } = await supabase.from("competitions").select("*").order("created_at", { ascending: false });
    setCompetitions(data || []);
    
    if (data && data.length > 0) {
      // Auto-select the first competition if none is selected
      const activeComp = data.find((c: any) => c.status === 'active') || data[0];
      if (!currentCompId) {
        setCurrentCompId(activeComp.id);
        setSetsFormat(activeComp.sets_format || "1");
        setCompType(activeComp.competition_type || "Tournament");
      }
    }
  };

  const fetchData = async () => {
    // Fetch matches for the selected competition
    const { data: m, error } = await supabase
      .from("matches")
      .select("*, team1:team1_id(name), team2:team2_id(name)")
      .eq("competition_id", currentCompId)
      .order("match_number");
    
    if (error) console.error("Error fetching matches:", error);

    const { data: t } = await supabase.from("teams").select("*").order("name");
    
    setMatches(m || []);
    setTeams(t || []);
  };

  const handleLogin = () => {
    if (passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect passcode.");
    }
  };

  const createCompetition = async () => {
    if (!newCompName) return alert("Please enter a competition name");
    const { data, error } = await supabase
      .from("competitions")
      .insert([{ name: newCompName, sets_format: setsFormat, competition_type: compType, status: 'active' }])
      .select()
      .single();
    
    if (error) return alert("Error creating competition: " + error.message);
    setNewCompName("");
    setCurrentCompId(data.id);
    fetchCompetitions();
  };

  const updateSettings = async () => {
    await supabase.from("competitions").update({ sets_format: setsFormat, competition_type: compType }).eq("id", currentCompId);
    alert("Settings saved!");
  };

  const updateLiveScore = async (matchId: string, t1: number, t2: number) => {
    await supabase.from("matches").update({ 
      team1_score: t1, 
      team2_score: t2,
      status: "live"
    }).eq("id", matchId);
    fetchData();
  };

  // Client-side standings update to ensure it works without complex SQL functions
  const updateStandingsClientSide = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    const t1Win = t1 > t2 ? 1 : 0;
    const t2Win = t2 > t1 ? 1 : 0;

    // Update Team 1
    const { data: s1 } = await supabase.from('group_standings').select('*').eq('competition_id', currentCompId).eq('team_id', t1Id).single();
    if (s1) {
      await supabase.from('group_standings').update({
        matches_played: (s1.matches_played || 0) + 1,
        wins: (s1.wins || 0) + t1Win,
        losses: (s1.losses || 0) + (t1Win === 0 ? 1 : 0),
        points_for: (s1.points_for || 0) + t1,
        points_against: (s1.points_against || 0) + t2
      }).eq('id', s1.id);
    }

    // Update Team 2
    const { data: s2 } = await supabase.from('group_standings').select('*').eq('competition_id', currentCompId).eq('team_id', t2Id).single();
    if (s2) {
      await supabase.from('group_standings').update({
        matches_played: (s2.matches_played || 0) + 1,
        wins: (s2.wins || 0) + t2Win,
        losses: (s2.losses || 0) + (t2Win === 0 ? 1 : 0),
        points_for: (s2.points_for || 0) + t2,
        points_against: (s2.points_against || 0) + t1
      }).eq('id', s2.id);
    }
  };

  const completeMatch = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    const winner = t1 > t2 ? t1Id : t2Id;
    await supabase.from("matches").update({ 
      team1_score: t1, 
      team2_score: t2, 
      winner_id: winner, 
      status: "completed" 
    }).eq("id", matchId);
    
    await updateStandingsClientSide(matchId, t1, t2, t1Id, t2Id);
    fetchData();
  };

  const updateMatchDetails = async (id: string, field: string, value: any) => {
    await supabase.from("matches").update({ [field]: value }).eq("id", id);
    fetchData();
  };

  const resetMatchScore = async (matchId: string) => {
  if (!confirm("Reset this match score? This will also update the standings.")) return;
  
  // Get the current match data before resetting
  const match = matches.find(m => m.id === matchId);
  if (!match || match.status !== 'completed') return;
  
  // Subtract the old stats from standings
  const t1OldWin = (match.team1_score || 0) > (match.team2_score || 0) ? 1 : 0;
  const t2OldWin = (match.team2_score || 0) > (match.team1_score || 0) ? 1 : 0;

  // Update Team 1 - subtract old stats
  const { data: s1 } = await supabase.from('group_standings').select('*').eq('competition_id', currentCompId).eq('team_id', match.team1_id).single();
  if (s1) {
    await supabase.from('group_standings').update({
      matches_played: Math.max(0, (s1.matches_played || 0) - 1),
      wins: Math.max(0, (s1.wins || 0) - t1OldWin),
      losses: Math.max(0, (s1.losses || 0) - (t1OldWin === 0 ? 1 : 0)),
      points_for: Math.max(0, (s1.points_for || 0) - (match.team1_score || 0)),
      points_against: Math.max(0, (s1.points_against || 0) - (match.team2_score || 0))
    }).eq('id', s1.id);
  }

  // Update Team 2 - subtract old stats
  const { data: s2 } = await supabase.from('group_standings').select('*').eq('competition_id', currentCompId).eq('team_id', match.team2_id).single();
  if (s2) {
    await supabase.from('group_standings').update({
      matches_played: Math.max(0, (s2.matches_played || 0) - 1),
      wins: Math.max(0, (s2.wins || 0) - t2OldWin),
      losses: Math.max(0, (s2.losses || 0) - (t2OldWin === 0 ? 1 : 0)),
      points_for: Math.max(0, (s2.points_for || 0) - (match.team2_score || 0)),
      points_against: Math.max(0, (s2.points_against || 0) - (match.team1_score || 0))
    }).eq('id', s2.id);
  }

  // Reset the match
  await supabase.from("matches").update({
    team1_score: 0, 
    team2_score: 0, 
    winner_id: null, 
    status: "upcoming"
  }).eq("id", matchId);
  
  fetchData();
};

  const resetAllScores = async () => {
    if (!confirm("WARNING: This will reset ALL match scores and standings in this competition. Are you sure?")) return;
    
    await supabase.from("matches").update({
      team1_score: 0, team2_score: 0, winner_id: null, status: "upcoming"
    }).eq("competition_id", currentCompId);
    
    await supabase.from("group_standings").update({
      matches_played: 0, wins: 0, losses: 0, points_for: 0, points_against: 0
    }).eq("competition_id", currentCompId);
    
    alert("All scores and standings reset successfully!");
    fetchData();
  };

  // --- LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px', color: '#C9A959' }}>ADMIN ACCESS</h1>
        <input 
          type="password" placeholder="Enter Passcode" value={passcode}
          onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{ padding: '16px', fontSize: '16px', border: '1px solid #2a2a2a', borderRadius: '4px', background: '#111111', color: 'white', width: '100%', maxWidth: '300px', marginBottom: '20px', textAlign: 'center' }}
        />
        <button onClick={handleLogin} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '16px 32px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Unlock
        </button>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>SCOREKEEPER DASHBOARD</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={resetAllScores} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
            RESET ALL
          </button>
          <button onClick={() => setIsAuthenticated(false)} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Logout</button>
        </div>
      </div>

      {/* Competition Manager */}
      <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 0, marginBottom: '16px' }}>Competition Manager</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Select Competition</label>
            <select value={currentCompId} onChange={(e) => setCurrentCompId(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              {competitions.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Create New</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" placeholder="New Competition Name" value={newCompName} onChange={(e) => setNewCompName(e.target.value)} style={{ flex: 1, padding: '12px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
              <button onClick={createCompetition} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '0 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Sets Format</label>
            <select value={setsFormat} onChange={(e) => setSetsFormat(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              <option value="1">1 Set (Single Game)</option>
              <option value="3">Best of 3 Sets</option>
              <option value="5">Best of 5 Sets</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Format Type</label>
            <select value={compType} onChange={(e) => setCompType(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              <option value="Friendly">Friendly Match</option>
              <option value="Tournament">Tournament</option>
            </select>
          </div>
          <button onClick={updateSettings} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '12px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px' }}>Save Settings</button>
        </div>
      </div>

      {/* Matches List */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
          Manage Matches ({matches.length} found)
        </h2>
        
        {matches.length === 0 && (
          <div style={{ padding: '24px', background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', color: '#888888', textAlign: 'center' }}>
            No matches found for this competition. Please create matches in Supabase or select a different competition.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {matches.map((match: any) => (
            <div key={match.id} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Match #{match.match_number} <span style={{ color: '#888888', fontWeight: 'normal', fontSize: '14px' }}>({match.game_type})</span></h3>
                  <p style={{ margin: '4px 0 0 0', color: '#888888', fontSize: '12px' }}>{match.court} • {match.scheduled_time}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {match.status === 'completed' && (
                    <button onClick={() => resetMatchScore(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase' }}>
                      Reset
                    </button>
                  )}
                  <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} style={{ background: '#1a1a1a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>
                    {editingId === match.id ? 'Close' : 'Edit'}
                  </button>
                </div>
              </div>

              {editingId === match.id && (
                <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', marginBottom: '16px', border: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Time</label>
                    <input defaultValue={match.scheduled_time} onBlur={(e) => updateMatchDetails(match.id, 'scheduled_time', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Court</label>
                    <input defaultValue={match.court} onBlur={(e) => updateMatchDetails(match.id, 'court', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Category</label>
                    <select defaultValue={match.category || 'Mixed Doubles'} onChange={(e) => updateMatchDetails(match.id, 'category', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}>
                      {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Team 1</label>
                    <select defaultValue={match.team1_id} onChange={(e) => updateMatchDetails(match.id, 'team1_id', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}>
                      <option value="">Select Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Team 2</label>
                    <select defaultValue={match.team2_id} onChange={(e) => updateMatchDetails(match.id, 'team2_id', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}>
                      <option value="">Select Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {match.team1_id && match.status !== 'completed' && (
                <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', border: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', margin: '0 0 8px 0' }}>{match.team1?.name}</p>
                      <input type="number" id={`t1-${match.id}`} placeholder="0" defaultValue={match.team1_score || 0} style={{ width: '80px', padding: '12px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', fontSize: '20px', fontWeight: 'bold', textAlign: 'center', borderRadius: '4px' }} />
                    </div>
                    <span style={{ color: '#888888', fontWeight: 'bold', fontSize: '20px' }}>VS</span>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: '12px', color: '#888888', marginBottom: '8px', margin: '0 0 8px 0' }}>{match.team2?.name}</p>
                      <input type="number" id={`t2-${match.id}`} placeholder="0" defaultValue={match.team2_score || 0} style={{ width: '80px', padding: '12px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', fontSize: '20px', fontWeight: 'bold', textAlign: 'center', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button 
                      onClick={() => {
                        const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value);
                        const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value);
                        if(!isNaN(s1) && !isNaN(s2)) updateLiveScore(match.id, s1, s2);
                      }}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', flex: 1 }}
                    >Update Live Score</button>
                    <button 
                      onClick={() => {
                        const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value);
                        const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value);
                        if(!isNaN(s1) && !isNaN(s2)) completeMatch(match.id, s1, s2, match.team1_id, match.team2_id);
                      }}
                      style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', flex: 1 }}
                    >Complete Match</button>
                  </div>
                </div>
              )}
              
              {match.status === 'completed' && (
                <div style={{ textAlign: 'center', padding: '16px', background: '#0a0a0a', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
                  <div style={{ color: '#C9A959', fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>COMPLETED</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff' }}>{match.team1_score} - {match.team2_score}</div>
                  <div style={{ marginTop: '8px', color: '#22c55e', fontSize: '14px' }}>Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}</div>
                </div>
              )}
              
              {match.status === 'live' && (
                <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', border: '1px solid #3b82f6', color: '#3b82f6', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase' }}>
                  LIVE - Current Score: {match.team1_score} - {match.team2_score}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
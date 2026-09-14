"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [currentCompId, setCurrentCompId] = useState<string>("");
  const [newCompName, setNewCompName] = useState("");

  const knockoutRounds = ["R128", "R64", "R32", "R16", "Quarter-Final", "Semi-Final", "Final"];

  useEffect(() => {
    if (isAuthenticated) fetchCompetitions();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentCompId) fetchData();
  }, [isAuthenticated, currentCompId]);

  const fetchCompetitions = async () => {
    const { data } = await supabase.from("competitions").select("*").order("created_at", { ascending: false });
    setCompetitions(data || []);
    if (data && data.length > 0 && !currentCompId) {
      const activeComp = data.find((c: any) => c.status === 'active') || data[0];
      setCurrentCompId(activeComp.id);
    }
  };

  const fetchData = async () => {
    const { data: m } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").eq("competition_id", currentCompId).order("match_number");
    const { data: t } = await supabase.from("teams").select("*").order("name");
    setMatches(m || []);
    setTeams(t || []);
  };

  const handleLogin = () => {
    if (passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) setIsAuthenticated(true);
    else alert("Incorrect passcode.");
  };

  const createCompetition = async () => {
    if (!newCompName) return alert("Enter a name");
    const { data, error } = await supabase.from("competitions").insert([{ name: newCompName, status: 'active' }]).select().single();
    if (error) return alert(error.message);
    setNewCompName("");
    setCurrentCompId(data.id);
    fetchCompetitions();
  };

  const updateLiveScore = async (matchId: string, t1: number, t2: number) => {
    await supabase.from("matches").update({ team1_score: t1, team2_score: t2, status: "live" }).eq("id", matchId);
    fetchData();
  };

  const recalculateStandings = async () => {
    if (isRecalculating) return;
    setIsRecalculating(true);
    await supabase.rpc('recalculate_standings', { p_competition_id: currentCompId });
    setIsRecalculating(false);
  };

  const completeMatch = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    const winner = t1 > t2 ? t1Id : t2Id;
    await supabase.from("matches").update({ team1_score: t1, team2_score: t2, winner_id: winner, status: "completed" }).eq("id", matchId);
    await recalculateStandings();
    fetchData();
  };

  const updateMatchDetails = async (id: string, field: string, value: any) => {
    await supabase.from("matches").update({ [field]: value }).eq("id", id);
    fetchData();
  };

  const resetMatchScore = async (matchId: string) => {
    if (!confirm("Reset this match?")) return;
    await supabase.from("matches").update({ team1_score: 0, team2_score: 0, winner_id: null, status: "upcoming" }).eq("id", matchId);
    await recalculateStandings();
    fetchData();
  };

  const resetAllScores = async () => {
    if (!confirm("Reset ALL scores?")) return;
    await supabase.from("matches").update({ team1_score: 0, team2_score: 0, winner_id: null, status: "upcoming" }).eq("competition_id", currentCompId);
    await recalculateStandings();
    fetchData();
  };

  const groupMatches = matches.filter(m => !m.is_knockout);
  const knockoutMatches = matches.filter(m => m.is_knockout);

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px', color: '#C9A959' }}>ADMIN ACCESS</h1>
        <input type="password" placeholder="Enter Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} style={{ padding: '16px', fontSize: '16px', border: '1px solid #2a2a2a', borderRadius: '4px', background: '#111111', color: 'white', width: '100%', maxWidth: '300px', marginBottom: '20px', textAlign: 'center' }} />
        <button onClick={handleLogin} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '16px 32px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase' }}>Unlock</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>SCOREKEEPER DASHBOARD</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={resetAllScores} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>RESET ALL</button>
          <button onClick={() => setIsAuthenticated(false)} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>Logout</button>
        </div>
      </div>

      {/* Competition Manager */}
      <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', textTransform: 'uppercase', marginTop: 0, marginBottom: '16px' }}>Competition Manager</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
      </div>

      {/* KNOCKOUT STAGE MANAGER */}
      {knockoutMatches.length > 0 && (
        <div style={{ background: '#111111', border: '1px solid #C9A959', borderRadius: '4px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', textTransform: 'uppercase', marginTop: 0, marginBottom: '16px' }}>🏆 Knockout Stage Setup</h2>
          <p style={{ color: '#888888', fontSize: '13px', marginBottom: '20px' }}>Assign teams from the dropdowns to populate the bracket. Changes reflect instantly on the Live and Bracket screens.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {knockoutMatches.map((match: any) => (
              <div key={match.id} style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: '12px', color: '#C9A959', fontWeight: 'bold', marginBottom: '12px', textTransform: 'uppercase' }}>{match.knockout_round || match.round} - Match #{match.match_number}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <select value={match.team1_id || ''} onChange={(e) => updateMatchDetails(match.id, 'team1_id', e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                    <option value="">Select Team 1</option>
                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <div style={{ textAlign: 'center', color: '#888888', fontSize: '12px' }}>VS</div>
                  <select value={match.team2_id || ''} onChange={(e) => updateMatchDetails(match.id, 'team2_id', e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                    <option value="">Select Team 2</option>
                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GROUP STAGE MATCHES */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', textTransform: 'uppercase', marginBottom: '16px' }}>Group Stage Matches ({groupMatches.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {groupMatches.map((match: any) => (
            <div key={match.id} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '20px' }}>
              {/* Match Header */}
              <div style={{ marginBottom: '16px', padding: '12px', background: '#0a0a0a', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959' }}>Match #{match.match_number}</span>
                  <span style={{ fontSize: '12px', color: '#888888', textTransform: 'uppercase' }}>Category: {match.category}</span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#888888' }}>
                  <span>{match.court} | {match.scheduled_time}</span>
                </div>
              </div>

              {/* Edit & Reset Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '12px' }}>
                {match.status === 'completed' && (
                  <button onClick={() => resetMatchScore(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', textTransform: 'uppercase' }}>Reset</button>
                )}
                <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} style={{ background: '#1a1a1a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>{editingId === match.id ? 'Close' : 'Edit'}</button>
              </div>

              {/* Edit Form */}
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
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Player/s Name (Editable)</label>
                    <input defaultValue={match.game_type} onBlur={(e) => updateMatchDetails(match.id, 'game_type', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Category</label>
                    <select defaultValue={match.category || 'Doubles'} onChange={(e) => updateMatchDetails(match.id, 'category', e.target.value)} style={{ width: '100%', padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}>
                      <option value="Singles">Singles</option>
                      <option value="Doubles">Doubles</option>
                      <option value="Men's Singles">Men's Singles</option>
                      <option value="Men's Doubles">Men's Doubles</option>
                      <option value="Women's Singles">Women's Singles</option>
                      <option value="Women's Doubles">Women's Doubles</option>
                      <option value="Mixed Doubles">Mixed Doubles</option>
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

              {/* Scoring */}
              {match.team1_id && match.status !== 'completed' && (
                <div style={{ background: '#0a0a0a', padding: '20px', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '12px' }}>{match.team1?.name}</p>
                      <input type="number" id={`t1-${match.id}`} placeholder="0" defaultValue={match.team1_score || 0} style={{ width: '100px', padding: '12px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', borderRadius: '4px' }} />
                    </div>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#C9A959' }}>VS</span>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ fontSize: '14px', color: '#ffffff', fontWeight: '600', marginBottom: '12px' }}>{match.team2?.name}</p>
                      <input type="number" id={`t2-${match.id}`} placeholder="0" defaultValue={match.team2_score || 0} style={{ width: '100px', padding: '12px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', fontSize: '24px', fontWeight: 'bold', textAlign: 'center', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button onClick={() => { const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value); const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value); if(!isNaN(s1) && !isNaN(s2)) updateLiveScore(match.id, s1, s2); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', flex: 1 }}>Update Live Score</button>
                    <button onClick={() => { const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value); const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value); if(!isNaN(s1) && !isNaN(s2)) completeMatch(match.id, s1, s2, match.team1_id, match.team2_id); }} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase', fontSize: '12px', flex: 1 }}>Complete Match</button>
                  </div>
                </div>
              )}
              
              {match.status === 'completed' && (
                <div style={{ textAlign: 'center', padding: '20px', background: '#0a0a0a', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
                  <div style={{ color: '#C9A959', fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>COMPLETED</div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>{match.team1_score} - {match.team2_score}</div>
                  <div style={{ color: '#22c55e', fontSize: '14px' }}>Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
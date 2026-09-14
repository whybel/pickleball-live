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
  const [currentCompId, setCurrentCompId] = useState<string>("");
  
  const [showTeamName, setShowTeamName] = useState(true);
  const [showPlayerName, setShowPlayerName] = useState(true);

  const [newMatchType, setNewMatchType] = useState<'group' | 'knockout'>('knockout');
  const [newMatchRound, setNewMatchRound] = useState("Semi-Final");
  const [newMatchCategory, setNewMatchCategory] = useState("Doubles");
  const [newMatchCourt, setNewMatchCourt] = useState("Court 1");
  const [newMatchTime, setNewMatchTime] = useState("4:30 PM");

  // Dynamic categories for knockout generation
  const categories = ["Singles", "Doubles", "Men's Singles", "Men's Doubles", "Women's Singles", "Women's Doubles", "Mixed Doubles"];
  const [selectedKnockoutCategories, setSelectedKnockoutCategories] = useState<string[]>(["Singles", "Doubles"]);
  const knockoutRounds = ["R128", "R64", "R32", "R16", "Quarter-Final", "Semi-Final", "Final"];

  useEffect(() => {
    if (isAuthenticated) fetchCompetitions();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentCompId) fetchData();
  }, [isAuthenticated, currentCompId]);

  const fetchCompetitions = async () => {
    const { data } = await supabase.from("competitions").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      const activeComp = data.find((c: any) => c.status === 'active') || data[0];
      setCurrentCompId(activeComp.id);
      setShowTeamName(activeComp.show_team_name !== false);
      setShowPlayerName(activeComp.show_player_name !== false);
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

  const recalculateStandings = async () => {
    if (isRecalculating) return;
    setIsRecalculating(true);
    await supabase.rpc('recalculate_standings', { p_competition_id: currentCompId });
    setIsRecalculating(false);
  };

  const updateMatch = async (id: string, field: string, value: any) => {
    await supabase.from("matches").update({ [field]: value }).eq("id", id);
    fetchData();
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Delete this match?")) return;
    await supabase.from("matches").delete().eq("id", id);
    fetchData();
  };

  const resetMatchScore = async (matchId: string) => {
    if (!confirm("Reset this match score? Standings will be recalculated.")) return;
    await supabase.from("matches").update({ team1_score: 0, team2_score: 0, winner_id: null, status: "upcoming" }).eq("id", matchId);
    await recalculateStandings();
    fetchData();
  };

  const saveDisplaySettings = async () => {
    await supabase.from("competitions").update({ show_team_name: showTeamName, show_player_name: showPlayerName }).eq("id", currentCompId);
    alert("Live display settings saved!");
  };

  const addMatch = async () => {
    const isKnockout = newMatchType === 'knockout';
    const maxMatchNum = matches.length > 0 ? Math.max(...matches.map(m => m.match_number)) : 0;
    
    const { error } = await supabase.from("matches").insert([{
      competition_id: currentCompId, match_number: maxMatchNum + 1, is_knockout: isKnockout,
      knockout_round: isKnockout ? newMatchRound : null, round: isKnockout ? newMatchRound : 'Round 1',
      category: newMatchCategory, court: newMatchCourt, scheduled_time: newMatchTime,
      game_type: 'TBD', status: 'upcoming', team1_score: 0, team2_score: 0, team1_players: '', team2_players: ''
    }]);
    if (error) alert("Error adding match: " + error.message);
    else fetchData();
  };

  const generateKnockoutStage = async () => {
    if (selectedKnockoutCategories.length === 0) return alert("Please select at least one category.");
    if (!confirm(`This will create Knockout Matches (2 SF, 1 Final) for: ${selectedKnockoutCategories.join(', ')}. Continue?`)) return;
    
    const maxMatchNum = matches.length > 0 ? Math.max(...matches.map(m => m.match_number)) : 0;
    let currentNum = maxMatchNum + 1;
    const newMatches = [];
    
    for (const cat of selectedKnockoutCategories) {
      newMatches.push({ competition_id: currentCompId, match_number: currentNum++, is_knockout: true, knockout_round: 'Semi-Final', round: 'Semi-Final', category: cat, court: 'TBD', scheduled_time: 'TBD', game_type: 'TBD', status: 'upcoming', team1_score: 0, team2_score: 0, team1_players: '', team2_players: '' });
      newMatches.push({ competition_id: currentCompId, match_number: currentNum++, is_knockout: true, knockout_round: 'Semi-Final', round: 'Semi-Final', category: cat, court: 'TBD', scheduled_time: 'TBD', game_type: 'TBD', status: 'upcoming', team1_score: 0, team2_score: 0, team1_players: '', team2_players: '' });
      newMatches.push({ competition_id: currentCompId, match_number: currentNum++, is_knockout: true, knockout_round: 'Final', round: 'Final', category: cat, court: 'TBD', scheduled_time: 'TBD', game_type: 'TBD', status: 'upcoming', team1_score: 0, team2_score: 0, team1_players: '', team2_players: '' });
    }
    const { error } = await supabase.from("matches").insert(newMatches);
    if (error) alert("Error generating: " + error.message);
    else fetchData();
  };

  const completeMatch = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    const winner = t1 > t2 ? t1Id : t2Id;
    await supabase.from("matches").update({ team1_score: t1, team2_score: t2, winner_id: winner, status: "completed" }).eq("id", matchId);
    if (!matches.find(m => m.id === matchId)?.is_knockout) await recalculateStandings();
    fetchData();
  };

  const groupMatches = matches.filter(m => !m.is_knockout);
  const knockoutMatches = matches.filter(m => m.is_knockout);

  // Helper component for Team Selection with Custom Override
  const TeamSelect = ({ matchId, teamId, customName, teamNum, teamsList }: any) => {
    const isCustom = teamId === 'custom' || customName;
    return (
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Team {teamNum}</label>
        <select 
          value={teamId || (customName ? 'custom' : '')} 
          onChange={(e) => {
            if (e.target.value === 'custom') {
              updateMatch(matchId, `team${teamNum}_id`, null);
            } else {
              updateMatch(matchId, `team${teamNum}_id`, e.target.value || null);
              updateMatch(matchId, `team${teamNum}_custom_name`, '');
            }
          }} 
          style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', marginBottom: isCustom ? '8px' : '0' }}
        >
          <option value="">Select Team</option>
          {teamsList.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          <option value="custom">-- Type Custom Name (e.g. Group A Winner) --</option>
        </select>
        {isCustom && (
          <input 
            value={customName || ''} 
            onChange={(e) => updateMatch(matchId, `team${teamNum}_custom_name`, e.target.value)} 
            placeholder="Enter custom name..." 
            style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #C9A959', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} 
          />
        )}
      </div>
    );
  };

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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>TOURNAMENT MANAGER</h1>
        <button onClick={() => setIsAuthenticated(false)} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>Logout</button>
      </div>

      <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Live Screen Display Settings</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', cursor: 'pointer' }}>
            <input type="checkbox" checked={showTeamName} onChange={(e) => setShowTeamName(e.target.checked)} style={{ width: '18px', height: '18px' }} /> Show Team Name
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPlayerName} onChange={(e) => setShowPlayerName(e.target.checked)} style={{ width: '18px', height: '18px' }} /> Show Player/s Name
          </label>
          <button onClick={saveDisplaySettings} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save Settings</button>
        </div>
      </div>

      <div style={{ background: '#111111', border: '1px solid #C9A959', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Knockout Stage Manager</h2>
        
        {/* Dynamic Category Selection */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#888888', fontSize: '12px', textTransform: 'uppercase' }}>Categories to Generate:</span>
          {categories.map(cat => (
            <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ffffff', cursor: 'pointer', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={selectedKnockoutCategories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedKnockoutCategories([...selectedKnockoutCategories, cat]);
                  else setSelectedKnockoutCategories(selectedKnockoutCategories.filter(c => c !== cat));
                }}
                style={{ width: '14px', height: '14px' }}
              />
              {cat}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={generateKnockoutStage} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Auto-Generate SF & Finals</button>
        </div>
        
        <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
          <h3 style={{ fontSize: '14px', color: '#ffffff', marginTop: 0, marginBottom: '12px' }}>Add Custom Match</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <select value={newMatchType} onChange={(e) => setNewMatchType(e.target.value as any)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              <option value="group">Group Stage</option>
              <option value="knockout">Knockout</option>
            </select>
            {newMatchType === 'knockout' && (
              <select value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                {knockoutRounds.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <select value={newMatchCategory} onChange={(e) => setNewMatchCategory(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Court" value={newMatchCourt} onChange={(e) => setNewMatchCourt(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
            <input placeholder="Time" value={newMatchTime} onChange={(e) => setNewMatchTime(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
            <button onClick={addMatch} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Add Match</button>
          </div>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>Group Stage Matches ({groupMatches.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groupMatches.map((match: any) => (
            <div key={match.id} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#C9A959', fontWeight: 'bold' }}>Match #{match.match_number} ({match.category})</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>{editingId === match.id ? 'CLOSE EDIT' : 'EDIT'}</button>
                  {match.status === 'completed' && <button onClick={() => resetMatchScore(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>RESET</button>}
                  <button onClick={() => deleteMatch(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>DELETE</button>
                </div>
              </div>

              {editingId === match.id && (
                <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Time</label>
                    <input defaultValue={match.scheduled_time} onBlur={(e) => updateMatch(match.id, 'scheduled_time', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Court</label>
                    <input defaultValue={match.court} onBlur={(e) => updateMatch(match.id, 'court', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Category</label>
                    <select defaultValue={match.category} onChange={(e) => updateMatch(match.id, 'category', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <TeamSelect matchId={match.id} teamId={match.team1_id} customName={match.team1_custom_name} teamNum={1} teamsList={teams} />
                  <TeamSelect matchId={match.id} teamId={match.team2_id} customName={match.team2_custom_name} teamNum={2} teamsList={teams} />
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Player/s Name (Team 1)</label>
                    <input defaultValue={match.team1_players || ''} onBlur={(e) => updateMatch(match.id, 'team1_players', e.target.value)} placeholder="e.g. Doubles 1" style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Player/s Name (Team 2)</label>
                    <input defaultValue={match.team2_players || ''} onBlur={(e) => updateMatch(match.id, 'team2_players', e.target.value)} placeholder="e.g. Doubles 2" style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}

              {match.status !== 'completed' && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '16px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team1_custom_name || match.team1?.name || 'TBD'}</div>
                    <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team1_players || '-'}</div>
                    <input type="number" id={`t1-${match.id}`} defaultValue={match.team1_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                  </div>
                  <span style={{ color: '#888888', fontWeight: 'bold' }}>VS</span>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team2_custom_name || match.team2?.name || 'TBD'}</div>
                    <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team2_players || '-'}</div>
                    <input type="number" id={`t2-${match.id}`} defaultValue={match.team2_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                  </div>
                  <button onClick={() => { const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value); const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value); if(!isNaN(s1) && !isNaN(s2)) completeMatch(match.id, s1, s2, match.team1_id, match.team2_id); }} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Complete</button>
                </div>
              )}
              {match.status === 'completed' && <div style={{ color: '#22c55e', fontSize: '14px', marginTop: '12px', textAlign: 'center' }}>Completed: {match.team1_score} - {match.team2_score} | Winner: {match.winner_id === match.team1_id ? (match.team1_custom_name || match.team1?.name) : (match.team2_custom_name || match.team2?.name)}</div>}
            </div>
          ))}
        </div>
      </div>

      {knockoutMatches.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#C9A959', marginBottom: '16px' }}>Knockout Stage ({knockoutMatches.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {knockoutMatches.map((match: any) => (
              <div key={match.id} style={{ background: '#111111', border: '1px solid #C9A959', borderRadius: '4px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{match.knockout_round || match.round} - Match #{match.match_number} ({match.category})</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>{editingId === match.id ? 'CLOSE' : 'EDIT'}</button>
                    {match.status === 'completed' && <button onClick={() => resetMatchScore(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>RESET</button>}
                    <button onClick={() => deleteMatch(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>DELETE</button>
                  </div>
                </div>

                {editingId === match.id && (
                  <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <TeamSelect matchId={match.id} teamId={match.team1_id} customName={match.team1_custom_name} teamNum={1} teamsList={teams} />
                    <TeamSelect matchId={match.id} teamId={match.team2_id} customName={match.team2_custom_name} teamNum={2} teamsList={teams} />
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Player/s (Team 1)</label>
                      <input defaultValue={match.team1_players || ''} onBlur={(e) => updateMatch(match.id, 'team1_players', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Player/s (Team 2)</label>
                      <input defaultValue={match.team2_players || ''} onBlur={(e) => updateMatch(match.id, 'team2_players', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Court</label>
                      <input defaultValue={match.court} onBlur={(e) => updateMatch(match.id, 'court', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Round</label>
                      <select defaultValue={match.knockout_round || 'Semi-Final'} onChange={(e) => updateMatch(match.id, 'knockout_round', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                        {knockoutRounds.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {match.status !== 'completed' && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '16px' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team1_custom_name || match.team1?.name || 'TBD'}</div>
                      <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team1_players || '-'}</div>
                      <input type="number" id={`t1-${match.id}`} defaultValue={match.team1_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                    </div>
                    <span style={{ color: '#888888', fontWeight: 'bold' }}>VS</span>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team2_custom_name || match.team2?.name || 'TBD'}</div>
                      <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team2_players || '-'}</div>
                      <input type="number" id={`t2-${match.id}`} defaultValue={match.team2_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                    </div>
                    <button onClick={() => { const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value); const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value); if(!isNaN(s1) && !isNaN(s2)) completeMatch(match.id, s1, s2, match.team1_id, match.team2_id); }} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Complete</button>
                  </div>
                )}
                {match.status === 'completed' && <div style={{ color: '#22c55e', fontSize: '14px', marginTop: '12px', textAlign: 'center' }}>Completed: {match.team1_score} - {match.team2_score} | Winner: {match.winner_id === match.team1_id ? (match.team1_custom_name || match.team1?.name) : (match.team2_custom_name || match.team2?.name)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
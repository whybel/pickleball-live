"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    const { data: m } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").order("match_number");
    const { data: t } = await supabase.from("teams").select("*").order("name");
    setMatches(m || []);
    setTeams(t || []);
  };

  const handleLogin = () => {
    if (passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) setIsAuthenticated(true);
    else alert("Incorrect passcode.");
  };

  const updateScore = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    const winner = t1 > t2 ? t1Id : t2Id;
    await supabase.from("matches").update({ team1_score: t1, team2_score: t2, winner_id: winner, status: "completed" }).eq("id", matchId);
    fetchData();
  };

  const updateMatchDetails = async (id: string, field: string, value: any) => {
    await supabase.from("matches").update({ [field]: value }).eq("id", id);
    fetchData();
  };

  if (!isAuthenticated) {
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '20px'}}>
        <h1 style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '30px', color: '#fbbf24'}}>Admin Access</h1>
        <input 
          type="password" 
          placeholder="Enter Passcode" 
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{padding: '15px', fontSize: '1rem', border: '1px solid #334155', borderRadius: '8px', background: '#1e293b', color: 'white', width: '100%', maxWidth: '300px', marginBottom: '20px'}}
        />
        <button onClick={handleLogin} style={{background: '#fbbf24', color: '#0f172a', border: 'none', padding: '15px 40px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer'}}>
          Unlock Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{maxWidth: '800px', margin: '0 auto', padding: '20px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #334155', paddingBottom: '20px'}}>
        <h1 style={{fontSize: '1.8rem', fontWeight: 'bold', color: '#fbbf24', margin: 0}}>Scorekeeper Dashboard</h1>
        <button onClick={() => setIsAuthenticated(false)} style={{background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem'}}>Logout</button>
      </div>
      
      {matches.map((match: any) => (
        <div key={match.id} className="match-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
            <h3 style={{margin: 0, color: 'white'}}>Match #{match.match_number} <span style={{color: '#64748b', fontWeight: 'normal'}}>({match.game_type})</span></h3>
            <button 
              onClick={() => setEditingId(editingId === match.id ? null : match.id)} 
              style={{background: '#334155', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem'}}
            >
              {editingId === match.id ? 'Close' : 'Edit'}
            </button>
          </div>

          {editingId === match.id && (
            <div style={{background: '#0f172a', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #334155'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px'}}>
                <div>
                  <label style={{display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px'}}>Time</label>
                  <input defaultValue={match.scheduled_time} onBlur={(e) => updateMatchDetails(match.id, 'scheduled_time', e.target.value)} style={{width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px'}} />
                </div>
                <div>
                  <label style={{display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px'}}>Court</label>
                  <input defaultValue={match.court} onBlur={(e) => updateMatchDetails(match.id, 'court', e.target.value)} style={{width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px'}} />
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                <div>
                  <label style={{display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px'}}>Team 1</label>
                  <select defaultValue={match.team1_id} onChange={(e) => updateMatchDetails(match.id, 'team1_id', e.target.value)} style={{width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px'}}>
                    <option value="">Select Team</option>
                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '5px'}}>Team 2</label>
                  <select defaultValue={match.team2_id} onChange={(e) => updateMatchDetails(match.id, 'team2_id', e.target.value)} style={{width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px'}}>
                    <option value="">Select Team</option>
                    {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {match.team1_id && match.status !== 'completed' && (
            <div style={{background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #334155'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
                <div style={{flex: 1, textAlign: 'center'}}>
                  <p style={{fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px'}}>{match.team1?.name}</p>
                  <input type="number" id={`t1-${match.id}`} placeholder="0" style={{width: '80px', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', borderRadius: '6px'}} />
                </div>
                <span style={{color: '#64748b', fontWeight: 'bold'}}>VS</span>
                <div style={{flex: 1, textAlign: 'center'}}>
                  <p style={{fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px'}}>{match.team2?.name}</p>
                  <input type="number" id={`t2-${match.id}`} placeholder="0" style={{width: '80px', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', borderRadius: '6px'}} />
                </div>
                <button 
                  onClick={() => {
                    const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value);
                    const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value);
                    if(!isNaN(s1) && !isNaN(s2)) updateScore(match.id, s1, s2, match.team1_id, match.team2_id);
                  }}
                  style={{background: '#22c55e', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'}}
                >Save</button>
              </div>
            </div>
          )}
          {match.status === 'completed' && (
            <div style={{textAlign: 'center', padding: '10px', background: '#0f172a', borderRadius: '6px', color: '#22c55e', fontWeight: 'bold', marginTop: '10px'}}>
              Completed: {match.team1_score} - {match.team2_score}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [competitionName, setCompetitionName] = useState("PickleballLive Tournament");
  const [competitionType, setCompetitionType] = useState("Tournament");

  const categories = [
    "Men's Singles",
    "Men's Doubles",
    "Women's Singles",
    "Women's Doubles",
    "Mixed Doubles",
    "Gender Neutral Doubles"
  ];

  useEffect(() => {
    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

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
    if (settings) {
      setCompetitionName(settings.competition_name);
      setCompetitionType(settings.competition_type);
    }
  };

  const handleLogin = () => {
    if (passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect passcode.");
    }
  };

  const updateScore = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    const winner = t1 > t2 ? t1Id : t2Id;
    await supabase
      .from("matches")
      .update({ 
        team1_score: t1, 
        team2_score: t2, 
        winner_id: winner, 
        status: "completed" 
      })
      .eq("id", matchId);
    fetchData();
  };

  const updateMatchDetails = async (id: string, field: string, value: any) => {
    await supabase.from("matches").update({ [field]: value }).eq("id", id);
    fetchData();
  };

  const updateCompetitionSettings = async () => {
    await supabase
      .from("competition_settings")
      .update({ competition_name: competitionName, competition_type: competitionType })
      .eq("id", 1);
    alert("Settings updated!");
    fetchData();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold text-white mb-8">ADMIN ACCESS</h1>
        <input 
          type="password" 
          placeholder="Enter Passcode" 
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)} 
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="input-field p-4 rounded w-full max-w-sm mb-6 text-center text-lg"
        />
        <button 
          onClick={handleLogin} 
          className="btn-primary px-8 py-3 rounded text-sm uppercase tracking-wider"
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-[#1a1a1a] pb-6">
        <h1 className="text-2xl font-bold text-white">SCOREKEEPER DASHBOARD</h1>
        <button 
          onClick={() => setIsAuthenticated(false)} 
          className="text-xs text-red-400 hover:text-red-300 uppercase tracking-wider"
        >
          Logout
        </button>
      </div>

      {/* Competition Settings */}
      <div className="card p-6">
        <h2 className="text-sm font-bold text-[#C9A959] uppercase tracking-wider mb-4">
          Competition Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-[#888] mb-2">Competition Name</label>
            <input 
              type="text"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
              className="input-field w-full p-3 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-[#888] mb-2">Type</label>
            <select 
              value={competitionType}
              onChange={(e) => setCompetitionType(e.target.value)}
              className="input-field w-full p-3 rounded text-sm"
            >
              <option value="Friendly">Friendly Match</option>
              <option value="Tournament">Tournament</option>
            </select>
          </div>
        </div>
        <button 
          onClick={updateCompetitionSettings}
          className="btn-primary px-6 py-2 rounded text-xs uppercase tracking-wider"
        >
          Save Settings
        </button>
      </div>
      
      {/* Matches */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-[#C9A959] uppercase tracking-wider">
          Manage Matches
        </h2>
        
        {matches.map((match: any) => (
          <div key={match.id} className="card p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">
                Match #{match.match_number}
                <span className="text-[#888] font-normal ml-2">({match.game_type})</span>
              </h3>
              <button 
                onClick={() => setEditingId(editingId === match.id ? null : match.id)} 
                className="btn-secondary px-4 py-2 rounded text-xs uppercase tracking-wider"
              >
                {editingId === match.id ? 'Close' : 'Edit'}
              </button>
            </div>

            {editingId === match.id && (
              <div className="bg-[#0a0a0a] p-4 rounded mb-4 space-y-4 border border-[#1a1a1a]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#888] mb-2">Time</label>
                    <input 
                      defaultValue={match.scheduled_time} 
                      onBlur={(e) => updateMatchDetails(match.id, 'scheduled_time', e.target.value)} 
                      className="input-field w-full p-2 rounded text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-2">Court</label>
                    <input 
                      defaultValue={match.court} 
                      onBlur={(e) => updateMatchDetails(match.id, 'court', e.target.value)} 
                      className="input-field w-full p-2 rounded text-sm" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-[#888] mb-2">Category</label>
                  <select 
                    defaultValue={match.category || 'Mixed Doubles'}
                    onChange={(e) => updateMatchDetails(match.id, 'category', e.target.value)}
                    className="input-field w-full p-2 rounded text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[#888] mb-2">Team 1</label>
                    <select 
                      defaultValue={match.team1_id} 
                      onChange={(e) => updateMatchDetails(match.id, 'team1_id', e.target.value)} 
                      className="input-field w-full p-2 rounded text-sm"
                    >
                      <option value="">Select Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[#888] mb-2">Team 2</label>
                    <select 
                      defaultValue={match.team2_id} 
                      onChange={(e) => updateMatchDetails(match.id, 'team2_id', e.target.value)} 
                      className="input-field w-full p-2 rounded text-sm"
                    >
                      <option value="">Select Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {match.team1_id && match.status !== 'completed' && (
              <div className="bg-[#0a0a0a] p-4 rounded border border-[#1a1a1a]">
                <div className="flex items-center gap-6">
                  <div className="flex-1 text-center">
                    <p className="text-xs text-[#888] mb-3">{match.team1?.name}</p>
                    <input 
                      type="number" 
                      id={`t1-${match.id}`} 
                      placeholder="0" 
                      className="input-field w-20 p-3 rounded text-2xl font-bold text-center mx-auto block" 
                    />
                  </div>
                  <span className="text-[#888] font-bold text-xl">VS</span>
                  <div className="flex-1 text-center">
                    <p className="text-xs text-[#888] mb-3">{match.team2?.name}</p>
                    <input 
                      type="number" 
                      id={`t2-${match.id}`} 
                      placeholder="0" 
                      className="input-field w-20 p-3 rounded text-2xl font-bold text-center mx-auto block" 
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value);
                      const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value);
                      if(!isNaN(s1) && !isNaN(s2)) {
                        updateScore(match.id, s1, s2, match.team1_id, match.team2_id);
                      }
                    }}
                    className="btn-primary px-6 py-3 rounded text-xs uppercase tracking-wider"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            
            {match.status === 'completed' && (
              <div className="text-center py-3 bg-[#0a0a0a] rounded border border-[#1a1a1a] text-[#C9A959] font-medium">
                Completed: {match.team1_score} - {match.team2_score}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
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
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <h1 className="text-3xl font-bold text-white">Admin Access</h1>
        <input 
          type="password" placeholder="Enter Passcode" value={passcode}
          onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="bg-slate-800 border border-slate-700 text-white p-4 rounded-lg w-72 text-center focus:ring-2 focus:ring-amber-500 outline-none"
        />
        <button onClick={handleLogin} className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 py-3 rounded-lg transition">Unlock</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Scorekeeper Dashboard</h1>
        <button onClick={() => setIsAuthenticated(false)} className="text-sm text-red-400 hover:text-red-300">Logout</button>
      </div>
      
      {/* Matches List with Edit Capabilities */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-amber-400">Manage Matches</h2>
        {matches.map((match: any) => (
          <div key={match.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-white">Match #{match.match_number} <span className="text-slate-500 font-normal">({match.game_type})</span></span>
              <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded">
                {editingId === match.id ? 'Close' : 'Edit Details'}
              </button>
            </div>

            {/* Edit Mode */}
            {editingId === match.id && (
              <div className="bg-slate-800/50 p-3 rounded-lg mb-4 space-y-3 border border-slate-700">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Time</label>
                    <input defaultValue={match.scheduled_time} onBlur={(e) => updateMatchDetails(match.id, 'scheduled_time', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Court</label>
                    <input defaultValue={match.court} onBlur={(e) => updateMatchDetails(match.id, 'court', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Team 1</label>
                    <select defaultValue={match.team1_id} onChange={(e) => updateMatchDetails(match.id, 'team1_id', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-sm">
                      <option value="">Select Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Team 2</label>
                    <select defaultValue={match.team2_id} onChange={(e) => updateMatchDetails(match.id, 'team2_id', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-sm">
                      <option value="">Select Team</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Scoring Mode */}
            {match.team1_id && match.status !== 'completed' && (
              <div className="flex gap-3 items-center bg-slate-800/30 p-3 rounded-lg">
                <div className="flex-1 text-center">
                  <p className="text-xs text-slate-400 mb-1">{match.team1?.name}</p>
                  <input type="number" id={`t1-${match.id}`} placeholder="0" className="w-16 bg-slate-900 border border-slate-700 text-white text-2xl font-bold p-2 rounded text-center mx-auto block" />
                </div>
                <span className="text-slate-600 font-bold">VS</span>
                <div className="flex-1 text-center">
                  <p className="text-xs text-slate-400 mb-1">{match.team2?.name}</p>
                  <input type="number" id={`t2-${match.id}`} placeholder="0" className="w-16 bg-slate-900 border border-slate-700 text-white text-2xl font-bold p-2 rounded text-center mx-auto block" />
                </div>
                <button 
                  onClick={() => {
                    const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value);
                    const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value);
                    if(!isNaN(s1) && !isNaN(s2)) updateScore(match.id, s1, s2, match.team1_id, match.team2_id);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded font-bold transition"
                >Save</button>
              </div>
            )}
            {match.status === 'completed' && <div className="text-center text-emerald-400 text-sm font-bold mt-2">Completed: {match.team1_score} - {match.team2_score}</div>}
          </div>
        ))}
      </section>
    </div>
  );
}
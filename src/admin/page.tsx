"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    const { data: m } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").order("match_number");
    const { data: t } = await supabase.from("teams").select("*");
    setMatches(m || []);
    setTeams(t || []);
  };

  const handleLogin = () => {
    if (passcode === process.env.AIWM2024) {
      setIsAuthenticated(true);
    } else {
      alert("Incorrect passcode. Please try again.");
    }
  };

  const updateScore = async (matchId: string, team1Score: number, team2Score: number, team1Id: string, team2Id: string) => {
    const winner = team1Score > team2Score ? team1Id : team2Id;
    
    const { error } = await supabase.from("matches").update({
      team1_score: team1Score,
      team2_score: team2Score,
      winner_id: winner,
      status: "completed"
    }).eq("id", matchId);

    if (error) {
      alert("Error saving score: " + error.message);
    } else {
      fetchData(); 
    }
  };

  const assignTeam = async (matchId: string, teamSlot: 'team1_id' | 'team2_id', teamId: string) => {
    const { error } = await supabase.from("matches").update({ [teamSlot]: teamId }).eq("id", matchId);
    if (error) alert("Error assigning team");
    else fetchData();
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-blue-900 mb-2">Admin Scorer Login</h1>
          <p className="text-gray-500 text-sm">Enter the tournament passcode to update scores.</p>
        </div>
        <input 
          type="password" 
          placeholder="Enter Passcode" 
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="border border-gray-300 p-3 rounded-lg w-64 text-center focus:ring-2 focus:ring-blue-900 focus:outline-none"
        />
        <button onClick={handleLogin} className="bg-blue-900 hover:bg-blue-800 text-white px-8 py-3 rounded-lg font-bold transition">
          Unlock Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-900">Scorekeeper Dashboard</h1>
        <button onClick={() => setIsAuthenticated(false)} className="text-sm text-red-600 hover:underline">Logout</button>
      </div>
      
      <section className="bg-amber-50 p-4 rounded-xl border border-amber-200">
        <h2 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
          🏆 Assign Knockout Teams (TBD)
        </h2>
        <p className="text-sm text-amber-700 mb-4">Select the winning teams from the dropdowns to populate the Semi-Finals and Finals.</p>
        <div className="space-y-4">
          {matches.filter((m: any) => m.is_knockout && !m.team1_id).map((match: any) => (
            <div key={match.id} className="bg-white p-4 rounded-lg shadow-sm border border-amber-100">
              <p className="text-sm font-bold text-gray-700 mb-2">Match {match.match_number} ({match.game_type} - {match.knockout_round})</p>
              <div className="flex gap-3">
                <select onChange={(e) => assignTeam(match.id, 'team1_id', e.target.value)} className="border border-gray-300 p-2 rounded flex-1 text-sm">
                  <option value="">Select Team 1</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <span className="self-center font-bold text-gray-400">VS</span>
                <select onChange={(e) => assignTeam(match.id, 'team2_id', e.target.value)} className="border border-gray-300 p-2 rounded flex-1 text-sm">
                  <option value="">Select Team 2</option>
                  {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-blue-900 mb-3">Enter Match Scores</h2>
        <div className="space-y-3">
          {matches.filter((m: any) => m.team1_id && m.status !== 'completed').map((match: any) => (
            <div key={match.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <p className="text-sm font-bold text-gray-500 mb-3">Match {match.match_number}: {match.team1.name} vs {match.team2.name}</p>
              <div className="flex gap-3 items-center">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">{match.team1.name}</label>
                  <input type="number" id={`t1-${match.id}`} placeholder="0" className="border border-gray-300 p-2 rounded w-full text-center font-bold text-lg" />
                </div>
                <span className="font-bold text-gray-400 pt-5">-</span>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">{match.team2.name}</label>
                  <input type="number" id={`t2-${match.id}`} placeholder="0" className="border border-gray-300 p-2 rounded w-full text-center font-bold text-lg" />
                </div>
                <button 
                  onClick={() => {
                    const s1 = parseInt((document.getElementById(`t1-${match.id}`) as HTMLInputElement).value);
                    const s2 = parseInt((document.getElementById(`t2-${match.id}`) as HTMLInputElement).value);
                    if(!isNaN(s1) && !isNaN(s2)) {
                      updateScore(match.id, s1, s2, match.team1_id, match.team2_id);
                    } else {
                      alert("Please enter valid numbers for both scores.");
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-bold mt-5 transition"
                >
                  Save
                </button>
              </div>
            </div>
          ))}
          {matches.filter((m: any) => m.team1_id && m.status !== 'completed').length === 0 && (
            <p className="text-gray-500 text-center py-8">All matches are completed! </p>
          )}
        </div>
      </section>
    </div>
  );
}
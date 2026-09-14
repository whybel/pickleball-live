"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("All Teams");
  const [loading, setLoading] = useState(true);

  // 1. Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      const { data: m } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").order("match_number");
      const { data: t } = await supabase.from("teams").select("*").order("name");
      setMatches(m || []);
      setTeams(t || []);
      setLoading(false);
    };
    fetchData();

    // 2. REALTIME SUBSCRIPTION (The Magic)
    const channel = supabase
      .channel("public:matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (payload) => {
        setMatches((currentMatches) => {
          if (payload.eventType === "INSERT") {
            return [...currentMatches, payload.new];
          } else if (payload.eventType === "UPDATE") {
            return currentMatches.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m));
          } else if (payload.eventType === "DELETE") {
            return currentMatches.filter((m) => m.id !== payload.old.id);
          }
          return currentMatches;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filter matches based on "Follow Team"
  const filteredMatches = selectedTeam === "All Teams" 
    ? matches 
    : matches.filter(m => m.team1?.name === selectedTeam || m.team2?.name === selectedTeam);

  if (loading) return <div className="text-center py-20 text-amber-400 animate-pulse">Loading Live Scores...</div>;

  return (
    <div className="space-y-8">
      {/* Follow Team Filter */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-lg">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Follow Your Team</label>
        <select 
          value={selectedTeam} 
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          <option value="All Teams">Show All Matches</option>
          {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
      </div>

      {/* Live Matches Section */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span> 
          Live & Upcoming Matches
        </h2>
        <div className="space-y-4">
          {filteredMatches.map((match: any) => (
            <div key={match.id} className={`bg-slate-900 p-5 rounded-xl border ${match.status === 'live' ? 'border-amber-500/50 shadow-amber-500/10 shadow-lg' : 'border-slate-800'} transition-all`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{match.court} • {match.scheduled_time}</span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">{match.game_type}</span>
              </div>
              
              <div className="flex justify-between items-center">
                {/* Team 1 */}
                <div className="flex-1">
                  <p className={`font-bold text-lg ${match.winner_id === match.team1_id ? 'text-amber-400' : 'text-slate-200'}`}>
                    {match.team1?.name || 'TBD'}
                  </p>
                </div>
                
                {/* Score */}
                <div className="px-6 text-center">
                  {match.status === 'completed' ? (
                    <div className="text-4xl font-black text-white tracking-tighter">
                      {match.team1_score} - {match.team2_score}
                    </div>
                  ) : match.status === 'live' ? (
                    <div className="text-4xl font-black text-amber-400 tracking-tighter animate-pulse">
                      {match.team1_score} - {match.team2_score}
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-slate-500 bg-slate-800 px-4 py-1 rounded">VS</div>
                  )}
                </div>

                {/* Team 2 */}
                <div className="flex-1 text-right">
                  <p className={`font-bold text-lg ${match.winner_id === match.team2_id ? 'text-amber-400' : 'text-slate-200'}`}>
                    {match.team2?.name || 'TBD'}
                  </p>
                </div>
              </div>

              {match.status === 'completed' && (
                <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                    Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                  </span>
                </div>
              )}
            </div>
          ))}
          {filteredMatches.length === 0 && (
            <p className="text-center text-slate-500 py-10">No matches found for this team.</p>
          )}
        </div>
      </section>
    </div>
  );
}
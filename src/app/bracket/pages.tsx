"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BracketPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: m } = await supabase
      .from("matches")
      .select("*, team1:team1_id(name), team2:team2_id(name)")
      .eq("is_knockout", true)
      .order("match_number");
    
    setKnockoutMatches(m || []);
  };

  const semifinals = knockoutMatches.filter((m) => m.round === 'Semi-Final');
  const finals = knockoutMatches.filter((m) => m.round === 'Final');

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">KNOCKOUT BRACKET</h1>
        <p className="text-[#888] text-sm">Elimination Stage</p>
      </div>

      {/* Semi-Finals */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-[#C9A959] mb-6 uppercase tracking-wider">
          Semi-Finals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {semifinals.map((match: any) => (
            <div key={match.id} className="bg-[#0a0a0a] p-4 rounded border border-[#1a1a1a]">
              <div className="text-xs text-[#888] mb-3 uppercase">{match.knockout_round} • {match.game_type}</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`team-name ${match.winner_id === match.team1_id ? 'winner' : ''}`}>
                    {match.team1?.name || 'TBD'}
                  </span>
                  <span className="text-[#C9A959] font-bold">
                    {match.status === 'completed' ? match.team1_score : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`team-name ${match.winner_id === match.team2_id ? 'winner' : ''}`}>
                    {match.team2?.name || 'TBD'}
                  </span>
                  <span className="text-[#C9A959] font-bold">
                    {match.status === 'completed' ? match.team2_score : '-'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Finals */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-[#C9A959] mb-6 uppercase tracking-wider">
          Finals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {finals.map((match: any) => (
            <div key={match.id} className="bg-[#0a0a0a] p-4 rounded border border-[#1a1a1a]">
              <div className="text-xs text-[#888] mb-3 uppercase text-center">{match.game_type}</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`team-name ${match.winner_id === match.team1_id ? 'winner' : ''}`}>
                    {match.team1?.name || 'TBD'}
                  </span>
                  <span className="text-[#C9A959] font-bold text-lg">
                    {match.status === 'completed' ? match.team1_score : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`team-name ${match.winner_id === match.team2_id ? 'winner' : ''}`}>
                    {match.team2?.name || 'TBD'}
                  </span>
                  <span className="text-[#C9A959] font-bold text-lg">
                    {match.status === 'completed' ? match.team2_score : '-'}
                  </span>
                </div>
                {match.status === 'completed' && (
                  <div className="mt-3 pt-3 border-t border-[#1a1a1a] text-center text-[#C9A959] text-xs uppercase tracking-wider">
                    Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
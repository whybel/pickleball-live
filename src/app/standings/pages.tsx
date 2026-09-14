"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StandingsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [competitionId, setCompetitionId] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Get active competition
    const { data: comp } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .single();
    
    if (comp) {
      setCompetitionId(comp.id);
      
      // Get standings grouped by group
      const { data: standings } = await supabase
        .from("group_standings")
        .select("*, team:team_id(name)")
        .eq("competition_id", comp.id)
        .order("group", { ascending: true })
        .order("rank", { ascending: true });

      // Group by group letter
      const grouped = (standings || []).reduce((acc: any, item: any) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
      }, {});

      setGroups(grouped);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">GROUP STANDINGS</h1>
        <p className="text-[#888] text-sm">Round Robin Stage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(groups).map((group) => (
          <div key={group} className="card p-6">
            <h2 className="text-lg font-bold text-[#C9A959] mb-4 uppercase tracking-wider">
              Group {group}
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-12 text-xs text-[#888] uppercase tracking-wider pb-2 border-b border-[#1a1a1a]">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Team</div>
                <div className="col-span-2 text-center">W</div>
                <div className="col-span-2 text-center">L</div>
                <div className="col-span-2 text-center">Rank</div>
              </div>
              {groups[group].map((team: any, index: number) => (
                <div key={team.id} className="grid grid-cols-12 text-sm py-2 items-center">
                  <div className="col-span-1 text-[#888]">{index + 1}</div>
                  <div className="col-span-5 font-medium text-white">{team.team?.name}</div>
                  <div className="col-span-2 text-center text-white">{team.wins}</div>
                  <div className="col-span-2 text-center text-white">{team.losses}</div>
                  <div className="col-span-2 text-center">
                    <span className="badge px-2 py-1 rounded">{team.rank || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groups).length === 0 && (
        <div className="text-center py-12 text-[#888]">
          No standings available yet
        </div>
      )}
    </div>
  );
}
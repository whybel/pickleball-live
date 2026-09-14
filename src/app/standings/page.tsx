"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StandingsPage() {
  // Fixed: Changed type from any[] to Record<string, any[]> to fix TypeScript error
  const [groups, setGroups] = useState<Record<string, any[]>>({});
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
      const grouped: Record<string, any[]> = (standings || []).reduce((acc: any, item: any) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
      }, {});

      setGroups(grouped);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>GROUP STANDINGS</h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>Round Robin Stage</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {Object.keys(groups).map((group) => (
          <div key={group} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 0 }}>
              Group {group}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 5fr 1fr 1fr 1fr', fontSize: '12px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', paddingBottom: '8px', borderBottom: '1px solid #1a1a1a' }}>
                <div>#</div>
                <div>Team</div>
                <div style={{ textAlign: 'center' }}>W</div>
                <div style={{ textAlign: 'center' }}>L</div>
                <div style={{ textAlign: 'center' }}>Rank</div>
              </div>
              {groups[group].map((team: any, index: number) => (
                <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '1fr 5fr 1fr 1fr 1fr', fontSize: '14px', padding: '8px 0', alignItems: 'center' }}>
                  <div style={{ color: '#888888' }}>{index + 1}</div>
                  <div style={{ fontWeight: '500', color: '#ffffff' }}>{team.team?.name}</div>
                  <div style={{ textAlign: 'center', color: '#ffffff' }}>{team.wins}</div>
                  <div style={{ textAlign: 'center', color: '#ffffff' }}>{team.losses}</div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ background: '#1a1a1a', color: '#C9A959', fontSize: '12px', fontWeight: '600', padding: '4px 8px', borderRadius: '4px' }}>
                      {team.rank || '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groups).length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>
          No standings available yet
        </div>
      )}
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StandingsPage() {
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel("public:group_standings")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_standings" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    const { data: comp } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .single();
    
    if (comp) {
      const { data: standings } = await supabase
        .from("group_standings")
        .select("*, team:team_id(name)")
        .eq("competition_id", comp.id)
        .order("group", { ascending: true })
        .order("wins", { ascending: false }) // Sort by wins descending
        .order("rank", { ascending: true });

      const grouped: Record<string, any[]> = (standings || []).reduce((acc: any, item: any) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
      }, {});

      // Sort each group by wins (descending) then by rank
      Object.keys(grouped).forEach(group => {
        grouped[group].sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins; // Higher wins first
          return (a.rank || 999) - (b.rank || 999); // Then by rank
        });
      });

      setGroups(grouped);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>Loading standings...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>GROUP STANDINGS</h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>Round Robin Stage</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {Object.keys(groups).sort().map((group) => (
          <div key={group} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(201, 169, 89, 0.15)', padding: '16px 20px', borderBottom: '2px solid #C9A959' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#C9A959', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                GROUP {group}
              </h2>
            </div>
            <div style={{ padding: '0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px 60px 60px', fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '1px', padding: '12px 20px', borderBottom: '1px solid #1a1a1a', background: '#0a0a0a' }}>
                <div>RANK</div>
                <div>TEAM</div>
                <div style={{ textAlign: 'center' }}>MP</div>
                <div style={{ textAlign: 'center' }}>W</div>
                <div style={{ textAlign: 'center' }}>L</div>
              </div>
              {groups[group].map((team: any, index: number) => (
                <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px 60px 60px', fontSize: '13px', padding: '14px 20px', borderBottom: '1px solid #1a1a1a', alignItems: 'center', background: index === 0 ? 'rgba(201, 169, 89, 0.05)' : 'transparent' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ 
                      background: index === 0 ? '#C9A959' : '#1a1a1a', 
                      color: index === 0 ? '#0a0a0a' : '#C9A959', 
                      fontSize: '12px', 
                      fontWeight: '700', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      minWidth: '32px', 
                      display: 'inline-block' 
                    }}>
                      {index + 1}
                    </span>
                  </div>
                  <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '14px' }}>{team.team?.name}</div>
                  <div style={{ textAlign: 'center', color: '#888888', fontWeight: '500' }}>{team.matches_played || 0}</div>
                  <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: '700' }}>{team.wins || 0}</div>
                  <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: '700' }}>{team.losses || 0}</div>
                </div>
              ))}
              {groups[group].length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: '#888888', fontSize: '13px' }}>
                  No teams yet
                </div>
              )}
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
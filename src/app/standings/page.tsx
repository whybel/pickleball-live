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
        .eq("competition_id", comp.id);

      const grouped: Record<string, any[]> = (standings || []).reduce((acc: any, item: any) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
      }, {});

      // Sort: 1. Wins (Desc), 2. Point Diff (Desc), 3. Points For (Desc)
      Object.keys(grouped).forEach(group => {
        grouped[group].sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          const aDiff = (a.points_for || 0) - (a.points_against || 0);
          const bDiff = (b.points_for || 0) - (b.points_against || 0);
          if (bDiff !== aDiff) return bDiff - aDiff;
          return (b.points_for || 0) - (a.points_for || 0);
        });
      });

      setGroups(grouped);
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#C9A959' }}>Loading standings...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>GROUP STANDINGS</h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>Tiebreakers: Wins → Point Diff → Points For</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {Object.keys(groups).sort().map((group) => (
          <div key={group} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(201, 169, 89, 0.15)', padding: '12px 16px', borderBottom: '2px solid #C9A959' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                GROUP {group}
              </h2>
            </div>
            
            {/* Scrollable Table for Mobile */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: '380px' }}>
                {/* Table Header */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '30px 1.2fr 30px 30px 30px 35px 35px 35px', 
                  padding: '10px 12px', 
                  fontSize: '10px', 
                  color: '#888888', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px', 
                  borderBottom: '1px solid #1a1a1a', 
                  background: '#0a0a0a',
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'center' }}>#</div>
                  <div>Team</div>
                  <div style={{ textAlign: 'center' }}>MP</div>
                  <div style={{ textAlign: 'center' }}>W</div>
                  <div style={{ textAlign: 'center' }}>L</div>
                  <div style={{ textAlign: 'center' }}>F</div>
                  <div style={{ textAlign: 'center' }}>A</div>
                  <div style={{ textAlign: 'center' }}>Diff</div>
                </div>

                {/* Table Rows */}
                {groups[group].map((team: any, index: number) => {
                  const diff = (team.points_for || 0) - (team.points_against || 0);
                  return (
                    <div key={team.id} style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '30px 1.2fr 30px 30px 30px 35px 35px 35px', 
                      padding: '12px', 
                      fontSize: '12px',
                      borderBottom: '1px solid #1a1a1a',
                      alignItems: 'center',
                      background: index === 0 ? 'rgba(201, 169, 89, 0.05)' : 'transparent'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ 
                          background: index === 0 ? '#C9A959' : '#1a1a1a', 
                          color: index === 0 ? '#0a0a0a' : '#C9A959', 
                          fontSize: '10px', 
                          fontWeight: '700', 
                          padding: '2px 6px', 
                          borderRadius: '3px', 
                          display: 'inline-block' 
                        }}>
                          {index + 1}
                        </span>
                      </div>
                      <div style={{ fontWeight: '600', color: '#ffffff', fontSize: '12px', wordBreak: 'break-word' }}>{team.team?.name}</div>
                      <div style={{ textAlign: 'center', color: '#888888' }}>{team.matches_played || 0}</div>
                      <div style={{ textAlign: 'center', color: '#22c55e', fontWeight: '600' }}>{team.wins || 0}</div>
                      <div style={{ textAlign: 'center', color: '#ef4444', fontWeight: '600' }}>{team.losses || 0}</div>
                      <div style={{ textAlign: 'center', color: '#ffffff' }}>{team.points_for || 0}</div>
                      <div style={{ textAlign: 'center', color: '#ffffff' }}>{team.points_against || 0}</div>
                      <div style={{ textAlign: 'center', color: diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : '#888888', fontWeight: '600' }}>
                        {diff > 0 ? `+${diff}` : diff}
                      </div>
                    </div>
                  );
                })}
                {groups[group].length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#888888', fontSize: '12px' }}>
                    No teams yet
                  </div>
                )}
              </div>
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
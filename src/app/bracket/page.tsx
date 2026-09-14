"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BracketPage() {
  const [knockoutMatches, setKnockoutMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").eq("is_knockout", true).order("match_number");
      setKnockoutMatches(data || []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase.channel("public:matches").on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#C9A959' }}>Loading Bracket...</div>;

  const rounds = ["R128", "R64", "R32", "R16", "Quarter-Final", "Semi-Final", "Final"];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ borderBottom: '1px solid #1a1a1a', paddingBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', margin: '0 0 8px 0' }}>KNOCKOUT BRACKET</h1>
        <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>Elimination Stage</p>
      </div>

      {rounds.map((round) => {
        const roundMatches = knockoutMatches.filter(m => m.knockout_round === round || m.round === round);
        if (roundMatches.length === 0) return null;

        return (
          <div key={round} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '20px', textTransform: 'uppercase' }}>{round}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              {roundMatches.map((match: any) => (
                <div key={match.id} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#888888', marginBottom: '12px' }}>Match #{match.match_number} • {match.court}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>{match.team1?.name || 'TBD'}</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.status === 'completed' ? match.team1_score : '-'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>{match.team2?.name || 'TBD'}</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.status === 'completed' ? match.team2_score : '-'}</span>
                  </div>
                  {match.status === 'completed' && (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #1a1a1a', textAlign: 'center', fontSize: '11px', color: '#22c55e', textTransform: 'uppercase' }}>
                      Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {knockoutMatches.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>Knockout stage has not been set up yet.</div>
      )}
    </div>
  );
}
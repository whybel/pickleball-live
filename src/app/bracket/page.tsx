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

  // Group matches by round
  const rounds = ["R128", "R64", "R32", "R16", "Quarter-Final", "Semi-Final", "Final"];
  const matchesByRound: any = {};
  
  rounds.forEach(round => {
    matchesByRound[round] = knockoutMatches.filter(m => m.knockout_round === round || m.round === round);
  });

  const hasMatches = Object.values(matchesByRound).some((roundMatches: any) => roundMatches.length > 0);

  if (!hasMatches) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>KNOCKOUT BRACKET</h1>
        <p>Knockout stage has not been set up yet.</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>Go to Admin to generate knockout matches.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: '#888888', textAlign: 'center', marginBottom: '32px' }}>Elimination Stage</p>
      
      {/* Bracket Container - Horizontal Scroll for Mobile */}
      <div style={{ overflowX: 'auto', paddingBottom: '24px' }}>
        <div style={{ minWidth: '800px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          
          {rounds.map((round) => {
            const roundMatches = matchesByRound[round];
            if (!roundMatches || roundMatches.length === 0) return null;

            return (
              <div key={round} style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ 
                  background: 'rgba(201, 169, 89, 0.15)', 
                  padding: '12px 16px', 
                  borderBottom: '2px solid #C9A959', 
                  textAlign: 'center',
                  marginBottom: '16px',
                  borderRadius: '4px 4px 0 0'
                }}>
                  <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {round}
                  </h2>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {roundMatches.map((match: any, index: number) => (
                    <div key={match.id} style={{ 
                      background: '#111111', 
                      border: match.status === 'completed' ? '2px solid #C9A959' : '1px solid #1a1a1a', 
                      borderRadius: '4px', 
                      padding: '16px',
                      position: 'relative'
                    }}>
                      {/* Match Number */}
                      <div style={{ fontSize: '10px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Match #{match.match_number}
                      </div>
                      
                      {/* Team 1 */}
                      <div style={{ 
                        padding: '8px 12px', 
                        background: match.winner_id === match.team1_id ? 'rgba(201, 169, 89, 0.2)' : 'transparent',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        border: match.winner_id === match.team1_id ? '1px solid #C9A959' : 'none'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                          {match.team1_custom_name || match.team1?.name || 'TBD'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right' }}>
                            {match.team1_score}
                          </div>
                        )}
                      </div>
                      
                      {/* Team 2 */}
                      <div style={{ 
                        padding: '8px 12px', 
                        background: match.winner_id === match.team2_id ? 'rgba(201, 169, 89, 0.2)' : 'transparent',
                        borderRadius: '4px',
                        border: match.winner_id === match.team2_id ? '1px solid #C9A959' : 'none'
                      }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                          {match.team2_custom_name || match.team2?.name || 'TBD'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right' }}>
                            {match.team2_score}
                          </div>
                        )}
                      </div>
                      
                      {match.status === 'completed' && match.knockout_round === 'Final' && (
                        <div style={{ 
                          marginTop: '12px', 
                          textAlign: 'center', 
                          padding: '8px', 
                          background: 'rgba(201, 169, 89, 0.2)', 
                          borderRadius: '4px',
                          border: '1px solid #C9A959'
                        }}>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}></div>
                          <div style={{ fontSize: '11px', color: '#C9A959', textTransform: 'uppercase', fontWeight: 'bold' }}>CHAMPION</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
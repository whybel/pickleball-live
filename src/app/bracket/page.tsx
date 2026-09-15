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
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        .bracket-container {
          display: flex;
          gap: 60px;
          align-items: center;
          overflow-x: auto;
          padding: 40px 20px;
        }
        .round-column {
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          gap: 20px;
          min-width: 240px;
          position: relative;
        }
        .match-box {
          background: #111111;
          border: 1px solid #1a1a1a;
          border-radius: 4px;
          padding: 12px;
          position: relative;
          z-index: 2;
        }
        /* Horizontal line to the right */
        .match-box::after {
          content: '';
          position: absolute;
          right: -30px;
          top: 50%;
          width: 30px;
          height: 2px;
          background: #334155;
          z-index: 1;
        }
        /* Hide line for the final round */
        .round-column:last-child .match-box::after {
          display: none;
        }
        /* Vertical connector for even matches (top half of a pair) */
        .match-box.connector-down::before {
          content: '';
          position: absolute;
          right: -30px;
          top: 50%;
          width: 2px;
          height: 50%; /* Connects down to the next match */
          background: #334155;
          z-index: 1;
        }
        /* Vertical connector for odd matches (bottom half of a pair) */
        .match-box.connector-up::before {
          content: '';
          position: absolute;
          right: -30px;
          bottom: 50%;
          width: 2px;
          height: 50%; /* Connects up to the previous match */
          background: #334155;
          z-index: 1;
        }
        .semi-final-box {
          border: 2px solid #C9A959;
          padding: 16px;
          border-radius: 8px;
          background: rgba(201, 169, 89, 0.05);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>

      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: '#888888', textAlign: 'center', marginBottom: '32px' }}>Elimination Stage</p>
      
      <div className="bracket-container">
        {rounds.map((round) => {
          const roundMatches = matchesByRound[round];
          if (!roundMatches || roundMatches.length === 0) return null;

          const isSemiFinal = round === 'Semi-Final';
          
          return (
            <div key={round} className="round-column">
              <div style={{ 
                background: 'rgba(201, 169, 89, 0.15)', 
                padding: '10px 16px', 
                borderBottom: '2px solid #C9A959', 
                textAlign: 'center',
                marginBottom: '20px',
                borderRadius: '4px 4px 0 0'
              }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {round}
                </h2>
              </div>
              
              {isSemiFinal ? (
                <div className="semi-final-box">
                  {roundMatches.map((match: any, index: number) => (
                    <div key={match.id} className="match-box" style={{ border: '1px solid #C9A959' }}>
                      <div style={{ fontSize: '11px', color: '#C9A959', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Semi-Final {index + 1} • Match #{match.match_number}
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                          {match.team1_custom_name || match.team1?.name || 'TBD'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
                          {match.team1_players || '-'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right', marginTop: '4px' }}>
                            {match.team1_score}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                          {match.team2_custom_name || match.team2?.name || 'TBD'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
                          {match.team2_players || '-'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right', marginTop: '4px' }}>
                            {match.team2_score}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                roundMatches.map((match: any, index: number) => {
                  // Add connector classes for visual branching
                  const isEven = index % 2 === 0;
                  const connectorClass = isEven ? 'connector-down' : 'connector-up';
                  
                  return (
                    <div key={match.id} className={`match-box ${connectorClass}`}>
                      <div style={{ fontSize: '10px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Match #{match.match_number}
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                          {match.team1_custom_name || match.team1?.name || 'TBD'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
                          {match.team1_players || '-'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right', marginTop: '4px' }}>
                            {match.team1_score}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                          {match.team2_custom_name || match.team2?.name || 'TBD'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
                          {match.team2_players || '-'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right', marginTop: '4px' }}>
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
                          <div style={{ fontSize: '11px', color: '#C9A959', textTransform: 'uppercase', fontWeight: 'bold' }}> CHAMPION</div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
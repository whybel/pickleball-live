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

    const channel = supabase
      .channel("public:knockout_matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#C9A959' }}>Loading Bracket...</div>;

  // Group matches by round and category
  const rounds = ["Semi-Final", "Final"];
  const categories = ["Doubles", "Singles"];
  
  const getMatchupWinner = (matchups: any[]) => {
    // Count wins for each team across all games in the matchup
    const team1Wins = matchups.filter(m => m.status === 'completed' && m.winner_id === m.team1_id).length;
    const team2Wins = matchups.filter(m => m.status === 'completed' && m.winner_id === m.team2_id).length;
    
    if (team1Wins >= 2) return matchups[0]?.team1_id;
    if (team2Wins >= 2) return matchups[0]?.team2_id;
    return null;
  };

  const getTeamName = (match: any, teamId: string) => {
    if (teamId === match.team1_id) return match.team1_custom_name || match.team1?.name || 'TBD';
    if (teamId === match.team2_id) return match.team2_custom_name || match.team2?.name || 'TBD';
    return 'TBD';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: '#888888', textAlign: 'center', marginBottom: '40px' }}>Elimination Stage</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
        {rounds.map((round) => (
          <div key={round} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '24px', textAlign: 'center', textTransform: 'uppercase' }}>{round}</h2>
            
            {categories.map((category) => {
              const categoryMatches = knockoutMatches.filter(
                m => m.knockout_round === round && m.category === category
              );
              
              if (categoryMatches.length === 0) return null;
              
              // Group by matchup (SF1 or SF2)
              const matchupKey = round === 'Semi-Final' ? 
                (categoryMatches[0]?.match_number <= 57 ? 'SF1' : 'SF2') : 'Final';
              
              const matchupWinnerId = getMatchupWinner(categoryMatches);
              
              return (
                <div key={`${round}-${category}`} style={{ marginBottom: '24px', border: '2px solid #C9A959', borderRadius: '8px', padding: '16px', background: 'rgba(201, 169, 89, 0.05)' }}>
                  <h3 style={{ color: '#C9A959', fontSize: '14px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>
                    {matchupKey} - {category}
                  </h3>
                  
                  {categoryMatches.map((match: any) => (
                    <div key={match.id} style={{ 
                      background: '#0a0a0a', 
                      border: '1px solid #1a1a1a', 
                      borderRadius: '4px', 
                      padding: '12px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ fontSize: '11px', color: '#888888', marginBottom: '8px' }}>
                        Match #{match.match_number} • {match.court}
                      </div>
                      
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                          {match.team1_custom_name || match.team1?.name || 'TBD'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right' }}>
                            {match.team1_score}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                          {match.team2_custom_name || match.team2?.name || 'TBD'}
                        </div>
                        {match.status === 'completed' && (
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff', textAlign: 'right' }}>
                            {match.team2_score}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Show winner only after at least 2 games are won */}
                  {matchupWinnerId && (
                    <div style={{ 
                      marginTop: '16px', 
                      padding: '12px', 
                      background: 'rgba(201, 169, 89, 0.2)', 
                      borderRadius: '4px', 
                      textAlign: 'center',
                      border: '1px solid #C9A959'
                    }}>
                      <div style={{ fontSize: '12px', color: '#C9A959', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>
                        Winner
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                        {getTeamName(categoryMatches[0], matchupWinnerId)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
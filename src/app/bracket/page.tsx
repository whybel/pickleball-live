"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BracketPage() {
  const [knockoutMatches, setKnockoutMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").eq("is_knockout", true).order("match_number");
    setKnockoutMatches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("public:bracket_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        console.log('Bracket: Match changed, refetching...');
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '48px', color: '#C9A959' }}>Loading Bracket...</div>;

  const getTeamName = (match: any, teamId: string | null) => {
    if (!teamId) return 'TBD';
    if (teamId === match.team1_id) return match.team1_custom_name?.trim() || match.team1?.name || 'TBD';
    if (teamId === match.team2_id) return match.team2_custom_name?.trim() || match.team2?.name || 'TBD';
    return 'TBD';
  };

  const rounds = ["Semi-Final", "Final"];
  const categories = ["Doubles", "Singles"];
  
  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: '#888888', textAlign: 'center', marginBottom: '40px' }}>Elimination Stage</p>
      
      <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {rounds.map((round) => {
          const roundMatches = knockoutMatches.filter(m => m.knockout_round === round);
          if (roundMatches.length === 0) return null;

          return (
            <div key={round} style={{ flex: 1, minWidth: '300px', maxWidth: '500px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#C9A959', textAlign: 'center', marginBottom: '24px', textTransform: 'uppercase', borderBottom: '2px solid #C9A959', paddingBottom: '10px' }}>
                {round}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {categories.map((category) => {
                  // Filter matches by round AND category
                  const categoryMatches = roundMatches.filter(m => m.category === category);
                  if (categoryMatches.length === 0) return null;

                  // For Semi-Finals: Group by SF1/SF2 (based on match number ranges)
                  // For Finals: Each match is its own box (Doubles 1, Doubles 2, Singles)
                  const isFinal = round === 'Final';
                  
                  if (isFinal) {
                    // Finals: Each match gets its own box labeled by game_type
                    return categoryMatches.map((match) => {
                      const t1Name = getTeamName(match, match.team1_id);
                      const t2Name = getTeamName(match, match.team2_id);
                      const winnerName = match.winner_id === match.team1_id ? t1Name : match.winner_id === match.team2_id ? t2Name : null;

                      return (
                        <div key={match.id} style={{ border: '2px solid #C9A959', borderRadius: '8px', padding: '16px', background: 'rgba(201, 169, 89, 0.05)' }}>
                          <h3 style={{ color: '#C9A959', fontSize: '14px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>
                            {match.game_type} - Match #{match.match_number}
                          </h3>
                          
                          <div style={{ 
                            background: '#0a0a0a', 
                            border: '1px solid #1a1a1a', 
                            borderRadius: '4px', 
                            padding: '12px',
                            marginBottom: '8px'
                          }}>
                            <div style={{ fontSize: '10px', color: '#888888', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{match.court}</span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                                {t1Name}
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                                {match.status === 'completed' ? match.team1_score : '-'}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                                {t2Name}
                              </span>
                              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                                {match.status === 'completed' ? match.team2_score : '-'}
                              </span>
                            </div>
                          </div>
                          
                          {winnerName && (
                            <div style={{ 
                              marginTop: '12px', 
                              padding: '10px', 
                              background: '#C9A959', 
                              borderRadius: '4px', 
                              textAlign: 'center',
                              color: '#0a0a0a',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              textTransform: 'uppercase'
                            }}>
                              Winner: {winnerName}
                            </div>
                          )}
                        </div>
                      );
                    });
                  } else {
                    // Semi-Finals: Group by SF1/SF2
                    const sf1Matches = categoryMatches.filter(m => m.round === 'SF1' || m.match_number <= (category === 'Doubles' ? 57 : 59));
                    const sf2Matches = categoryMatches.filter(m => m.round === 'SF2' || m.match_number > (category === 'Doubles' ? 57 : 59));
                    
                    const matchups = [
                      { label: 'SF1', matches: sf1Matches },
                      { label: 'SF2', matches: sf2Matches }
                    ].filter(m => m.matches.length > 0);

                    return matchups.map((matchup, idx) => {
                      const t1Id = matchup.matches[0]?.team1_id;
                      const t2Id = matchup.matches[0]?.team2_id;
                      
                      const t1Wins = matchup.matches.filter(m => m.status === 'completed' && m.winner_id === t1Id).length;
                      const t2Wins = matchup.matches.filter(m => m.status === 'completed' && m.winner_id === t2Id).length;
                      
                      let winnerName = null;
                      if (t1Wins >= 2) winnerName = getTeamName(matchup.matches[0], t1Id);
                      else if (t2Wins >= 2) winnerName = getTeamName(matchup.matches[0], t2Id);

                      return (
                        <div key={`${round}-${category}-${idx}`} style={{ border: '2px solid #C9A959', borderRadius: '8px', padding: '16px', background: 'rgba(201, 169, 89, 0.05)' }}>
                          <h3 style={{ color: '#C9A959', fontSize: '14px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>
                            {matchup.label} - {category}
                          </h3>
                          
                          {matchup.matches.map((match: any) => (
                            <div key={match.id} style={{ 
                              background: '#0a0a0a', 
                              border: '1px solid #1a1a1a', 
                              borderRadius: '4px', 
                              padding: '12px',
                              marginBottom: '8px'
                            }}>
                              <div style={{ fontSize: '10px', color: '#888888', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Match #{match.match_number}</span>
                                <span>{match.court} • {match.game_type}</span>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team1_id ? '#C9A959' : '#ffffff' }}>
                                  {getTeamName(match, match.team1_id)}
                                </span>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                                  {match.status === 'completed' ? match.team1_score : '-'}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: match.winner_id === match.team2_id ? '#C9A959' : '#ffffff' }}>
                                  {getTeamName(match, match.team2_id)}
                                </span>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                                  {match.status === 'completed' ? match.team2_score : '-'}
                                </span>
                              </div>
                            </div>
                          ))}
                          
                          {winnerName && (
                            <div style={{ 
                              marginTop: '12px', 
                              padding: '10px', 
                              background: '#C9A959', 
                              borderRadius: '4px', 
                              textAlign: 'center',
                              color: '#0a0a0a',
                              fontWeight: 'bold',
                              fontSize: '14px',
                              textTransform: 'uppercase'
                            }}>
                              Winner: {winnerName}
                            </div>
                          )}
                        </div>
                      );
                    });
                  }
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
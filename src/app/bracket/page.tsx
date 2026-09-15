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

  const rounds = ["R128", "R64", "R32", "R16", "Quarter-Final"];
  const matchesByRound: Record<string, any[]> = {};
  rounds.forEach(round => {
    matchesByRound[round] = knockoutMatches.filter((m: any) => m.knockout_round === round || m.round === round);
  });

  const allSfMatches = knockoutMatches
    .filter((m: any) => m.knockout_round === 'Semi-Final')
    .sort((a: any, b: any) => a.match_number - b.match_number);
  
  const midIndex = Math.ceil(allSfMatches.length / 2);
  const semiFinal1 = allSfMatches.slice(0, midIndex);
  const semiFinal2 = allSfMatches.slice(midIndex);
  const finalMatches = knockoutMatches.filter((m: any) => m.knockout_round === 'Final');

  if (knockoutMatches.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>KNOCKOUT BRACKET</h1>
        <p>Knockout stage has not been set up yet.</p>
      </div>
    );
  }

  // Helper to calculate the winner of a box (e.g., who won 2 out of 3 matches in the Semi)
  const getBoxWinner = (boxMatches: any[]) => {
    if (!boxMatches || boxMatches.length === 0) return null;
    let t1Wins = 0;
    let t2Wins = 0;
    const t1Name = boxMatches[0].team1_custom_name || boxMatches[0].team1?.name || 'TBD';
    const t2Name = boxMatches[0].team2_custom_name || boxMatches[0].team2?.name || 'TBD';
    const t1Id = boxMatches[0].team1_id;
    const t2Id = boxMatches[0].team2_id;

    boxMatches.forEach((m: any) => {
      if (m.status === 'completed') {
        if (m.winner_id === t1Id) t1Wins++;
        if (m.winner_id === t2Id) t2Wins++;
      }
    });

    if (t1Wins > t2Wins) return t1Name;
    if (t2Wins > t1Wins) return t2Name;
    return null;
  };

  const sf1Winner = getBoxWinner(semiFinal1);
  const sf2Winner = getBoxWinner(semiFinal2);
  const finalWinner = getBoxWinner(finalMatches);

  const renderMatchCard = (match: any, isGoldBorder = false) => (
    <div key={match.id} style={{ 
      background: '#111111', 
      border: isGoldBorder ? '2px solid #C9A959' : '1px solid #1a1a1a', 
      borderRadius: '4px', 
      padding: '12px',
      marginBottom: '12px'
    }}>
      <div style={{ fontSize: '10px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase' }}>
        Match #{match.match_number} • {match.category}
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
  );

  // Shared styles for consistent box sizing
  const boxStyle = { 
    border: '2px solid #C9A959', 
    borderRadius: '8px', 
    padding: '16px', 
    background: 'rgba(201, 169, 89, 0.05)', 
    minWidth: '280px',
    maxWidth: '320px'
  };

  const winnerLabelStyle = {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #C9A959',
    textAlign: 'center' as const,
    color: '#C9A959',
    fontWeight: 'bold',
    fontSize: '14px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px'
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{`
        @media (max-width: 768px) {
          .bracket-desktop { display: none !important; }
          .bracket-mobile { display: flex !important; }
        }
        @media (min-width: 769px) {
          .bracket-desktop { display: flex !important; }
          .bracket-mobile { display: none !important; }
        }
      `}</style>

      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: '#888888', textAlign: 'center', marginBottom: '40px' }}>Elimination Stage</p>
      
      {/* DESKTOP VIEW */}
      <div className="bracket-desktop" style={{ gap: '60px', alignItems: 'center', overflowX: 'auto', paddingBottom: '40px' }}>
        
        {/* Early Rounds */}
        {rounds.map((round) => {
          const roundMatches = matchesByRound[round];
          if (!roundMatches || roundMatches.length === 0) return null;
          return (
            <div key={round} style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: 'rgba(201, 169, 89, 0.15)', padding: '10px', textAlign: 'center', borderRadius: '4px 4px 0 0', borderBottom: '2px solid #C9A959' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', margin: 0, textTransform: 'uppercase' }}>{round}</h2>
              </div>
              {roundMatches.map((m: any) => renderMatchCard(m))}
            </div>
          );
        })}

        {/* Semi-Finals and Final */}
        {(semiFinal1.length > 0 || semiFinal2.length > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '60px', flex: 1 }}>
            
            {/* Semi-Final Boxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {semiFinal1.length > 0 && (
                <div style={boxStyle}>
                  <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>Semi-Final 1</h3>
                  {semiFinal1.map((m: any) => renderMatchCard(m, true))}
                  {sf1Winner && <div style={winnerLabelStyle}>Winner: {sf1Winner}</div>}
                </div>
              )}
              {semiFinal2.length > 0 && (
                <div style={boxStyle}>
                  <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>Semi-Final 2</h3>
                  {semiFinal2.map((m: any) => renderMatchCard(m, true))}
                  {sf2Winner && <div style={winnerLabelStyle}>Winner: {sf2Winner}</div>}
                </div>
              )}
            </div>

            {/* Final Box - Same size as Semis */}
            {finalMatches.length > 0 && (
              <div style={boxStyle}>
                <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>The Final</h3>
                {finalMatches.map((m: any) => renderMatchCard(m, true))}
                {finalWinner && (
                  <div style={{ ...winnerLabelStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                    <span>Champion: {finalWinner}</span> 
                    <span style={{ fontSize: '24px' }}>🏆</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE VIEW */}
      <div className="bracket-mobile" style={{ flexDirection: 'column', gap: '32px' }}>
        {rounds.map((round) => {
          const roundMatches = matchesByRound[round];
          if (!roundMatches || roundMatches.length === 0) return null;
          return (
            <div key={round} style={{ width: '100%' }}>
              <div style={{ background: 'rgba(201, 169, 89, 0.15)', padding: '10px', textAlign: 'center', borderRadius: '4px 4px 0 0', borderBottom: '2px solid #C9A959' }}>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A959', margin: 0, textTransform: 'uppercase' }}>{round}</h2>
              </div>
              {roundMatches.map((m: any) => renderMatchCard(m))}
            </div>
          );
        })}

        {semiFinal1.length > 0 && (
          <div style={{ ...boxStyle, width: '100%', maxWidth: '100%' }}>
            <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>Semi-Final 1</h3>
            {semiFinal1.map((m: any) => renderMatchCard(m, true))}
            {sf1Winner && <div style={winnerLabelStyle}>Winner: {sf1Winner}</div>}
          </div>
        )}

        {semiFinal2.length > 0 && (
          <div style={{ ...boxStyle, width: '100%', maxWidth: '100%' }}>
            <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>Semi-Final 2</h3>
            {semiFinal2.map((m: any) => renderMatchCard(m, true))}
            {sf2Winner && <div style={winnerLabelStyle}>Winner: {sf2Winner}</div>}
          </div>
        )}

        {finalMatches.length > 0 && (
          <div style={{ ...boxStyle, width: '100%', maxWidth: '100%' }}>
            <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>The Final</h3>
            {finalMatches.map((m: any) => renderMatchCard(m, true))}
            {finalWinner && (
              <div style={{ ...winnerLabelStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
                <span>Champion: {finalWinner}</span> 
                <span style={{ fontSize: '24px' }}>🏆</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
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

  // 1. Separate matches by round
  const rounds = ["R128", "R64", "R32", "R16", "Quarter-Final"];
  const matchesByRound: Record<string, any[]> = {};
  rounds.forEach(round => {
    matchesByRound[round] = knockoutMatches.filter((m: any) => m.knockout_round === round || m.round === round);
  });

  // 2. Special handling for Semi-Finals (Split into Box 1 and Box 2)
  const allSfMatches = knockoutMatches
    .filter((m: any) => m.knockout_round === 'Semi-Final')
    .sort((a: any, b: any) => a.match_number - b.match_number);
  
  const midIndex = Math.ceil(allSfMatches.length / 2);
  const semiFinal1 = allSfMatches.slice(0, midIndex);
  const semiFinal2 = allSfMatches.slice(midIndex);

  // 3. Final Matches
  const finalMatches = knockoutMatches.filter((m: any) => m.knockout_round === 'Final');

  const hasAnyMatches = knockoutMatches.length > 0;

  if (!hasAnyMatches) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#888888' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>KNOCKOUT BRACKET</h1>
        <p>Knockout stage has not been set up yet.</p>
      </div>
    );
  }

  // Helper to render a single match card
  const renderMatchCard = (match: any, isGoldBorder = false) => (
    <div key={match.id} style={{ 
      background: '#111111', 
      border: isGoldBorder ? '2px solid #C9A959' : '1px solid #1a1a1a', 
      borderRadius: '4px', 
      padding: '12px',
      marginBottom: '12px',
      position: 'relative'
    }}>
      <div style={{ fontSize: '10px', color: '#888888', marginBottom: '8px', textTransform: 'uppercase' }}>
        Match #{match.match_number} • {match.category}
      </div>
      
      {/* Team 1 */}
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
      
      {/* Team 2 */}
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

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px', textAlign: 'center' }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: '#888888', textAlign: 'center', marginBottom: '40px' }}>Elimination Stage</p>
      
      {/* Main Bracket Container - Increased gap to 80px */}
      <div style={{ display: 'flex', gap: '80px', alignItems: 'center', overflowX: 'auto', paddingBottom: '40px' }}>
        
        {/* Early Rounds (Quarters, etc.) */}
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

        {/* Semi-Finals Section (The Two Gold Boxes) */}
        {(semiFinal1.length > 0 || semiFinal2.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', minWidth: '280px', position: 'relative', paddingRight: '40px' }}>
            
            {/* Semi-Final 1 Box */}
            {semiFinal1.length > 0 && (
              <div style={{ border: '2px solid #C9A959', borderRadius: '8px', padding: '16px', background: 'rgba(201, 169, 89, 0.05)', position: 'relative' }}>
                <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>Semi-Final 1</h3>
                {semiFinal1.map((m: any) => renderMatchCard(m, true))}
                {/* Connector line to the right */}
                <div style={{ position: 'absolute', right: '-40px', top: '50%', width: '40px', height: '2px', background: '#C9A959' }}></div>
              </div>
            )}

            {/* Semi-Final 2 Box */}
            {semiFinal2.length > 0 && (
              <div style={{ border: '2px solid #C9A959', borderRadius: '8px', padding: '16px', background: 'rgba(201, 169, 89, 0.05)', position: 'relative' }}>
                <h3 style={{ color: '#C9A959', fontSize: '16px', fontWeight: 'bold', marginTop: 0, marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase' }}>Semi-Final 2</h3>
                {semiFinal2.map((m: any) => renderMatchCard(m, true))}
                {/* Connector line to the right */}
                <div style={{ position: 'absolute', right: '-40px', top: '50%', width: '40px', height: '2px', background: '#C9A959' }}></div>
              </div>
            )}

            {/* Vertical connector between SF1 and SF2 */}
            {semiFinal1.length > 0 && semiFinal2.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                right: '-40px', 
                top: `${100 / (semiFinal1.length + semiFinal2.length) * semiFinal1.length}%`, 
                height: `${100 / (semiFinal1.length + semiFinal2.length) * semiFinal2.length}%`, 
                width: '2px', 
                background: '#C9A959',
                transform: 'translateY(-50%)'
              }}></div>
            )}
          </div>
        )}

        {/* Final Section - With more spacing */}
        {finalMatches.length > 0 && (
          <div style={{ minWidth: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', paddingLeft: '20px' }}>
             {/* Gold Line connecting from Semis - longer and more visible */}
             <div style={{ 
               position: 'absolute', 
               left: '-60px', 
               top: '50%', 
               width: '60px', 
               height: '3px', 
               background: '#C9A959',
               boxShadow: '0 0 10px rgba(201, 169, 89, 0.5)'
             }}></div>

            <div style={{ border: '3px solid #C9A959', borderRadius: '8px', padding: '24px', background: 'rgba(201, 169, 89, 0.1)', width: '100%', boxShadow: '0 0 20px rgba(201, 169, 89, 0.3)' }}>
              <h3 style={{ color: '#C9A959', fontSize: '20px', fontWeight: 'bold', marginTop: 0, marginBottom: '20px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '2px' }}>The Final</h3>
              {finalMatches.map((m: any) => renderMatchCard(m, true))}
              
              {/* Champion Trophy Icon */}
              {finalMatches[0]?.status === 'completed' && (
                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '32px' }}>🏆</div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
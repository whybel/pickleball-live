"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const ROUND_ORDER = ["R128", "R64", "R32", "R16", "Quarter-Final", "Semi-Final", "Final"];
const GAME_ORDER: Record<string, number> = { "Doubles 1": 1, "Doubles 2": 2, "Singles": 3 };

export default function BracketPage() {
  const [koMatches, setKoMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase
      .from("matches")
      .select("*, team1:team1_id(name), team2:team2_id(name)")
      .eq("is_knockout", true)
      .order("match_number");
    setKoMatches(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("bracket-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData())
      .subscribe();
    const refreshChannel = supabase
      .channel("live-refresh")
      .on("broadcast", { event: "refresh" }, () => fetchData())
      .subscribe();
    const interval = setInterval(fetchData, 3000);
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(refreshChannel);
      clearInterval(interval);
    };
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: "48px", color: "#C9A959" }}>Loading Bracket...</div>;

  const teamName = (m: any, id: string | null) => {
    if (!id) return "TBD";
    if (id === m.team1_id) return m.team1_custom_name?.trim() || m.team1?.name || "TBD";
    if (id === m.team2_id) return m.team2_custom_name?.trim() || m.team2?.name || "TBD";
    return "TBD";
  };

  const nameForId = (games: any[], id: string) => {
    const g = games.find((x: any) => x.team1_id === id || x.team2_id === id);
    return g ? teamName(g, id) : "TBD";
  };

  const friendlyLabel = (slot: string, roundName: string) => {
    const sf = slot.match(/^SF(\d+)$/);
    if (sf) return `Semi-Final ${sf[1]}`;
    if (slot === "Final") return "Final";
    return slot || roundName;
  };

  // Group strictly by SLOT (SF1 / SF2 / Final)
  const byRound: Record<string, any[]> = {};
  koMatches.forEach((m) => {
    const r = m.knockout_round || "Final";
    (byRound[r] = byRound[r] || []).push(m);
  });

  const slots: { key: string; label: string; roundName: string; games: any[] }[] = [];

  Object.entries(byRound).forEach(([roundName, list]) => {
    list.sort((a, b) => a.match_number - b.match_number);
    const hasSlotCodes = list.some((m) => m.round && m.round !== roundName);
    if (hasSlotCodes) {
      const bySlot: Record<string, any[]> = {};
      list.forEach((m) => {
        const s = m.round && m.round !== roundName ? m.round : "X";
        (bySlot[s] = bySlot[s] || []).push(m);
      });
      Object.entries(bySlot).forEach(([slot, games]) => {
        slots.push({ key: roundName + "|" + slot, label: friendlyLabel(slot, roundName), roundName, games });
      });
    } else {
      let cur: any[] = [];
      const seen = new Set<string>();
      const chunks: any[][] = [];
      list.forEach((m) => {
        const gt = m.game_type || String(m.match_number);
        if (seen.has(gt)) {
          if (cur.length) chunks.push(cur);
          cur = [];
          seen.clear();
        }
        seen.add(gt);
        cur.push(m);
      });
      if (cur.length) chunks.push(cur);
      chunks.forEach((games, i) => {
        slots.push({ key: roundName + "|" + i, label: chunks.length > 1 ? `${roundName} ${i + 1}` : roundName, roundName, games });
      });
    }
  });

  slots.sort((a, b) => a.games[0].match_number - b.games[0].match_number);

  const roundsPresent = ROUND_ORDER.filter((r) => slots.some((s) => s.roundName === r));
  Object.keys(byRound).forEach((r) => {
    if (!roundsPresent.includes(r)) roundsPresent.push(r);
  });

  const renderTie = (tie: { key: string; label: string; roundName: string; games: any[] }) => {
    const games = tie.games
      .slice()
      .sort((a, b) => (GAME_ORDER[a.game_type] || 9) - (GAME_ORDER[b.game_type] || 9) || a.match_number - b.match_number);

    const ref = games.find((g) => g.team1_id && g.team2_id) || games[0];
    const n1 = teamName(ref, ref?.team1_id || null);
    const n2 = teamName(ref, ref?.team2_id || null);

    const completed = games.filter((g) => g.status === "completed");
    const isComplete = games.length > 0 && completed.length === games.length;

    // Count wins per team id (robust)
    const wins: Record<string, number> = {};
    completed.forEach((g) => {
      if (g.winner_id) wins[g.winner_id] = (wins[g.winner_id] || 0) + 1;
    });
    let winnerId: string | null = null;
    let best = 0;
    Object.entries(wins).forEach(([id, c]) => {
      if (c > best) { best = c; winnerId = id; }
    });
    const winnerName = isComplete && winnerId && best >= 2 ? nameForId(games, winnerId) : null;

    const isFinal = tie.roundName === "Final";

    return (
      <div key={tie.key} style={{ border: "2px solid #C9A959", borderRadius: 8, padding: 16, background: "rgba(201,169,89,0.05)", marginBottom: 24 }}>
        <h3 style={{ color: "#C9A959", fontSize: 14, fontWeight: "bold", margin: "0 0 6px 0", textAlign: "center", textTransform: "uppercase", letterSpacing: 1 }}>
          {tie.label}
        </h3>
        <div style={{ color: "#888888", fontSize: 11, textAlign: "center", marginBottom: 12 }}>{n1} vs {n2}</div>

        {games.map((g) => (
          <div key={g.id} style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 4, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: "#888888", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>{g.game_type} • Game #{g.match_number}</span>
              <span>{g.court}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: g.winner_id === g.team1_id ? "#C9A959" : "#ffffff" }}>{teamName(g, g.team1_id)}</span>
              <span style={{ fontSize: 16, fontWeight: "bold", color: "#ffffff" }}>{g.status === "completed" ? g.team1_score : "-"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: g.winner_id === g.team2_id ? "#C9A959" : "#ffffff" }}>{teamName(g, g.team2_id)}</span>
              <span style={{ fontSize: 16, fontWeight: "bold", color: "#ffffff" }}>{g.status === "completed" ? g.team2_score : "-"}</span>
            </div>
          </div>
        ))}

        {winnerName && (
          <div style={{ marginTop: 12, padding: 10, background: "#C9A959", borderRadius: 4, textAlign: "center", color: "#0a0a0a", fontWeight: "bold", fontSize: 14, textTransform: "uppercase" }}>
            {isFinal ? <span>🏆 Champion: {winnerName}</span> : <span>Winner: {winnerName}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 32, fontWeight: "bold", color: "#ffffff", marginBottom: 8, textAlign: "center" }}>KNOCKOUT BRACKET</h1>
      <p style={{ color: "#888888", textAlign: "center", marginBottom: 40 }}>Elimination Stage</p>

      {slots.length === 0 && (
        <div style={{ textAlign: "center", padding: 48, color: "#888888" }}>Knockout stage has not been set up yet.</div>
      )}

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
        {roundsPresent.map((r) => {
          const roundSlots = slots.filter((s) => s.roundName === r);
          if (roundSlots.length === 0) return null;
          return (
            <div key={r} style={{ flex: "1 1 320px", minWidth: 300, maxWidth: 520 }}>
              <h2 style={{ fontSize: 22, fontWeight: "bold", color: "#C9A959", textAlign: "center", marginBottom: 24, textTransform: "uppercase", borderBottom: "2px solid #C9A959", paddingBottom: 10 }}>
                {r}
              </h2>
              {roundSlots.map(renderTie)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
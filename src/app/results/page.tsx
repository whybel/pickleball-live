"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const GOLD = "#FFD700";
const SILVER = "#C0C0C0";
const BRONZE = "#CD7F32";

export default function ResultsPage() {
  const [comp, setComp] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: comps } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    const active = comps && comps[0] ? comps[0] : null;
    setComp(active);
    if (!active) { setRows([]); setBanner(null); setLoading(false); return; }

    const { data: m } = await supabase
      .from("matches")
      .select("*, team1:team1_id(name), team2:team2_id(name)")
      .eq("competition_id", active.id)
      .order("match_number");
    const games = m || [];

    const isFriendly =
      (active.format_type || "").toLowerCase() === "friendlyhead2head" ||
      (active.competition_type || "").toLowerCase() === "friendly";

    const nameOf = (g: any, id: string | null) => {
      if (!id) return "TBD";
      if (id === g.team1_id) return g.team1_custom_name?.trim() || g.team1?.name || "TBD";
      if (id === g.team2_id) return g.team2_custom_name?.trim() || g.team2?.name || "TBD";
      return "TBD";
    };

    // ---- Team metrics ----
    const metrics: Record<string, any> = {};
    const pctOf = (t: any) => {
      const gp = (t.gw || 0) + (t.gl || 0);
      return gp > 0 ? (t.gw || 0) / gp : 0;
    };
    const sortMetrics = (a: any, b: any) =>
      (b.wins - a.wins) || (pctOf(b) - pctOf(a)) || (b.diff - a.diff) || (b.pf - a.pf);

    let useStandings = false;
    if (!isFriendly) {
      const { data: st } = await supabase
        .from("group_standings")
        .select("*, team:team_id(name)")
        .eq("competition_id", active.id);
      if (st && st.length) {
        useStandings = true;
        st.forEach((s: any) => {
          metrics[s.team_id] = {
            id: s.team_id, name: s.team?.name || "TBD", wins: s.wins || 0,
            gw: s.games_won || 0, gl: s.games_lost || 0,
            diff: (s.points_for || 0) - (s.points_against || 0), pf: s.points_for || 0,
          };
        });
      }
    }
    if (!useStandings) {
      games.forEach((g: any) => {
        [[g.team1_id, g.team1_custom_name?.trim() || g.team1?.name], [g.team2_id, g.team2_custom_name?.trim() || g.team2?.name]]
          .forEach(([id, nm]: any) => {
            if (id && !metrics[id]) metrics[id] = { id, name: nm || "TBD", wins: 0, gw: 0, gl: 0, diff: 0, pf: 0 };
          });
      });
      games.forEach((g: any) => {
        if (g.status === "completed" && g.team1_id && g.team2_id && metrics[g.team1_id] && metrics[g.team2_id]) {
          const a = metrics[g.team1_id], b = metrics[g.team2_id];
          a.gw += 1; b.gl += 1; b.gw += 1; a.gl += 1;
          a.pf += g.team1_score || 0; b.pf += g.team2_score || 0;
          a.diff += (g.team1_score || 0) - (g.team2_score || 0);
          b.diff += (g.team2_score || 0) - (g.team1_score || 0);
          if (g.winner_id === g.team1_id) a.wins += 1;
          else if (g.winner_id === g.team2_id) b.wins += 1;
        }
      });
    }

    const nameOfById = (id: string | null) => {
      if (!id) return "TBD";
      const g = games.find((x: any) => x.team1_id === id || x.team2_id === id);
      return g ? nameOf(g, id) : (metrics[id]?.name || "TBD");
    };
    const metricLine = (t: any) =>
      `${t.wins}W • ${Math.round(pctOf(t) * 100)}% GW • ${t.diff > 0 ? "+" : ""}${t.diff} diff • ${t.pf} PF`;

    // ---- Knockout tie helper ----
    const slotKey = (g: any) => (g.round && g.round !== g.knockout_round ? g.round : g.knockout_round || g.round);
    const tieOf = (slot: string) => {
      const gs = games.filter((g: any) => g.is_knockout && slotKey(g) === slot)
        .sort((a: any, b: any) => a.match_number - b.match_number);
      if (!gs.length) return null;
      const ref = gs.find((g: any) => g.team1_id && g.team2_id) || gs[0];
      const t1 = ref.team1_id || null, t2 = ref.team2_id || null;
      const done = gs.filter((g: any) => g.status === "completed");
      let w1 = 0, w2 = 0;
      done.forEach((g: any) => {
        if (g.winner_id && g.winner_id === t1) w1++;
        else if (g.winner_id && g.winner_id === t2) w2++;
      });
      const complete = gs.length > 0 && done.length === gs.length;
      let winner: string | null = null, loser: string | null = null;
      if (complete) {
        if (w1 >= 2 || w1 > w2) { winner = t1; loser = t2; }
        else if (w2 >= 2 || w2 > w1) { winner = t2; loser = t1; }
      }
      return { t1, t2, complete, winner, loser };
    };

    const out: any[] = [];
    setBanner(null);

    if (isFriendly) {
      const list = Object.values(metrics).sort(sortMetrics);
      list.forEach((t: any, i: number) => {
        out.push({
          rank: i + 1,
          name: t.name,
          medal: i === 0 ? GOLD : i === 1 ? SILVER : null,
          note: `${t.wins}W / ${t.gl || 0}L • ${t.diff > 0 ? "+" : ""}${t.diff} diff`,
        });
      });
      const target = active?.settings?.targetWins;
      const allDone = games.length > 0 && games.every((g: any) => g.status === "completed");
      const leader = list[0];
      if (leader && ((target && leader.wins >= target) || allDone)) setBanner(`🏆 ${leader.name}`);
    } else {
      const sf1 = tieOf("SF1"), sf2 = tieOf("SF2"), p34 = tieOf("3rd/4th"), fin = tieOf("Final");
      const used = new Set<string>();
      const byMetrics = (ids: string[]) => ids.map((id) => metrics[id]).filter(Boolean).sort(sortMetrics);

      let finalists: string[] = [];
      if (fin && fin.t1 && fin.t2) finalists = [fin.t1, fin.t2];
      else if (sf1?.complete && sf2?.complete && sf1.winner && sf2.winner) finalists = [sf1.winner, sf2.winner];

      let p34Teams: string[] = [];
      if (p34 && p34.t1 && p34.t2) p34Teams = [p34.t1, p34.t2];
      else if (sf1?.complete && sf2?.complete && sf1.loser && sf2.loser) p34Teams = [sf1.loser, sf2.loser];

      if (finalists.length === 2) {
        if (fin?.complete && fin.winner) {
          out.push({ rank: 1, name: nameOfById(fin.winner), medal: GOLD, note: "Champion" });
          out.push({ rank: 2, name: nameOfById(fin.loser), medal: SILVER, note: "Runner-up" });
        } else {
          const ord = byMetrics(finalists);
          out.push({ rank: 1, name: ord[0]?.name || "TBD", medal: null, note: "In Final (pending)" });
          out.push({ rank: 2, name: ord[1]?.name || "TBD", medal: null, note: "In Final (pending)" });
        }
        finalists.forEach((id) => used.add(id));
      }

      if (p34Teams.length === 2) {
        if (p34?.complete && p34.winner) {
          out.push({ rank: 3, name: nameOfById(p34.winner), medal: BRONZE, note: "3rd Place" });
          out.push({ rank: 4, name: nameOfById(p34.loser), medal: null, note: "4th Place" });
        } else {
          const ord = byMetrics(p34Teams);
          out.push({ rank: 3, name: ord[0]?.name || "TBD", medal: null, note: "3rd/4th Play-off (pending)" });
          out.push({ rank: 4, name: ord[1]?.name || "TBD", medal: null, note: "3rd/4th Play-off (pending)" });
        }
        p34Teams.forEach((id) => used.add(id));
      }

      const rest = Object.values(metrics).filter((t: any) => !used.has(t.id)).sort(sortMetrics);
      rest.forEach((t: any) => {
        out.push({ rank: out.length + 1, name: t.name, medal: null, note: metricLine(t) });
      });

      if (fin?.complete && fin.winner) setBanner(`🏆 Champion: ${nameOfById(fin.winner)}`);
    }

    setRows(out);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("results-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_standings" }, () => fetchData())
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

  if (loading) return <div style={{ textAlign: "center", padding: "48px", color: "#C9A959" }}>Loading results...</div>;

  const isFriendly = !!comp && ((comp.format_type || "").toLowerCase() === "friendlyhead2head" || (comp.competition_type || "").toLowerCase() === "friendly");

  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: "bold", color: "#ffffff", margin: "0 0 8px 0" }}>
            {isFriendly ? "FRIENDLY RESULTS" : "FINAL RESULTS"}
          </h1>
          <p style={{ color: "#888888", fontSize: 14, margin: 0 }}>{comp?.name || "No active competition"}</p>
        </div>

        {banner && (
          <div style={{ padding: 14, background: "#C9A959", borderRadius: 6, textAlign: "center", color: "#0a0a0a", fontWeight: "bold", fontSize: 16, textTransform: "uppercase", letterSpacing: 1 }}>
            {banner}
          </div>
        )}

        <div style={{ background: "#111111", border: "1px solid #1a1a1a", borderRadius: 4, overflow: "hidden" }}>
          {rows.map((r: any) => (
            <div key={r.rank} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              borderBottom: "1px solid #1a1a1a",
              background: r.medal ? `${r.medal}14` : "transparent",
              borderLeft: r.medal ? `4px solid ${r.medal}` : "4px solid transparent",
            }}>
              <span style={{
                minWidth: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: r.medal || "#1a1a1a", color: r.medal ? "#0a0a0a" : "#C9A959",
                fontWeight: 800, fontSize: 14,
              }}>
                {r.rank}
              </span>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 15, color: r.medal || "#ffffff" }}>{r.name}</span>
              <span style={{ fontSize: 11, color: r.note.includes("pending") ? "#888888" : r.medal || "#888888", textAlign: "right", maxWidth: "45%" }}>
                {r.note}
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#888888", fontSize: 12 }}>No results yet.</div>
          )}
        </div>

        <p style={{ color: "#888888", fontSize: 12, textAlign: "center", margin: 0 }}>
          {isFriendly
            ? "Ranked by games won, then point difference."
            : "Ranks 1-2 from the Final, 3-4 from the 3rd/4th Play-off, then group record: Wins → Games Won % → Point Diff → Points For."}
        </p>
      </div>
    </div>
  );
}
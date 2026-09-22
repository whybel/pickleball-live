"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StandingsPage() {
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [comp, setComp] = useState<any>(null);
  const [friendlyRows, setFriendlyRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isFriendly = (c: any) =>
    !!c && ((c.format_type || "").toLowerCase() === "friendlyhead2head" || (c.competition_type || "").toLowerCase() === "friendly");

  const fetchData = async () => {
    const { data: comps } = await supabase
      .from("competitions")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    const active = comps && comps[0] ? comps[0] : null;
    setComp(active);

    if (!active) { setGroups({}); setFriendlyRows([]); setLoading(false); return; }

    if (isFriendly(active)) {
      const { data: m } = await supabase
        .from("matches")
        .select("*, team1:team1_id(name), team2:team2_id(name)")
        .eq("competition_id", active.id)
        .order("match_number");
      const stats: Record<string, any> = {};
      const ensure = (id: string, name: string) => {
        if (!id) return;
        if (!stats[id]) stats[id] = { id, name: name || "TBD", gp: 0, w: 0, l: 0, pf: 0, pa: 0 };
      };
      (m || []).forEach((g: any) => {
        ensure(g.team1_id, g.team1_custom_name?.trim() || g.team1?.name);
        ensure(g.team2_id, g.team2_custom_name?.trim() || g.team2?.name);
        if (g.status === "completed" && g.team1_id && g.team2_id) {
          stats[g.team1_id].gp += 1; stats[g.team2_id].gp += 1;
          stats[g.team1_id].pf += g.team1_score || 0; stats[g.team1_id].pa += g.team2_score || 0;
          stats[g.team2_id].pf += g.team2_score || 0; stats[g.team2_id].pa += g.team1_score || 0;
          if (g.winner_id === g.team1_id) { stats[g.team1_id].w += 1; stats[g.team2_id].l += 1; }
          else if (g.winner_id === g.team2_id) { stats[g.team2_id].w += 1; stats[g.team1_id].l += 1; }
        }
      });
      const rows = Object.values(stats).sort(
        (a: any, b: any) => (b.w - a.w) || ((b.pf - b.pa) - (a.pf - a.pa)) || (b.pf - a.pf)
      );
      setFriendlyRows(rows);
      setGroups({});
      setLoading(false);
      return;
    }

    const { data: standings } = await supabase
      .from("group_standings")
      .select("*, team:team_id(name)")
      .eq("competition_id", active.id);

    const grouped: Record<string, any[]> = (standings || []).reduce((acc: any, item: any) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});

    Object.keys(grouped).forEach((group) => {
      grouped[group].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        const aGP = (a.games_won || 0) + (a.games_lost || 0);
        const bGP = (b.games_won || 0) + (b.games_lost || 0);
        const aPct = aGP > 0 ? (a.games_won || 0) / aGP : 0;
        const bPct = bGP > 0 ? (b.games_won || 0) / bGP : 0;
        if (bPct !== aPct) return bPct - aPct;
        const aDiff = (a.points_for || 0) - (a.points_against || 0);
        const bDiff = (b.points_for || 0) - (b.points_against || 0);
        if (bDiff !== aDiff) return bDiff - aDiff;
        return (b.points_for || 0) - (a.points_for || 0);
      });
    });

    setGroups(grouped);
    setFriendlyRows([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("public:standings_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_standings" }, () => fetchData())
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

  if (loading) return <div style={{ textAlign: "center", padding: "48px", color: "#C9A959" }}>Loading standings...</div>;

  const gridCols = "5% 25% 8% 8% 8% 10% 12% 12% 12%";
  const friendlyCols = "34% 10% 8% 8% 12% 9% 9% 10%";
  const target = comp?.settings?.targetWins || null;
  const leader = friendlyRows[0] || null;
  const winner = isFriendly(comp) && leader && target && leader.w >= target ? leader : null;

  return (
    <div style={{ padding: "0 12px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: "bold", color: "#ffffff", margin: "0 0 8px 0" }}>
            {isFriendly(comp) ? "FRIENDLY SCOREBOARD" : "GROUP STANDINGS"}
          </h1>
          <p style={{ color: "#888888", fontSize: 14, margin: 0 }}>
            {isFriendly(comp)
              ? `Head-to-head • First to ${target || "—"} games wins`
              : "Tiebreakers: Match Wins → Games Won % → Point Diff → Points For"}
          </p>
        </div>

        {isFriendly(comp) ? (
          <div style={{ background: "#111111", border: "1px solid #1a1a1a", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: friendlyCols, padding: "10px 12px", fontSize: 10, color: "#888888", textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>Team</div>
              <div style={{ textAlign: "center" }}>GP</div>
              <div style={{ textAlign: "center" }}>W</div>
              <div style={{ textAlign: "center" }}>L</div>
              <div style={{ textAlign: "center" }}>Win%</div>
              <div style={{ textAlign: "center" }}>PF</div>
              <div style={{ textAlign: "center" }}>PA</div>
              <div style={{ textAlign: "center" }}>Diff</div>
            </div>
            {friendlyRows.map((r: any, i: number) => {
              const diff = r.pf - r.pa;
              const winPct = r.gp > 0 ? Math.round((r.w / r.gp) * 100) : 0;
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: friendlyCols, padding: "12px", fontSize: 13, borderBottom: "1px solid #1a1a1a", alignItems: "center", background: i === 0 ? "rgba(201,169,89,0.05)" : "transparent" }}>
                  <div style={{ fontWeight: 700, color: "#ffffff", textAlign: "center" }}>{r.name}</div>
                  <div style={{ textAlign: "center", color: "#888888" }}>{r.gp}</div>
                  <div style={{ textAlign: "center", color: "#22c55e", fontWeight: 600 }}>{r.w}</div>
                  <div style={{ textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{r.l}</div>
                  <div style={{ textAlign: "center", color: "#ffffff", fontWeight: 600 }}>{winPct}%</div>
                  <div style={{ textAlign: "center", color: "#ffffff" }}>{r.pf}</div>
                  <div style={{ textAlign: "center", color: "#ffffff" }}>{r.pa}</div>
                  <div style={{ textAlign: "center", color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#888888", fontWeight: 600 }}>
                    {diff > 0 ? `+${diff}` : diff}
                  </div>
                </div>
              );
            })}
            {friendlyRows.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "#888888", fontSize: 12 }}>No games yet — generate the friendly schedule in Admin.</div>
            )}
            {winner && (
              <div style={{ margin: 12, padding: 10, background: "#C9A959", borderRadius: 4, textAlign: "center", color: "#0a0a0a", fontWeight: "bold", fontSize: 14, textTransform: "uppercase" }}>
                🏆 Winner: {winner.name}
              </div>
            )}
          </div>
        ) : (
          <>
            {Object.keys(groups).sort().map((group) => (
              <div key={group} style={{ background: "#111111", border: "1px solid #1a1a1a", borderRadius: 4, overflow: "hidden", width: "100%" }}>
                <div style={{ background: "rgba(201, 169, 89, 0.15)", padding: "12px 16px", borderBottom: "2px solid #C9A959", textAlign: "center" }}>
                  <h2 style={{ fontSize: 16, fontWeight: "bold", color: "#C9A959", margin: 0, textTransform: "uppercase", letterSpacing: 1 }}>GROUP {group}</h2>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: gridCols, padding: "10px 12px", fontSize: 10, color: "#888888", textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #1a1a1a", background: "#0a0a0a", alignItems: "center" }}>
                  <div style={{ textAlign: "center" }}>#</div>
                  <div style={{ textAlign: "center" }}>Team</div>
                  <div style={{ textAlign: "center" }}>MP</div>
                  <div style={{ textAlign: "center" }}>W</div>
                  <div style={{ textAlign: "center" }}>L</div>
                  <div style={{ textAlign: "center" }}>GW%</div>
                  <div style={{ textAlign: "center" }}>F</div>
                  <div style={{ textAlign: "center" }}>A</div>
                  <div style={{ textAlign: "center" }}>Diff</div>
                </div>
                <div>
                  {groups[group].map((team: any, index: number) => {
                    const diff = (team.points_for || 0) - (team.points_against || 0);
                    const gp = (team.games_won || 0) + (team.games_lost || 0);
                    const pct = gp > 0 ? Math.round(((team.games_won || 0) / gp) * 100) : 0;
                    return (
                      <div key={team.id} style={{ display: "grid", gridTemplateColumns: gridCols, padding: "10px 12px", fontSize: 12, borderBottom: "1px solid #1a1a1a", alignItems: "center", background: index === 0 ? "rgba(201, 169, 89, 0.05)" : "transparent" }}>
                        <div style={{ textAlign: "center" }}>
                          <span style={{ background: index === 0 ? "#C9A959" : "#1a1a1a", color: index === 0 ? "#0a0a0a" : "#C9A959", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 3, display: "inline-block" }}>
                            {index + 1}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, color: "#ffffff", fontSize: 12, wordBreak: "break-word", textAlign: "center" }}>{team.team?.name}</div>
                        <div style={{ textAlign: "center", color: "#888888" }}>{team.matches_played || 0}</div>
                        <div style={{ textAlign: "center", color: "#22c55e", fontWeight: 600 }}>{team.wins || 0}</div>
                        <div style={{ textAlign: "center", color: "#ef4444", fontWeight: 600 }}>{team.losses || 0}</div>
                        <div style={{ textAlign: "center", color: "#ffffff", fontWeight: 600 }}>{pct}%</div>
                        <div style={{ textAlign: "center", color: "#ffffff" }}>{team.points_for || 0}</div>
                        <div style={{ textAlign: "center", color: "#ffffff" }}>{team.points_against || 0}</div>
                        <div style={{ textAlign: "center", color: diff > 0 ? "#22c55e" : diff < 0 ? "#ef4444" : "#888888", fontWeight: 600 }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </div>
                      </div>
                    );
                  })}
                  {groups[group].length === 0 && (
                    <div style={{ padding: 24, textAlign: "center", color: "#888888", fontSize: 12 }}>No teams yet</div>
                  )}
                </div>
              </div>
            ))}
            {Object.keys(groups).length === 0 && (
              <div style={{ textAlign: "center", padding: 48, color: "#888888" }}>No standings available yet</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function StandingsPage() {
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data: comp } = await supabase.from("competitions").select("*").eq("status", "active").single();
    if (comp) {
      const { data: standings } = await supabase
        .from("group_standings")
        .select("*, team:team_id(name)")
        .eq("competition_id", comp.id);

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
      setLoading(false);
    }
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

  return (
    <div style={{ padding: "0 12px" }}>
      {/* Single centred column on ALL devices (desktop + mobile) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ borderBottom: "1px solid #1a1a1a", paddingBottom: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: "bold", color: "#ffffff", margin: "0 0 8px 0" }}>GROUP STANDINGS</h1>
          <p style={{ color: "#888888", fontSize: 14, margin: 0 }}>Tiebreakers: Match Wins → Games Won % → Point Diff → Points For</p>
        </div>

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
      </div>
    </div>
  );
}
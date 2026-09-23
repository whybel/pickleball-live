"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ---------------- Module-level TeamSelect (stable identity = custom name input never disappears) ---------------- */
function TeamSelect({ matchId, teamId, customName, teamNum, teamsList, onUpdate }: any) {
  const [mode, setMode] = useState(customName ? "custom" : "team");
  const [text, setText] = useState(customName || "");

  useEffect(() => {
    setMode(customName ? "custom" : "team");
    setText(customName || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Team {teamNum}</label>
      <select
        value={mode === "custom" ? "custom" : (teamId || "")}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "custom") {
            setMode("custom");
            onUpdate(matchId, `team${teamNum}_id`, null);
          } else {
            setMode("team");
            setText("");
            onUpdate(matchId, `team${teamNum}_id`, v || null);
            onUpdate(matchId, `team${teamNum}_custom_name`, "");
          }
        }}
        style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', marginBottom: mode === "custom" ? '8px' : '0' }}
      >
        <option value="">Select Team</option>
        {teamsList.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        <option value="custom">-- Type Custom Name --</option>
      </select>
      {mode === "custom" && (
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onUpdate(matchId, `team${teamNum}_custom_name`, e.target.value);
          }}
          placeholder="Enter custom name..."
          style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #C9A959', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      )}
    </div>
  );
}

/* ---------------- Admin Page ---------------- */
export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [currentCompId, setCurrentCompId] = useState<string>("");
  const [competitions, setCompetitions] = useState<any[]>([]);

  const [showTeamName, setShowTeamName] = useState(true);
  const [showPlayerName, setShowPlayerName] = useState(true);

  const [newMatchType, setNewMatchType] = useState<'group' | 'knockout'>('knockout');
  const [newMatchRound, setNewMatchRound] = useState("SF1");
  const [newMatchCategory, setNewMatchCategory] = useState("Doubles");
  const [newMatchCourt, setNewMatchCourt] = useState("Court 1");
  const [newMatchTime, setNewMatchTime] = useState("4:30 PM");

  const [tournamentFormat, setTournamentFormat] = useState("GroupToKnockout");
  const [tournamentType, setTournamentType] = useState("Tournament");
  const [editTournamentName, setEditTournamentName] = useState("");
  const [newTournamentName, setNewTournamentName] = useState("");

  const [friendlyTeamA, setFriendlyTeamA] = useState("");
  const [friendlyTeamB, setFriendlyTeamB] = useState("");
  const [friendlyMD, setFriendlyMD] = useState(4);
  const [friendlyWD, setFriendlyWD] = useState(4);
  const [friendlyXD, setFriendlyXD] = useState(7);
  const [friendlyStart, setFriendlyStart] = useState("9:00 AM");

  const categories = ["Singles", "Doubles", "Men's Singles", "Men's Doubles", "Women's Singles", "Women's Doubles", "Mixed Doubles"];
  const knockoutSlots = ["SF1", "SF2", "Final", "Quarter-Final", "Semi-Final", "R16", "R32", "R64", "R128"];

  const isFriendlyNow = (tournamentType || "").toLowerCase() === "friendly";

  useEffect(() => {
    if (isAuthenticated) fetchCompetitions();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && currentCompId) {
      fetchData();
      const currentComp = competitions.find((c: any) => c.id === currentCompId);
      if (currentComp) {
        setEditTournamentName(currentComp.name);
        setTournamentFormat(currentComp.format_type || "GroupToKnockout");
        setTournamentType(currentComp.competition_type || "Tournament");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, currentCompId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const ch = supabase.channel("live-refresh");
    ch.subscribe();
    (window as any).__liveRefreshChannel = ch;
    return () => {
      supabase.removeChannel(ch);
      (window as any).__liveRefreshChannel = null;
    };
  }, [isAuthenticated]);

  const fetchCompetitions = async () => {
    const { data } = await supabase.from("competitions").select("*").order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setCompetitions(data);
      const activeComp = data.find((c: any) => c.status === 'active') || data[0];
      setCurrentCompId(activeComp.id);
      setShowTeamName(activeComp.show_team_name !== false);
      setShowPlayerName(activeComp.show_player_name !== false);
      setTournamentFormat(activeComp.format_type || "GroupToKnockout");
      setTournamentType(activeComp.competition_type || "Tournament");
      setEditTournamentName(activeComp.name);
    }
  };

  const fetchData = async (compId?: string) => {
    const id = compId || currentCompId;
    const { data: m } = await supabase.from("matches").select("*, team1:team1_id(name), team2:team2_id(name)").eq("competition_id", id).order("match_number");
    const { data: t } = await supabase.from("teams").select("*").order("name");
    setMatches(m || []);
    setTeams(t || []);
  };

  const handleLogin = () => {
    if (passcode === process.env.NEXT_PUBLIC_ADMIN_PASSCODE) setIsAuthenticated(true);
    else alert("Incorrect passcode.");
  };

  const notify = () => {
    const ch = (window as any).__liveRefreshChannel;
    if (ch) ch.send({ type: "broadcast", event: "refresh", payload: { at: Date.now() } });
  };

  const pushUpdate = () => {
    notify();
    alert("Update pushed to Live, Standings and Bracket pages.");
  };

  const saveSettings = async (compId: string, settings: any) => {
    const { error } = await supabase.from("competitions").update({ settings }).eq("id", compId);
    if (error) console.warn("settings not saved:", error.message);
  };

  const recalculateStandings = async () => {
    if (isRecalculating) return;
    setIsRecalculating(true);
    await supabase.rpc('recalculate_standings', { p_competition_id: currentCompId });
    setIsRecalculating(false);
  };

  const updateMatch = async (id: string, field: string, value: any) => {
    await supabase.from("matches").update({ [field]: value }).eq("id", id);
    await fetchData();
    notify();
  };

  const deleteMatch = async (id: string) => {
    if (!confirm("Delete this game? If it is a group game, standings will be recalculated.")) return;
    const wasGroup = !matches.find((m: any) => m.id === id)?.is_knockout;
    await supabase.from("matches").delete().eq("id", id);
    if (wasGroup) await recalculateStandings();
    await fetchData();
    notify();
  };

  const resetMatchScore = async (matchId: string) => {
    if (!confirm("Reset this game score?")) return;
    await supabase.from("matches").update({ team1_score: 0, team2_score: 0, winner_id: null, status: "upcoming" }).eq("id", matchId);
    await recalculateStandings();
    await fetchData();
    notify();
  };

  const updateLiveScore = async (matchId: string, t1: number, t2: number) => {
    await supabase.from("matches").update({ team1_score: t1, team2_score: t2, status: "live" }).eq("id", matchId);
    await fetchData();
    notify();
  };

  const completeMatch = async (matchId: string, t1: number, t2: number, t1Id: string, t2Id: string) => {
    if (t1 === t2) { alert("Scores cannot be equal. Please enter the correct scores."); return; }
    const winner = t1 > t2 ? t1Id : t2Id;
    await supabase.from("matches").update({ team1_score: t1, team2_score: t2, winner_id: winner, status: "completed" }).eq("id", matchId);
    if (!matches.find((m: any) => m.id === matchId)?.is_knockout) await recalculateStandings();
    await fetchData();
    notify();
  };

  const readScores = (matchId: string) => {
    const el1 = document.getElementById(`t1-${matchId}`) as HTMLInputElement | null;
    const el2 = document.getElementById(`t2-${matchId}`) as HTMLInputElement | null;
    const s1 = parseInt(el1?.value ?? "");
    const s2 = parseInt(el2?.value ?? "");
    if (isNaN(s1) || isNaN(s2)) { alert("Please enter both scores (enter 0 if none)."); return null; }
    return { s1, s2 };
  };

  const resetAllScores = async () => {
    if (!confirm("WARNING: This will reset ALL game scores to 0 and clear standings. Games will remain. Continue?")) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;
    await supabase.from("matches").update({ team1_score: 0, team2_score: 0, winner_id: null, status: "upcoming" }).eq("competition_id", currentCompId);
    await supabase.from("group_standings").update({ matches_played: 0, wins: 0, losses: 0, games_won: 0, games_lost: 0, points_for: 0, points_against: 0 }).eq("competition_id", currentCompId);
    await fetchData();
    notify();
    alert("All scores reset successfully!");
  };

  const wipeCompetition = async () => {
    if (!confirm("WARNING: This will DELETE all games for the current competition and reset its standings to zero. Teams are kept.")) return;
    if (!confirm("Are you absolutely sure?")) return;
    await supabase.from("matches").delete().eq("competition_id", currentCompId);
    await supabase.from("group_standings").update({ matches_played: 0, wins: 0, losses: 0, games_won: 0, games_lost: 0, points_for: 0, points_against: 0 }).eq("competition_id", currentCompId);
    await fetchData();
    notify();
    alert("Competition wiped: games removed, standings zeroed, teams kept.");
  };

  const saveDisplaySettings = async () => {
    await supabase.from("competitions").update({ show_team_name: showTeamName, show_player_name: showPlayerName }).eq("id", currentCompId);
    notify();
    alert("Live display settings saved!");
  };

  const saveTournamentName = async () => {
    if (!editTournamentName.trim()) return alert("Tournament name cannot be empty");
    await supabase.from("competitions").update({ name: editTournamentName }).eq("id", currentCompId);
    await fetchCompetitions();
    notify();
    alert("Tournament name updated!");
  };

  const createNewTournament = async () => {
    if (!newTournamentName.trim()) return alert("Please enter a tournament name");
    const { data, error } = await supabase.from("competitions").insert([{
      name: newTournamentName,
      format_type: tournamentFormat,
      competition_type: tournamentType,
      show_team_name: true,
      show_player_name: true,
      status: 'active'
    }]).select().single();
    if (error) { alert("Error creating tournament: " + error.message); return; }
    await supabase.from("competitions").update({ status: 'archived' }).neq("id", data.id);
    setCurrentCompId(data.id);
    setNewTournamentName("");
    await fetchCompetitions();
    await fetchData(data.id);
    notify();
    alert("New tournament created successfully!");
  };

  const addMatch = async () => {
    const isKnockout = newMatchType === 'knockout';
    const maxMatchNum = matches.length > 0 ? Math.max(...matches.map((m: any) => m.match_number)) : 0;
    const koRound = newMatchRound === 'SF1' || newMatchRound === 'SF2' ? 'Semi-Final' : newMatchRound;
    const { error } = await supabase.from("matches").insert([{
      competition_id: currentCompId, match_number: maxMatchNum + 1, is_knockout: isKnockout,
      knockout_round: isKnockout ? koRound : null, round: isKnockout ? newMatchRound : 'Round 1',
      category: newMatchCategory, court: newMatchCourt, scheduled_time: newMatchTime,
      game_type: 'TBD', status: 'upcoming', team1_score: 0, team2_score: 0, team1_players: '', team2_players: ''
    }]);
    if (error) alert("Error adding game: " + error.message);
    else { await fetchData(); notify(); }
  };

  const generateKnockoutStage = async () => {
    if (!confirm("This will create the Knockout Stage: Semi-Final 1 (3 games), Semi-Final 2 (3 games) and the Final (3 games). Continue?")) return;
    const maxMatchNum = matches.length > 0 ? Math.max(...matches.map((m: any) => m.match_number)) : 0;
    let n = maxMatchNum + 1;
    const plan = [
      { round: 'SF1', ko: 'Semi-Final', gt: 'Doubles 1', cat: 'Doubles', court: 'Court 1/A4', time: '4:30 PM' },
      { round: 'SF2', ko: 'Semi-Final', gt: 'Doubles 1', cat: 'Doubles', court: 'Court 2/A5', time: '4:30 PM' },
      { round: 'SF1', ko: 'Semi-Final', gt: 'Doubles 2', cat: 'Doubles', court: 'Court 3/A6', time: '4:30 PM' },
      { round: 'SF2', ko: 'Semi-Final', gt: 'Doubles 2', cat: 'Doubles', court: 'Court 1/A4', time: '4:30 PM' },
      { round: 'SF1', ko: 'Semi-Final', gt: 'Singles', cat: 'Singles', court: 'Court 2/A5', time: '4:30 PM' },
      { round: 'SF2', ko: 'Semi-Final', gt: 'Singles', cat: 'Singles', court: 'Court 3/A6', time: '4:30 PM' },
      { round: 'Final', ko: 'Final', gt: 'Doubles 1', cat: 'Doubles', court: 'Court 1/A4', time: '5:00 PM' },
      { round: 'Final', ko: 'Final', gt: 'Doubles 2', cat: 'Doubles', court: 'Court 2/A5', time: '5:00 PM' },
      { round: 'Final', ko: 'Final', gt: 'Singles', cat: 'Singles', court: 'Court 3/A6', time: '5:00 PM' },
    ];
    const rows = plan.map((g) => ({
      competition_id: currentCompId, match_number: n++, is_knockout: true, knockout_round: g.ko, round: g.round,
      category: g.cat, court: g.court, scheduled_time: g.time, game_type: g.gt, status: 'upcoming',
      team1_score: 0, team2_score: 0, team1_players: g.gt, team2_players: g.gt
    }));
    const { error } = await supabase.from("matches").insert(rows);
    if (error) alert("Error generating: " + error.message);
    else { await fetchData(); notify(); alert("Knockout stage created: SF1, SF2 and Final (3 games each)."); }
  };

  const generateFriendlySchedule = async () => {
    const a = friendlyTeamA.trim(), b = friendlyTeamB.trim();
    if (!a || !b) return alert("Please enter both team names.");
    if (a.toLowerCase() === b.toLowerCase()) return alert("Teams must be different.");
    const total = friendlyMD + friendlyWD + friendlyXD;
    if (total < 1) return alert("Add at least one game.");
    if (!confirm(`Create ${total} games (${friendlyMD} MD, ${friendlyWD} WD, ${friendlyXD} XD) between "${a}" and "${b}"?`)) return;

    const getTeam = async (name: string) => {
      const { data: ex } = await supabase.from("teams").select("*").eq("name", name).limit(1);
      if (ex && ex[0]) return ex[0];
      const { data: created } = await supabase.from("teams").insert([{ name, group: null }]).select().single();
      return created;
    };
    const teamA = await getTeam(a);
    const teamB = await getTeam(b);
    if (!teamA || !teamB) return alert("Could not create teams.");

    const games: { gt: string; cat: string }[] = [];
    for (let i = 1; i <= friendlyMD; i++) games.push({ gt: `Men's Doubles ${i}`, cat: "Men's Doubles" });
    for (let i = 1; i <= friendlyWD; i++) games.push({ gt: `Women's Doubles ${i}`, cat: "Women's Doubles" });
    for (let i = 1; i <= friendlyXD; i++) games.push({ gt: `Mixed Doubles ${i}`, cat: "Mixed Doubles" });

    const courts = ["Court 1/A4", "Court 2/A5", "Court 3/A6", "Court 4/B5", "Court 5/B6"];
    const parts = friendlyStart.trim().split(" ");
    const hm = (parts[0] || "9:00").split(":");
    let h = Number(hm[0]) || 9;
    const mi = Number(hm[1]) || 0;
    const ap = (parts[1] || "AM").toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    const fmt = (hh: number, mm: number) => {
      const period = hh >= 12 ? "PM" : "AM";
      let H = hh % 12; if (H === 0) H = 12;
      return `${H}:${mm.toString().padStart(2, "0")} ${period}`;
    };

    const maxNum = matches.length > 0 ? Math.max(...matches.map((m: any) => m.match_number)) : 0;
    let n = maxNum + 1;
    const rows: any[] = games.map((g, idx) => {
      const slot = Math.floor(idx / 5);
      const mins = mi + slot * 15;
      return {
        competition_id: currentCompId, match_number: n++, is_knockout: false, knockout_round: null, round: "Friendly",
        category: g.cat, court: courts[idx % 5], scheduled_time: fmt(h + Math.floor(mins / 60), mins % 60),
        game_type: g.gt, status: "upcoming", team1_id: teamA.id, team2_id: teamB.id,
        team1_score: 0, team2_score: 0, team1_players: g.gt, team2_players: g.gt
      };
    });

    const { error } = await supabase.from("matches").insert(rows);
    if (error) return alert("Failed to create games: " + error.message);

    const target = Math.floor(total / 2) + 1;
    await supabase.from("competitions").update({ competition_type: "Friendly", format_type: "FriendlyHead2Head" }).eq("id", currentCompId);
    await saveSettings(currentCompId, { teamA: a, teamB: b, menDoubles: friendlyMD, womenDoubles: friendlyWD, mixedDoubles: friendlyXD, gamesPerPair: 1, totalGames: total, targetWins: target });
    setTournamentType("Friendly");
    setTournamentFormat("FriendlyHead2Head");
    await fetchData();
    notify();
    alert(`Friendly schedule created: ${total} games. First to ${target} wins takes the tie.`);
  };

  const exportDatabase = async () => {
    if (!currentCompId) return alert("No competition selected");
    try {
      const { data: competition } = await supabase.from("competitions").select("*").eq("id", currentCompId).single();
      const { data: matchesData } = await supabase.from("matches").select("*").eq("competition_id", currentCompId);
      const { data: teamsData } = await supabase.from("teams").select("*");
      const { data: standingsData } = await supabase.from("group_standings").select("*").eq("competition_id", currentCompId);
      const exportData = { export_date: new Date().toISOString(), competition, matches: matchesData || [], teams: teamsData || [], standings: standingsData || [] };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pickleball-tournament-${competition?.name?.replace(/\s+/g, '-').toLowerCase() || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert("Database exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      alert("Error exporting database");
    }
  };

  const importDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      if (!importData?.competition || !Array.isArray(importData?.matches)) {
        alert("Invalid JSON file: missing competition or matches.");
        event.target.value = '';
        return;
      }
      if (!confirm(`Import "${String(importData.competition.name).trim()}" (${importData.matches.length} games)? The current tournament will be archived.`)) {
        event.target.value = '';
        return;
      }

      await supabase.from("competitions").update({ status: 'archived' });
      const { data: newComp, error: compError } = await supabase.from("competitions").insert([{
        name: String(importData.competition.name).trim(),
        format_type: importData.competition.format_type || 'GroupToKnockout',
        competition_type: importData.competition.competition_type || 'Tournament',
        show_team_name: importData.competition.show_team_name !== false,
        show_player_name: importData.competition.show_player_name !== false,
        status: 'active'
      }]).select().single();
      if (compError || !newComp) throw new Error(compError?.message || 'Could not create competition');
      if (importData.competition.settings) await saveSettings(newComp.id, importData.competition.settings);

      const idMap: Record<string, string> = {};
      for (const team of (importData.teams || [])) {
        const name = String(team.name || '').trim();
        if (!name || !team.id) continue;
        const { data: existing } = await supabase.from("teams").select("*").eq("name", name).limit(1);
        if (existing && existing.length > 0) idMap[team.id] = existing[0].id;
        else {
          const { data: created, error: tErr } = await supabase.from("teams").insert([{ name, group: team.group || null }]).select().single();
          if (tErr || !created) throw new Error('Team insert failed: ' + (tErr?.message || name));
          idMap[team.id] = created.id;
        }
      }

      let ok = 0, failed = 0;
      for (const match of importData.matches) {
        const t1 = match.team1_id ? (idMap[match.team1_id] || null) : null;
        const t2 = match.team2_id ? (idMap[match.team2_id] || null) : null;
        const { error: mErr } = await supabase.from("matches").insert([{
          competition_id: newComp.id,
          match_number: match.match_number,
          is_knockout: !!match.is_knockout,
          knockout_round: match.knockout_round || null,
          round: match.round || 'Round 1',
          category: match.category || 'Doubles',
          court: match.court || 'TBD',
          scheduled_time: match.scheduled_time || 'TBD',
          game_type: match.game_type || 'TBD',
          status: match.status || 'upcoming',
          team1_id: t1, team2_id: t2,
          team1_score: match.team1_score || 0,
          team2_score: match.team2_score || 0,
          winner_id: match.winner_id ? (idMap[match.winner_id] || null) : null,
          team1_players: match.team1_players || '',
          team2_players: match.team2_players || '',
          team1_custom_name: String(match.team1_custom_name || '').trim(),
          team2_custom_name: String(match.team2_custom_name || '').trim()
        }]);
        if (mErr) { failed++; console.error('Match insert failed:', mErr.message); } else ok++;
      }

      for (const team of (importData.teams || [])) {
        const newId = team.id ? idMap[team.id] : null;
        if (!newId) continue;
        await supabase.from("group_standings").insert([{
          competition_id: newComp.id, team_id: newId, group: team.group || null,
          matches_played: 0, wins: 0, losses: 0, games_won: 0, games_lost: 0, points_for: 0, points_against: 0
        }]);
      }

      setCurrentCompId(newComp.id);
      await fetchCompetitions();
      await fetchData(newComp.id);
      notify();
      alert(`Import complete: ${ok} games loaded${failed ? `, ${failed} FAILED (see console)` : ''}.`);
      event.target.value = '';
    } catch (error: any) {
      console.error('Import error:', error);
      alert('Import failed: ' + (error?.message || 'unknown error'));
      event.target.value = '';
    }
  };

  const groupMatches = matches.filter((m: any) => !m.is_knockout);
  const knockoutMatches = matches.filter((m: any) => m.is_knockout);

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '32px', color: '#C9A959' }}>ADMIN ACCESS</h1>
        <input type="password" placeholder="Enter Passcode" value={passcode} onChange={(e) => setPasscode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} style={{ padding: '16px', fontSize: '16px', border: '1px solid #2a2a2a', borderRadius: '4px', background: '#111111', color: 'white', width: '100%', maxWidth: '300px', marginBottom: '20px', textAlign: 'center' }} />
        <button onClick={handleLogin} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '16px 32px', borderRadius: '4px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', textTransform: 'uppercase' }}>Unlock</button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a1a', paddingBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>TOURNAMENT MANAGER</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={pushUpdate} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>🔄 Push Update</button>
          <button onClick={() => setIsAuthenticated(false)} style={{ background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '12px', textTransform: 'uppercase' }}>Logout</button>
        </div>
      </div>

      {/* Tournament Management */}
      <div style={{ background: '#111111', border: '2px solid #C9A959', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Tournament Management</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Switch Competition</label>
          <select value={currentCompId} onChange={async (e) => { const id = e.target.value; setCurrentCompId(id); await supabase.from("competitions").update({ status: 'archived' }).neq("id", id); await supabase.from("competitions").update({ status: 'active' }).eq("id", id); setCompetitions((prev: any[]) => prev.map((c: any) => ({ ...c, status: c.id === id ? 'active' : 'archived' }))); const comp = competitions.find((c: any) => c.id === id); if (comp) { setEditTournamentName(comp.name); setTournamentFormat(comp.format_type || 'GroupToKnockout'); setTournamentType(comp.competition_type || 'Tournament'); } notify(); }} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
            {competitions.map((c: any) => <option key={c.id} value={c.id}>{c.name} {c.status === 'archived' ? '(Archived)' : ''}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Edit Tournament Name</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={editTournamentName} onChange={(e) => setEditTournamentName(e.target.value)} style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
            <button onClick={saveTournamentName} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save Name</button>
          </div>
        </div>
        <div style={{ marginBottom: '20px', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Create New Tournament</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={newTournamentName} onChange={(e) => setNewTournamentName(e.target.value)} placeholder="Enter new tournament name" style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
            <button onClick={createNewTournament} style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Create New</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Competition Type</label>
            <select value={tournamentType} onChange={(e) => { setTournamentType(e.target.value); if (e.target.value === 'Friendly') setTournamentFormat('FriendlyHead2Head'); }} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              <option value="Tournament">Tournament</option>
              <option value="Friendly">Friendly (2 teams)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '8px' }}>Format</label>
            <select value={tournamentFormat} onChange={(e) => setTournamentFormat(e.target.value)} disabled={isFriendlyNow} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              {isFriendlyNow ? (
                <option value="FriendlyHead2Head">Head-to-Head (single games)</option>
              ) : (
                <>
                  <option value="GroupToKnockout">Round Robin → Knockout</option>
                  <option value="DirectKnockout">Direct Knockout</option>
                  <option value="League">League (Round Robin only)</option>
                </>
              )}
            </select>
          </div>
        </div>
        <button onClick={async () => { await supabase.from("competitions").update({ format_type: tournamentFormat, competition_type: tournamentType }).eq("id", currentCompId); notify(); alert("Tournament format saved!"); }} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save Format</button>
      </div>

      {/* Backup & Restore */}
      <div style={{ background: '#111111', border: '2px solid #C9A959', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Database Backup & Restore</h2>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={exportDatabase} style={{ background: '#22c55e', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Export Database (JSON)</button>
          <label style={{ background: '#3b82f6', color: 'white', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-block' }}>
            Import Database
            <input type="file" accept=".json" onChange={importDatabase} style={{ display: 'none' }} />
          </label>
        </div>
        <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={resetAllScores} style={{ background: '#f59e0b', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Reset All Scores</button>
          <button onClick={wipeCompetition} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Wipe Competition Data</button>
        </div>
      </div>

      {/* Friendly Builder */}
      {isFriendlyNow && (
        <div style={{ background: '#111111', border: '2px solid #C9A959', borderRadius: '4px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Friendly Schedule Builder (Head-to-Head)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Team A</label>
              <input value={friendlyTeamA} onChange={(e) => setFriendlyTeamA(e.target.value)} placeholder="e.g. Team Singapore" style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Team B</label>
              <input value={friendlyTeamB} onChange={(e) => setFriendlyTeamB(e.target.value)} placeholder="e.g. Team Malaysia" style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Men's Doubles</label>
              <input type="number" min={0} value={friendlyMD} onChange={(e) => setFriendlyMD(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Women's Doubles</label>
              <input type="number" min={0} value={friendlyWD} onChange={(e) => setFriendlyWD(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Mixed Doubles</label>
              <input type="number" min={0} value={friendlyXD} onChange={(e) => setFriendlyXD(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Start Time</label>
              <input value={friendlyStart} onChange={(e) => setFriendlyStart(e.target.value)} placeholder="9:00 AM" style={{ width: '100%', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
            </div>
          </div>
          <button onClick={generateFriendlySchedule} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Generate Friendly Games</button>
          <p style={{ color: '#888888', fontSize: '12px', marginTop: '12px', marginBottom: 0 }}>
            Creates one game per pairing (MD1…MD4, WD1…WD4, XD1…XD7 by default), 5 courts per 15-min slot from the start time. Teams are auto-created if new. First to (total/2 + 1) wins takes the tie.
          </p>
        </div>
      )}

      {/* Display Settings */}
      <div style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Live Screen Display Settings</h2>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', cursor: 'pointer' }}>
            <input type="checkbox" checked={showTeamName} onChange={(e) => setShowTeamName(e.target.checked)} style={{ width: '18px', height: '18px' }} /> Show Team Name
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', cursor: 'pointer' }}>
            <input type="checkbox" checked={showPlayerName} onChange={(e) => setShowPlayerName(e.target.checked)} style={{ width: '18px', height: '18px' }} /> Show Player/s Name
          </label>
          <button onClick={saveDisplaySettings} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Save Settings</button>
        </div>
      </div>

      {/* Stage Manager */}
      <div style={{ background: '#111111', border: '1px solid #C9A959', borderRadius: '4px', padding: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 'bold', color: '#C9A959', marginTop: 0, marginBottom: '16px' }}>Knockout Stage Manager</h2>
        {!isFriendlyNow && (
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
            <button onClick={generateKnockoutStage} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '12px 24px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Auto-Generate SF1, SF2 & Final (9 games)</button>
          </div>
        )}
        <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', border: '1px solid #1a1a1a' }}>
          <h3 style={{ fontSize: '14px', color: '#ffffff', marginTop: 0, marginBottom: '12px' }}>Add Custom Game</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <select value={newMatchType} onChange={(e) => setNewMatchType(e.target.value as any)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              <option value="group">Group Stage</option>
              <option value="knockout">Knockout</option>
            </select>
            {newMatchType === 'knockout' && (
              <select value={newMatchRound} onChange={(e) => setNewMatchRound(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                {knockoutSlots.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <select value={newMatchCategory} onChange={(e) => setNewMatchCategory(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Court" value={newMatchCourt} onChange={(e) => setNewMatchCourt(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
            <input placeholder="Time" value={newMatchTime} onChange={(e) => setNewMatchTime(e.target.value)} style={{ padding: '10px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }} />
            <button onClick={addMatch} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Add Game</button>
          </div>
        </div>
      </div>

      {/* Group / Friendly games */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>{isFriendlyNow ? 'Friendly Games' : 'Group Stage Games'} ({groupMatches.length})</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {groupMatches.map((match: any) => (
            <div key={match.id} style={{ background: '#111111', border: '1px solid #1a1a1a', borderRadius: '4px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#C9A959', fontWeight: 'bold' }}>Game #{match.match_number} ({match.category})</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>{editingId === match.id ? 'CLOSE EDIT' : 'EDIT'}</button>
                  {match.status === 'completed' && <button onClick={() => resetMatchScore(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>RESET</button>}
                  <button onClick={() => deleteMatch(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>DELETE</button>
                </div>
              </div>

              {editingId === match.id && (
                <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Time</label>
                    <input defaultValue={match.scheduled_time} onBlur={(e) => updateMatch(match.id, 'scheduled_time', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Court</label>
                    <input defaultValue={match.court} onBlur={(e) => updateMatch(match.id, 'court', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Category</label>
                    <select value={match.category} onChange={(e) => updateMatch(match.id, 'category', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                      {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <TeamSelect matchId={match.id} teamId={match.team1_id} customName={match.team1_custom_name} teamNum={1} teamsList={teams} onUpdate={updateMatch} />
                  <TeamSelect matchId={match.id} teamId={match.team2_id} customName={match.team2_custom_name} teamNum={2} teamsList={teams} onUpdate={updateMatch} />
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Player/s Name (Team 1)</label>
                    <input defaultValue={match.team1_players || ''} onBlur={(e) => updateMatch(match.id, 'team1_players', e.target.value)} placeholder="e.g. Doubles 1" style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Player/s Name (Team 2)</label>
                    <input defaultValue={match.team2_players || ''} onBlur={(e) => updateMatch(match.id, 'team2_players', e.target.value)} placeholder="e.g. Doubles 2" style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                  </div>
                </div>
              )}

              {match.status !== 'completed' && (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team1_custom_name?.trim() || match.team1?.name || 'TBD'}</div>
                    <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team1_players?.trim() || '-'}</div>
                    <input type="number" id={`t1-${match.id}`} defaultValue={match.team1_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                  </div>
                  <span style={{ color: '#888888', fontWeight: 'bold' }}>VS</span>
                  <div style={{ flex: 1, textAlign: 'center', minWidth: '120px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team2_custom_name?.trim() || match.team2?.name || 'TBD'}</div>
                    <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team2_players?.trim() || '-'}</div>
                    <input type="number" id={`t2-${match.id}`} defaultValue={match.team2_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { const r = readScores(match.id); if (r) updateLiveScore(match.id, r.s1, r.s2); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Live Score</button>
                    <button onClick={() => { const r = readScores(match.id); if (r) completeMatch(match.id, r.s1, r.s2, match.team1_id, match.team2_id); }} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Complete</button>
                  </div>
                </div>
              )}
              {match.status === 'completed' && <div style={{ color: '#22c55e', fontSize: '14px', marginTop: '12px', textAlign: 'center' }}>Completed: {match.team1_score} - {match.team2_score} | Winner: {match.winner_id === match.team1_id ? (match.team1_custom_name?.trim() || match.team1?.name) : (match.team2_custom_name?.trim() || match.team2?.name)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Knockout games */}
      {knockoutMatches.length > 0 && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#C9A959', marginBottom: '16px' }}>Knockout Stage ({knockoutMatches.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {knockoutMatches.map((match: any) => (
              <div key={match.id} style={{ background: '#111111', border: '1px solid #C9A959', borderRadius: '4px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{match.round || match.knockout_round} - Game #{match.match_number} ({match.game_type})</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setEditingId(editingId === match.id ? null : match.id)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>{editingId === match.id ? 'CLOSE' : 'EDIT'}</button>
                    {match.status === 'completed' && <button onClick={() => resetMatchScore(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>RESET</button>}
                    <button onClick={() => deleteMatch(match.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>DELETE</button>
                  </div>
                </div>

                {editingId === match.id && (
                  <div style={{ background: '#0a0a0a', padding: '16px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <TeamSelect matchId={match.id} teamId={match.team1_id} customName={match.team1_custom_name} teamNum={1} teamsList={teams} onUpdate={updateMatch} />
                    <TeamSelect matchId={match.id} teamId={match.team2_id} customName={match.team2_custom_name} teamNum={2} teamsList={teams} onUpdate={updateMatch} />
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Slot / Round</label>
                      <select value={match.round || match.knockout_round} onChange={(e) => { const v = e.target.value; const ko = v === 'SF1' || v === 'SF2' ? 'Semi-Final' : v; supabase.from("matches").update({ round: v, knockout_round: ko }).eq("id", match.id).then(async () => { await fetchData(); notify(); }); }} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                        {knockoutSlots.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Game Type</label>
                      <select value={match.game_type} onChange={(e) => updateMatch(match.id, 'game_type', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px' }}>
                        <option value="Doubles 1">Doubles 1</option>
                        <option value="Doubles 2">Doubles 2</option>
                        <option value="Singles">Singles</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Court</label>
                      <input defaultValue={match.court} onBlur={(e) => updateMatch(match.id, 'court', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888888', marginBottom: '4px' }}>Time</label>
                      <input defaultValue={match.scheduled_time} onBlur={(e) => updateMatch(match.id, 'scheduled_time', e.target.value)} style={{ width: '100%', padding: '8px', background: '#111111', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                )}

                {match.status !== 'completed' && (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', marginTop: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team1_custom_name?.trim() || match.team1?.name || 'TBD'}</div>
                      <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team1_players?.trim() || '-'}</div>
                      <input type="number" id={`t1-${match.id}`} defaultValue={match.team1_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                    </div>
                    <span style={{ color: '#888888', fontWeight: 'bold' }}>VS</span>
                    <div style={{ flex: 1, textAlign: 'center', minWidth: '120px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>{match.team2_custom_name?.trim() || match.team2?.name || 'TBD'}</div>
                      <div style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>Player/s: {match.team2_players?.trim() || '-'}</div>
                      <input type="number" id={`t2-${match.id}`} defaultValue={match.team2_score || 0} style={{ width: '60px', padding: '8px', background: '#0a0a0a', border: '1px solid #2a2a2a', color: 'white', borderRadius: '4px', textAlign: 'center', marginTop: '8px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { const r = readScores(match.id); if (r) updateLiveScore(match.id, r.s1, r.s2); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Live Score</button>
                      <button onClick={() => { const r = readScores(match.id); if (r) completeMatch(match.id, r.s1, r.s2, match.team1_id, match.team2_id); }} style={{ background: '#C9A959', color: '#0a0a0a', border: 'none', padding: '8px 16px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Complete</button>
                    </div>
                  </div>
                )}
                {match.status === 'completed' && <div style={{ color: '#22c55e', fontSize: '14px', marginTop: '12px', textAlign: 'center' }}>Completed: {match.team1_score} - {match.team2_score} | Winner: {match.winner_id === match.team1_id ? (match.team1_custom_name?.trim() || match.team1?.name) : (match.team2_custom_name?.trim() || match.team2?.name)}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
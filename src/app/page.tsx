"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("All Teams");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Categories");
  const [competitionName, setCompetitionName] = useState("PickleballLive Tournament");
  const [loading, setLoading] = useState(true);

  const categories = [
    "All Categories",
    "Men's Singles",
    "Men's Doubles",
    "Women's Singles",
    "Women's Doubles",
    "Mixed Doubles",
    "Gender Neutral Doubles"
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: m } = await supabase
        .from("matches")
        .select("*, team1:team1_id(name), team2:team2_id(name)")
        .order("match_number");
      
      const { data: t } = await supabase.from("teams").select("*").order("name");
      
      const { data: settings } = await supabase
        .from("competition_settings")
        .select("*")
        .single();
      
      setMatches(m || []);
      setTeams(t || []);
      if (settings) setCompetitionName(settings.competition_name);
      setLoading(false);
    };
    
    fetchData();

    const channel = supabase
      .channel("public:matches")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, (payload) => {
        setMatches((currentMatches) => {
          if (payload.eventType === "INSERT") {
            return [...currentMatches, payload.new];
          } else if (payload.eventType === "UPDATE") {
            return currentMatches.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m));
          }
          return currentMatches;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredMatches = matches.filter((match) => {
    const teamMatch = selectedTeam === "All Teams" || 
      match.team1?.name === selectedTeam || 
      match.team2?.name === selectedTeam;
    
    const categoryMatch = selectedCategory === "All Categories" || 
      match.category === selectedCategory;
    
    return teamMatch && categoryMatch;
  });

  if (loading) return (
    <div className="text-center py-20">
      <div className="text-[#C9A959] text-lg font-medium animate-pulse">Loading...</div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Competition Header */}
      <div className="border-b border-[#1a1a1a] pb-6">
        <h1 className="text-3xl font-bold text-white mb-2">{competitionName}</h1>
        <p className="text-[#888] text-sm">Live scores and results</p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-4">
          <label className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2">
            Follow Your Team
          </label>
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="input-field w-full p-3 rounded text-sm"
          >
            <option value="All Teams">Show All Teams</option>
            {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>

        <div className="card p-4">
          <label className="block text-xs font-medium text-[#888] uppercase tracking-wider mb-2">
            Category
          </label>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field w-full p-3 rounded text-sm"
          >
            {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Matches */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-[#C9A959] rounded-full animate-pulse"></span>
          LIVE & UPCOMING MATCHES
        </h2>
        
        <div className="space-y-3">
          {filteredMatches.map((match: any) => (
            <div key={match.id} className="card card-hover p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-xs text-[#888] mb-1">{match.court}</div>
                  <div className="text-sm font-medium text-[#C9A959]">{match.scheduled_time}</div>
                </div>
                <div className="flex gap-2">
                  <span className="badge px-3 py-1 rounded">{match.game_type}</span>
                  {match.category && (
                    <span className="badge px-3 py-1 rounded bg-[#1a1a1a] text-[#888]">
                      {match.category}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <div className={`team-name ${match.winner_id === match.team1_id ? 'winner' : ''}`}>
                    {match.team1?.name || 'TBD'}
                  </div>
                </div>
                
                <div className="score-display px-8">
                  {match.status === 'completed' || match.status === 'live' ? (
                    <div className="text-center">
                      <div>{match.team1_score}</div>
                      <div className="text-xs text-[#888] font-normal mt-1">-</div>
                      <div>{match.team2_score}</div>
                    </div>
                  ) : (
                    <div className="text-sm font-medium text-[#888]">VS</div>
                  )}
                </div>

                <div className="flex-1 text-right">
                  <div className={`team-name ${match.winner_id === match.team2_id ? 'winner' : ''}`}>
                    {match.team2?.name || 'TBD'}
                  </div>
                </div>
              </div>

              {match.status === 'completed' && (
                <div className="mt-4 pt-3 border-t border-[#1a1a1a] text-center">
                  <span className="text-xs font-medium text-[#C9A959] uppercase tracking-wider">
                    Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {filteredMatches.length === 0 && (
            <div className="text-center py-12 text-[#888]">
              No matches found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
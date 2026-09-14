import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: matches } = await supabase
    .from("matches")
    .select("*, team1:team1_id(name), team2:team2_id(name)")
    .order("match_number", { ascending: true });

  const { data: teams } = await supabase.from("teams").select("*");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
          <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></span> 
          Match Schedule & Live Scores
        </h2>
        <div className="space-y-3">
          {matches?.map((match: any) => (
            <div key={match.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex justify-between text-xs text-gray-500 mb-3 uppercase tracking-wide">
                <span>{match.court} • {match.scheduled_time}</span>
                <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">{match.game_type}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex-1 space-y-2">
                  <p className={`font-bold text-gray-800 ${match.winner_id === match.team1_id ? 'text-green-700' : ''}`}>
                    {match.team1?.name || 'TBD'}
                  </p>
                  <p className={`font-bold text-gray-800 text-right ${match.winner_id === match.team2_id ? 'text-green-700' : ''}`}>
                    {match.team2?.name || 'TBD'}
                  </p>
                </div>
                <div className="text-2xl font-bold text-blue-900 mx-4 text-center w-16">
                  {match.status === 'completed' ? (
                    <>
                      <p>{match.team1_score}</p>
                      <p>{match.team2_score}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 font-normal">VS</p>
                  )}
                </div>
              </div>
              {match.status === 'completed' && (
                <div className="mt-3 pt-2 border-t border-gray-100 text-center text-xs text-green-600 font-bold uppercase tracking-wider">
                  Winner: {match.winner_id === match.team1_id ? match.team1?.name : match.team2?.name}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold text-blue-900 mb-4">Group Standings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {['A', 'B', 'C', 'D'].map((group) => (
            <div key={group} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-amber-600 mb-3 text-lg border-b border-amber-100 pb-2">Group {group}</h3>
              <div className="space-y-2">
                {teams?.filter((t: any) => t.group === group).map((team: any) => (
                  <div key={team.id} className="flex justify-between items-center text-sm py-1">
                    <span className="font-medium text-gray-800">{team.name}</span>
                    <span className="text-gray-500 font-mono text-xs bg-gray-100 px-2 py-1 rounded">0W - 0L</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
import { unstable_cache } from "next/cache";
import App from "./HomeApp";
import { GET as leagueData } from "./api/league-data/route";

// Render on each request (same context as /api/league-data, which works),
// so Google always gets real tables/players in the HTML. The sheet data
// itself is cached for 2 minutes so visits stay fast.
export const dynamic = "force-dynamic";

const getCachedLeagueData = unstable_cache(
  async () => {
    const res = await leagueData();
    const json = await res.json();
    if (!res.ok || !json || !json.tables || !json.players || json.error) {
      // Throw so a failed fetch is never cached.
      throw new Error((json && json.error) || `league-data returned ${res.status}`);
    }
    return json;
  },
  ["odc-home-league-data-v2"],
  { revalidate: 120 }
);

async function getInitialData() {
  try {
    return await getCachedLeagueData();
  } catch (error) {
    console.error("[home SSR] league data failed:", error);
    return null;
  }
}

export default async function Page() {
  const initialData = await getInitialData();
  return <App initialData={initialData} />;
}

import { unstable_cache } from "next/cache";
import App from "./HomeApp";
import { GET as leagueData } from "./api/league-data/route";

// Render the home page with the real league data in the HTML, so Google (and
// anyone on a slow phone) sees the actual tables, players and results instead
// of the demo placeholders. Rebuilt at most every 2 minutes; the browser still
// fetches fresh data straight after it loads.
export const revalidate = 120;

const getInitialData = unstable_cache(
  async () => {
    try {
      const res = await leagueData();
      if (!res.ok) return null;
      const json = await res.json();
      return json && json.tables && json.players && !json.error ? json : null;
    } catch {
      return null;
    }
  },
  ["odc-home-league-data"],
  { revalidate: 120 }
);

export default async function Page() {
  const initialData = await getInitialData();
  return <App initialData={initialData} />;
}

import PlayerCardClient from "./PlayerCardClient";

export async function generateMetadata({ params }) {
  const slug = decodeURIComponent(params?.name || "");
  const pretty = slug.replace(/-/g, " ");
  const title = `${pretty} — ODC Player Card`;
  const description = `${pretty}'s stats on the Online Darts Circuit — average, wins, 180s and form. Season 4.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://onlinedartscircuit.co.uk/player/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Page() {
  return <PlayerCardClient />;
}

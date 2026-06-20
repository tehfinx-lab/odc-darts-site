// Server-side proxy to the Predictions Apps Script (avoids browser CORS).
// Kept as simple as possible so it can't crash the route.

export const dynamic = "force-dynamic";

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwgYMa3bXTQZIzuCp4fNyVwm46QvXqk72gY5UiK9pNd1ZonxWlB7i9-vUtMBR1rMbH7Ng/exec";

function jsonResponse(obj) {
  return new Response(JSON.stringify(obj), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  try {
    const res = await fetch(SCRIPT_URL, { redirect: "follow" });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { ok: false, error: "Script did not return JSON", raw: text.slice(0, 300) };
    }
    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), predictions: [] });
  }
}

export async function POST(request) {
  try {
    const body = await request.text();
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      body: body,
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { ok: false, error: "Script did not return JSON", raw: text.slice(0, 300) };
    }
    return jsonResponse(data);
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

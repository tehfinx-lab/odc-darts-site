
// ODC Pub Rivalry API — see lib/rivalry.js for how the sheet is read.
import * as XLSX from "xlsx";
import { RIVALRY_SHEET_ID, buildRivalry } from "../../../lib/rivalry";

export const revalidate = 60;

export async function GET() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${RIVALRY_SHEET_ID}/export?format=xlsx`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Sheet export failed (${res.status}) — is it shared "anyone with the link"?`);
    const buf = Buffer.from(await res.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    return Response.json(buildRivalry(wb));
  } catch (err) {
    return Response.json({ ok: false, error: String(err?.message || err) }, { status: 200 });
  }
}

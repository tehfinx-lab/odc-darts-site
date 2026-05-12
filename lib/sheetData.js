const SHEET_ID = "12g5hf6mPmQDBiDb-kN8zozOJfddmU5utOaq7YCzGRLk";

export async function getSheetData(sheetName) {
  const url = `https://opensheet.elk.sh/${SHEET_ID}/${sheetName}`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch sheet data");
  }

  return res.json();
}

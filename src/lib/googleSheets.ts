import { google } from "googleapis";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function getAuth() {
  const privateKey = requiredEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  return new google.auth.GoogleAuth({
    credentials: {
      project_id: requiredEnv("GOOGLE_PROJECT_ID"),
      client_email: requiredEnv("GOOGLE_CLIENT_EMAIL"),
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

export async function readSheet(range: string): Promise<string[][]> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: requiredEnv("GOOGLE_SHEET_ID"),
    range,
  });
  return (response.data.values ?? []) as string[][];
}

export async function appendRows(range: string, rows: Array<Array<string | number>>): Promise<void> {
  const sheets = google.sheets({ version: "v4", auth: getAuth() });
  await sheets.spreadsheets.values.append({
    spreadsheetId: requiredEnv("GOOGLE_SHEET_ID"),
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: rows },
  });
}

export function sheetName(envName: string, fallback: string): string {
  return process.env[envName] || fallback;
}

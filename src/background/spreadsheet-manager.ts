import browser from "webextension-polyfill";
import type { StorageSchema } from "../shared/types";
import {
  searchDriveFile,
  createSpreadsheet,
  getSheetNames,
  addSheet,
  updateRange,
  setupNewSheetFormatting,
  escapeSheetName,
} from "./sheets-api";

const HEADER_ROW = ["Date", "Title", "Link", "Type", "Notes", "Status"];
const STATUS_OPTIONS = ["Todo", "In progress", "Done"];
const DEFAULT_SHEET_NAME = "Default";

/** Get current target sheet name from storage (or fallback to "Default"). */
export async function getSheetName(): Promise<string> {
  const data = (await browser.storage.local.get("sheetName")) as StorageSchema;
  return data.sheetName ?? DEFAULT_SHEET_NAME;
}

/**
 * Initialise the Knots spreadsheet:
 *  1. Search Drive for existing "Knots" spreadsheet
 *  2. Create if not found
 *  3. Store spreadsheetId in local storage
 *  4. Ensure the target sheet exists with header + validation
 * Returns { spreadsheetId, sheetNames } so callers can cache sheet names without
 * an extra API call.
 */
export async function initSpreadsheet(): Promise<{ spreadsheetId: string; sheetNames: string[] }> {
  // Check if we already have a stored ID
  const stored = (await browser.storage.local.get(
    "spreadsheetId",
  )) as StorageSchema;
  if (stored.spreadsheetId) {
    try {
      const sheetName = await getSheetName();
      const sheetNames = await ensureSheet(stored.spreadsheetId, sheetName);
      return { spreadsheetId: stored.spreadsheetId, sheetNames };
    } catch {
      // Spreadsheet was deleted or is inaccessible — clear stale ID and continue
      await browser.storage.local.remove("spreadsheetId");
    }
  }

  const sheetName = await getSheetName();

  // Search for existing
  const existing = await searchDriveFile("Knots Sheets");
  if (existing) {
    try {
      await browser.storage.local.set({ spreadsheetId: existing.id });
      const sheetNames = await ensureSheet(existing.id, sheetName);
      return { spreadsheetId: existing.id, sheetNames };
    } catch {
      // Drive file exists but is inaccessible — clear and fall through to create
      await browser.storage.local.remove("spreadsheetId");
    }
  }

  // Create new
  const { spreadsheetId, sheetId } = await createSpreadsheet("Knots Sheets", sheetName);
  await browser.storage.local.set({ spreadsheetId });

  // Write header row
  await updateRange(spreadsheetId, `'${escapeSheetName(sheetName)}'!A1:F1`, [HEADER_ROW]);

  // Set up all formatting in a single batchUpdate call
  await setupNewSheetFormatting(spreadsheetId, sheetId, 5, STATUS_OPTIONS);

  return { spreadsheetId, sheetNames: [sheetName] };
}

/**
 * Ensure a named sheet exists in the spreadsheet.
 * Creates it + writes header + adds status validation if missing.
 */
/**
 * Ensure a named sheet exists in the spreadsheet.
 * Creates it + sets up formatting if missing.
 * Returns the list of sheet names (for caching, avoiding a second API call).
 */
export async function ensureSheet(
  ssId: string,
  name: string,
): Promise<string[]> {
  const sheets = await getSheetNames(ssId);
  const sheetNames = sheets.map((s) => s.title);
  const found = sheets.find((s) => s.title === name);
  if (found) return sheetNames; // already exists — formatting was applied at creation time

  const sheetId = await addSheet(ssId, name);
  await updateRange(ssId, `'${escapeSheetName(name)}'!A1:F1`, [HEADER_ROW]);
  // Single batchUpdate for all formatting (header + validation + conditional)
  await setupNewSheetFormatting(ssId, sheetId, 5, STATUS_OPTIONS);
  return [...sheetNames, name];
}

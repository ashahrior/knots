import { describe, it, expect, beforeEach, vi } from "vitest";
import { __resetStorage, __setStorage } from "./__mocks__/webextension-polyfill";

// Mock sheets-api before importing spreadsheet-manager
vi.mock("../src/background/sheets-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/background/sheets-api")>();
  return {
    ...actual,
    searchDriveFile: vi.fn(),
    createSpreadsheet: vi.fn(),
    getSheetNames: vi.fn(),
    addSheet: vi.fn(),
    updateRange: vi.fn(),
    setupNewSheetFormatting: vi.fn(),
  };
});

import { initSpreadsheet, ensureSheet, getSheetName } from "../src/background/spreadsheet-manager";
import * as sheetsApi from "../src/background/sheets-api";

describe("spreadsheet-manager", () => {
  beforeEach(() => {
    __resetStorage();
    vi.clearAllMocks();
  });

  describe("getSheetName", () => {
    it("returns 'Default' when no sheet name is set", async () => {
      const name = await getSheetName();
      expect(name).toBe("Default");
    });

    it("returns stored sheet name", async () => {
      __setStorage({ sheetName: "Custom" });
      const name = await getSheetName();
      expect(name).toBe("Custom");
    });
  });

  describe("initSpreadsheet", () => {
    it("returns stored spreadsheetId if already saved", async () => {
      __setStorage({ spreadsheetId: "existing-id-123" });
      vi.mocked(sheetsApi.getSheetNames).mockResolvedValue([
        { title: "Default", sheetId: 0 },
      ]);

      const result = await initSpreadsheet();
      expect(result.spreadsheetId).toBe("existing-id-123");
      expect(result.sheetNames).toEqual(["Default"]);
      expect(sheetsApi.createSpreadsheet).not.toHaveBeenCalled();
    });

    it("searches Drive and stores id if spreadsheet found", async () => {
      vi.mocked(sheetsApi.searchDriveFile).mockResolvedValue({
        id: "found-id",
      });
      vi.mocked(sheetsApi.getSheetNames).mockResolvedValue([
        { title: "Default", sheetId: 0 },
      ]);

      const result = await initSpreadsheet();
      expect(result.spreadsheetId).toBe("found-id");
      expect(result.sheetNames).toEqual(["Default"]);
      expect(sheetsApi.searchDriveFile).toHaveBeenCalledWith("Knots Sheets");
    });

    it("creates a new spreadsheet if none found", async () => {
      vi.mocked(sheetsApi.searchDriveFile).mockResolvedValue(null);
      vi.mocked(sheetsApi.createSpreadsheet).mockResolvedValue({
        spreadsheetId: "new-id",
        sheetId: 0,
      });

      const result = await initSpreadsheet();
      expect(result.spreadsheetId).toBe("new-id");
      expect(result.sheetNames).toEqual(["Default"]);
      expect(sheetsApi.createSpreadsheet).toHaveBeenCalledWith("Knots Sheets", "Default");
      expect(sheetsApi.updateRange).toHaveBeenCalledWith(
        "new-id",
        "'Default'!A1:F1",
        [["Date", "Title", "Link", "Type", "Notes", "Status"]],
      );
      expect(sheetsApi.setupNewSheetFormatting).toHaveBeenCalledWith(
        "new-id",
        0,
        5,
        ["Todo", "In progress", "Done"],
      );
    });

    it("recovers from a deleted spreadsheet (stale stored ID)", async () => {
      __setStorage({ spreadsheetId: "stale-id" });
      // ensureSheet will call getSheetNames which throws (file deleted)
      vi.mocked(sheetsApi.getSheetNames).mockRejectedValueOnce(
        new Error("Get sheets failed: 404"),
      );
      // After clearing stale ID, falls through to Drive search → nothing found → create
      vi.mocked(sheetsApi.searchDriveFile).mockResolvedValue(null);
      vi.mocked(sheetsApi.createSpreadsheet).mockResolvedValue({
        spreadsheetId: "fresh-id",
        sheetId: 0,
      });

      const result = await initSpreadsheet();
      expect(result.spreadsheetId).toBe("fresh-id");
      expect(sheetsApi.createSpreadsheet).toHaveBeenCalled();
    });

    it("recovers from an inaccessible Drive search result", async () => {
      // No stored ID → Drive finds a file but it's inaccessible
      vi.mocked(sheetsApi.searchDriveFile).mockResolvedValue({ id: "bad-id" });
      vi.mocked(sheetsApi.getSheetNames).mockRejectedValueOnce(
        new Error("Get sheets failed: 403"),
      );
      vi.mocked(sheetsApi.createSpreadsheet).mockResolvedValue({
        spreadsheetId: "new-id",
        sheetId: 0,
      });

      const result = await initSpreadsheet();
      expect(result.spreadsheetId).toBe("new-id");
      expect(sheetsApi.createSpreadsheet).toHaveBeenCalled();
    });
  });

  describe("ensureSheet", () => {
    it("does nothing if sheet already exists", async () => {
      vi.mocked(sheetsApi.getSheetNames).mockResolvedValue([
        { title: "MySheet", sheetId: 1 },
      ]);

      const names = await ensureSheet("ss-id", "MySheet");
      expect(names).toEqual(["MySheet"]);
      expect(sheetsApi.addSheet).not.toHaveBeenCalled();
      expect(sheetsApi.setupNewSheetFormatting).not.toHaveBeenCalled();
    });

    it("creates sheet if not found", async () => {
      vi.mocked(sheetsApi.getSheetNames).mockResolvedValue([
        { title: "Default", sheetId: 0 },
      ]);
      vi.mocked(sheetsApi.addSheet).mockResolvedValue(42);

      const names = await ensureSheet("ss-id", "NewSheet");
      expect(names).toEqual(["Default", "NewSheet"]);
      expect(sheetsApi.addSheet).toHaveBeenCalledWith("ss-id", "NewSheet");
      expect(sheetsApi.updateRange).toHaveBeenCalledWith(
        "ss-id",
        "'NewSheet'!A1:F1",
        [["Date", "Title", "Link", "Type", "Notes", "Status"]],
      );
      expect(sheetsApi.setupNewSheetFormatting).toHaveBeenCalledWith(
        "ss-id",
        42,
        5,
        ["Todo", "In progress", "Done"],
      );
    });
  });
});

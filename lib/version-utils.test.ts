/**
 * Tests for Version Control Utilities
 */

import { describe, it, expect } from "vitest";
import {
  createVersionSnapshot,
  parseVersionSnapshot,
  getAllVersions,
  findVersion,
  calculateDiff,
  pruneVersionHistory,
  isValidVersionNumber,
  getNextVersion,
  ServerData,
} from "./version-utils";

describe("Version Control Utilities", () => {
  const mockServer: ServerData = {
    code: "const v1 = 'code';",
    version: 1,
    previousVersions: [],
    tools: [{ name: "test", description: "test tool", schema: {} }],
    deploymentUrl: "https://example.com",
    status: "draft",
  };

  describe("createVersionSnapshot", () => {
    it("should create a version snapshot", () => {
      const snapshot = createVersionSnapshot(mockServer);
      expect(snapshot).toBeTruthy();
      expect(typeof snapshot).toBe("string");
    });

    it("should include version number", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = JSON.parse(snapshot);
      expect(parsed.version).toBe(1);
    });

    it("should include code", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = JSON.parse(snapshot);
      expect(parsed.code).toBe("const v1 = 'code';");
    });

    it("should include timestamp", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = JSON.parse(snapshot);
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it("should include custom change description", () => {
      const snapshot = createVersionSnapshot(mockServer, "Fixed bug");
      const parsed = JSON.parse(snapshot);
      expect(parsed.changeDescription).toBe("Fixed bug");
    });

    it("should use default change description", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = JSON.parse(snapshot);
      expect(parsed.changeDescription).toBe("Manual save");
    });

    it("should include tools", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = JSON.parse(snapshot);
      expect(parsed.tools).toHaveLength(1);
    });

    it("should include deployment URL", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = JSON.parse(snapshot);
      expect(parsed.deploymentUrl).toBe("https://example.com");
    });
  });

  describe("parseVersionSnapshot", () => {
    it("should parse valid snapshot", () => {
      const snapshot = createVersionSnapshot(mockServer);
      const parsed = parseVersionSnapshot(snapshot);
      expect(parsed).toBeTruthy();
      expect(parsed?.version).toBe(1);
    });

    it("should return null for invalid JSON", () => {
      const parsed = parseVersionSnapshot("invalid json");
      expect(parsed).toBeNull();
    });

    it("should return null for empty string", () => {
      const parsed = parseVersionSnapshot("");
      expect(parsed).toBeNull();
    });

    it("should parse snapshot with all fields", () => {
      const snapshot = createVersionSnapshot(mockServer, "Test change");
      const parsed = parseVersionSnapshot(snapshot);
      expect(parsed?.version).toBe(1);
      expect(parsed?.code).toBe("const v1 = 'code';");
      expect(parsed?.changeDescription).toBe("Test change");
    });
  });

  describe("getAllVersions", () => {
    it("should return current version when no history", () => {
      const versions = getAllVersions(mockServer, Date.now());
      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe(1);
    });

    it("should return all versions including current", () => {
      const serverWithHistory: ServerData = {
        ...mockServer,
        version: 3,
        previousVersions: [
          createVersionSnapshot({ ...mockServer, version: 1 }),
          createVersionSnapshot({ ...mockServer, version: 2 }),
        ],
      };

      const versions = getAllVersions(serverWithHistory, Date.now());
      expect(versions).toHaveLength(3);
    });

    it("should list versions in reverse chronological order", () => {
      const serverWithHistory: ServerData = {
        ...mockServer,
        version: 3,
        previousVersions: [
          createVersionSnapshot({ ...mockServer, version: 1 }),
          createVersionSnapshot({ ...mockServer, version: 2 }),
        ],
      };

      const versions = getAllVersions(serverWithHistory, Date.now());
      expect(versions[0].version).toBe(3); // current
      expect(versions[1].version).toBe(2);
      expect(versions[2].version).toBe(1);
    });

    it("should skip invalid snapshots", () => {
      const serverWithBadHistory: ServerData = {
        ...mockServer,
        version: 2,
        previousVersions: ["invalid json", createVersionSnapshot(mockServer)],
      };

      const versions = getAllVersions(serverWithBadHistory, Date.now());
      expect(versions).toHaveLength(2); // current + 1 valid
    });

    it("should handle empty previous versions array", () => {
      const versions = getAllVersions(mockServer, Date.now());
      expect(versions).toHaveLength(1);
    });
  });

  describe("findVersion", () => {
    it("should find current version", () => {
      const version = findVersion(mockServer, 1, Date.now());
      expect(version).toBeTruthy();
      expect(version?.version).toBe(1);
    });

    it("should find previous version", () => {
      const serverWithHistory: ServerData = {
        ...mockServer,
        version: 2,
        previousVersions: [createVersionSnapshot(mockServer)],
      };

      const version = findVersion(serverWithHistory, 1, Date.now());
      expect(version).toBeTruthy();
      expect(version?.version).toBe(1);
    });

    it("should return null for non-existent version", () => {
      const version = findVersion(mockServer, 999, Date.now());
      expect(version).toBeNull();
    });

    it("should return null when no history", () => {
      const version = findVersion(mockServer, 0, Date.now());
      expect(version).toBeNull();
    });

    it("should skip invalid snapshots", () => {
      const serverWithBadHistory: ServerData = {
        ...mockServer,
        version: 2,
        previousVersions: ["invalid", "also invalid"],
      };

      const version = findVersion(serverWithBadHistory, 1, Date.now());
      expect(version).toBeNull();
    });
  });

  describe("calculateDiff", () => {
    it("should calculate lines added", () => {
      const codeA = "line1\nline2";
      const codeB = "line1\nline2\nline3";
      const diff = calculateDiff(codeA, codeB);
      expect(diff.linesAdded).toBe(1);
    });

    it("should calculate lines removed", () => {
      const codeA = "line1\nline2\nline3";
      const codeB = "line1\nline2";
      const diff = calculateDiff(codeA, codeB);
      expect(diff.linesRemoved).toBe(1);
    });

    it("should calculate characters changed", () => {
      const codeA = "short";
      const codeB = "much longer text";
      const diff = calculateDiff(codeA, codeB);
      expect(diff.charactersChanged).toBeGreaterThan(0);
    });

    it("should handle empty code", () => {
      const diff = calculateDiff("", "");
      expect(diff.linesAdded).toBe(0);
      expect(diff.linesRemoved).toBe(0);
      expect(diff.charactersChanged).toBe(0);
    });

    it("should handle identical code", () => {
      const code = "const x = 1;";
      const diff = calculateDiff(code, code);
      expect(diff.linesAdded).toBe(0);
      expect(diff.linesRemoved).toBe(0);
      expect(diff.charactersChanged).toBe(0);
    });

    it("should handle adding to empty code", () => {
      const diff = calculateDiff("", "new code");
      expect(diff.linesAdded).toBeGreaterThanOrEqual(0);
      expect(diff.charactersChanged).toBeGreaterThan(0);
    });

    it("should handle removing all code", () => {
      const diff = calculateDiff("some code", "");
      expect(diff.linesRemoved).toBeGreaterThanOrEqual(0);
      expect(diff.charactersChanged).toBeGreaterThan(0);
    });
  });

  describe("pruneVersionHistory", () => {
    it("should prune old versions", () => {
      const versions = ["v1", "v2", "v3", "v4", "v5"];
      const result = pruneVersionHistory(versions, 2);
      expect(result.remaining).toHaveLength(2);
      expect(result.pruned).toHaveLength(3);
    });

    it("should keep most recent versions", () => {
      const versions = ["v1", "v2", "v3", "v4", "v5"];
      const result = pruneVersionHistory(versions, 2);
      expect(result.remaining).toEqual(["v4", "v5"]);
    });

    it("should not prune if under limit", () => {
      const versions = ["v1", "v2", "v3"];
      const result = pruneVersionHistory(versions, 10);
      expect(result.remaining).toHaveLength(3);
      expect(result.pruned).toHaveLength(0);
    });

    it("should handle empty array", () => {
      const result = pruneVersionHistory([], 5);
      expect(result.remaining).toHaveLength(0);
      expect(result.pruned).toHaveLength(0);
    });

    it("should use default keep count of 10", () => {
      const versions = Array.from({ length: 15 }, (_, i) => `v${i + 1}`);
      const result = pruneVersionHistory(versions, 0);
      expect(result.remaining).toHaveLength(10);
    });

    it("should handle keepCount of 1", () => {
      const versions = ["v1", "v2", "v3"];
      const result = pruneVersionHistory(versions, 1);
      expect(result.remaining).toEqual(["v3"]);
      expect(result.pruned).toHaveLength(2);
    });
  });

  describe("isValidVersionNumber", () => {
    it("should validate positive integers", () => {
      expect(isValidVersionNumber(1)).toBe(true);
      expect(isValidVersionNumber(100)).toBe(true);
    });

    it("should reject zero", () => {
      expect(isValidVersionNumber(0)).toBe(false);
    });

    it("should reject negative numbers", () => {
      expect(isValidVersionNumber(-1)).toBe(false);
    });

    it("should reject decimals", () => {
      expect(isValidVersionNumber(1.5)).toBe(false);
    });

    it("should reject NaN", () => {
      expect(isValidVersionNumber(NaN)).toBe(false);
    });

    it("should reject Infinity", () => {
      expect(isValidVersionNumber(Infinity)).toBe(false);
    });
  });

  describe("getNextVersion", () => {
    it("should increment version", () => {
      expect(getNextVersion(1)).toBe(2);
      expect(getNextVersion(5)).toBe(6);
    });

    it("should handle large version numbers", () => {
      expect(getNextVersion(9999)).toBe(10000);
    });

    it("should handle version 1", () => {
      expect(getNextVersion(1)).toBe(2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long code in snapshots", () => {
      const longCode = "const x = 1;\n".repeat(10000);
      const serverWithLongCode: ServerData = {
        ...mockServer,
        code: longCode,
      };

      const snapshot = createVersionSnapshot(serverWithLongCode);
      const parsed = parseVersionSnapshot(snapshot);
      expect(parsed?.code).toBe(longCode);
    });

    it("should handle special characters in code", () => {
      const specialCode = 'const str = "Hello 👋 World! ñ á é í ó ú";';
      const serverWithSpecialCode: ServerData = {
        ...mockServer,
        code: specialCode,
      };

      const snapshot = createVersionSnapshot(serverWithSpecialCode);
      const parsed = parseVersionSnapshot(snapshot);
      expect(parsed?.code).toBe(specialCode);
    });

    it("should handle empty tools array", () => {
      const serverWithNoTools: ServerData = {
        ...mockServer,
        tools: [],
      };

      const snapshot = createVersionSnapshot(serverWithNoTools);
      const parsed = parseVersionSnapshot(snapshot);
      expect(parsed?.tools).toHaveLength(0);
    });

    it("should handle missing optional fields", () => {
      const serverWithoutOptionals: ServerData = {
        code: "code",
        version: 1,
        previousVersions: [],
        tools: [],
        status: "draft",
      };

      const snapshot = createVersionSnapshot(serverWithoutOptionals);
      const parsed = parseVersionSnapshot(snapshot);
      expect(parsed).toBeTruthy();
      expect(parsed?.deploymentUrl).toBeUndefined();
    });

    it("should handle large version history", () => {
      const largeHistory = Array.from({ length: 1000 }, (_, i) =>
        createVersionSnapshot({ ...mockServer, version: i + 1 })
      );

      const result = pruneVersionHistory(largeHistory, 10);
      expect(result.remaining).toHaveLength(10);
      expect(result.pruned).toHaveLength(990);
    });
  });
});

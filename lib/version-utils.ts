/**
 * Version Control Utilities
 * Pure functions for version management logic
 */

export interface VersionSnapshot {
  version: number;
  code: string;
  timestamp: number;
  changeDescription: string;
  tools: any[];
  deploymentUrl?: string;
  status: string;
}

export interface ServerData {
  code: string;
  version: number;
  previousVersions: string[];
  tools: any[];
  deploymentUrl?: string;
  status: string;
}

/**
 * Create a version snapshot
 */
export function createVersionSnapshot(
  server: ServerData,
  changeDescription?: string
): string {
  const snapshot: VersionSnapshot = {
    version: server.version,
    code: server.code,
    timestamp: Date.now(),
    changeDescription: changeDescription || "Manual save",
    tools: server.tools,
    deploymentUrl: server.deploymentUrl,
    status: server.status,
  };

  return JSON.stringify(snapshot);
}

/**
 * Parse version snapshot from string
 */
export function parseVersionSnapshot(
  snapshotString: string
): VersionSnapshot | null {
  try {
    return JSON.parse(snapshotString);
  } catch (error) {
    return null;
  }
}

/**
 * Get all versions (current + previous)
 */
export function getAllVersions(
  server: ServerData,
  creationTime: number
): VersionSnapshot[] {
  const versions: VersionSnapshot[] = [];

  // Add current version
  versions.push({
    version: server.version,
    code: server.code,
    timestamp: creationTime,
    changeDescription: "Current version",
    tools: server.tools,
    deploymentUrl: server.deploymentUrl,
    status: server.status,
  });

  // Add previous versions (most recent first)
  if (server.previousVersions) {
    server.previousVersions
      .slice()
      .reverse()
      .forEach((snapshotString) => {
        const snapshot = parseVersionSnapshot(snapshotString);
        if (snapshot) {
          versions.push(snapshot);
        }
      });
  }

  return versions;
}

/**
 * Find a specific version
 */
export function findVersion(
  server: ServerData,
  versionNumber: number,
  creationTime: number
): VersionSnapshot | null {
  // Check if it's the current version
  if (versionNumber === server.version) {
    return {
      version: server.version,
      code: server.code,
      timestamp: creationTime,
      changeDescription: "Current version",
      tools: server.tools,
      deploymentUrl: server.deploymentUrl,
      status: server.status,
    };
  }

  // Search in previous versions
  if (server.previousVersions) {
    for (const snapshotString of server.previousVersions) {
      const snapshot = parseVersionSnapshot(snapshotString);
      if (snapshot && snapshot.version === versionNumber) {
        return snapshot;
      }
    }
  }

  return null;
}

/**
 * Calculate diff between two code strings
 */
export function calculateDiff(codeA: string, codeB: string) {
  const linesA = codeA.split("\n");
  const linesB = codeB.split("\n");

  return {
    linesAdded: Math.max(0, linesB.length - linesA.length),
    linesRemoved: Math.max(0, linesA.length - linesB.length),
    charactersChanged: Math.abs(codeB.length - codeA.length),
  };
}

/**
 * Prune old versions, keeping only the most recent N
 */
export function pruneVersionHistory(
  previousVersions: string[],
  keepCount: number
): { pruned: string[]; remaining: string[] } {
  const count = keepCount > 0 ? keepCount : 10;

  if (previousVersions.length <= count) {
    return {
      pruned: [],
      remaining: previousVersions,
    };
  }

  const remaining = previousVersions.slice(-count);
  const pruned = previousVersions.slice(0, previousVersions.length - count);

  return { pruned, remaining };
}

/**
 * Validate version number
 */
export function isValidVersionNumber(version: number): boolean {
  return Number.isInteger(version) && version >= 1;
}

/**
 * Get next version number
 */
export function getNextVersion(currentVersion: number): number {
  return currentVersion + 1;
}

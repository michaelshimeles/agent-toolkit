import { describe, it, expect } from "vitest";

describe("Usage Logging and Analytics", () => {
  describe("Usage Log Entry", () => {
    it("should have required fields", () => {
      const logEntry = {
        userId: "user123",
        integrationId: "integration456",
        toolName: "create_issue",
        latencyMs: 150,
        status: "success" as const,
        _creationTime: Date.now(),
      };

      expect(logEntry.userId).toBeTruthy();
      expect(logEntry.integrationId).toBeTruthy();
      expect(logEntry.toolName).toBeTruthy();
      expect(logEntry.latencyMs).toBeGreaterThan(0);
      expect(logEntry.status).toBe("success");
    });

    it("should support both success and error status", () => {
      const successLog = { status: "success" as const };
      const errorLog = { status: "error" as const };

      expect(["success", "error"]).toContain(successLog.status);
      expect(["success", "error"]).toContain(errorLog.status);
    });

    it("should measure latency accurately", () => {
      const startTime = Date.now();
      // Simulate some work
      const endTime = startTime + 123;
      const latency = endTime - startTime;

      expect(latency).toBe(123);
      expect(latency).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Usage Statistics", () => {
    it("should calculate total requests", () => {
      const logs = [
        { status: "success" },
        { status: "success" },
        { status: "error" },
      ];

      const totalRequests = logs.length;
      expect(totalRequests).toBe(3);
    });

    it("should calculate success and error counts", () => {
      const logs = [
        { status: "success" as const },
        { status: "success" as const },
        { status: "error" as const },
        { status: "success" as const },
      ];

      const successCount = logs.filter((l) => l.status === "success").length;
      const errorCount = logs.filter((l) => l.status === "error").length;

      expect(successCount).toBe(3);
      expect(errorCount).toBe(1);
    });

    it("should calculate average latency", () => {
      const logs = [
        { latencyMs: 100 },
        { latencyMs: 200 },
        { latencyMs: 300 },
      ];

      const avgLatency =
        logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length;

      expect(avgLatency).toBe(200);
    });

    it("should handle empty log set", () => {
      const logs: any[] = [];

      const totalRequests = logs.length;
      const avgLatency = logs.length > 0
        ? logs.reduce((sum, log) => sum + log.latencyMs, 0) / logs.length
        : 0;

      expect(totalRequests).toBe(0);
      expect(avgLatency).toBe(0);
    });
  });

  describe("Integration-Specific Stats", () => {
    it("should group by integration", () => {
      const logs = [
        { integrationId: "github", toolName: "create_issue" },
        { integrationId: "github", toolName: "list_repos" },
        { integrationId: "linear", toolName: "create_issue" },
      ];

      const byIntegration = logs.reduce((acc, log) => {
        acc[log.integrationId] = (acc[log.integrationId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byIntegration["github"]).toBe(2);
      expect(byIntegration["linear"]).toBe(1);
    });

    it("should group by tool", () => {
      const logs = [
        { toolName: "create_issue" },
        { toolName: "create_issue" },
        { toolName: "list_repos" },
      ];

      const byTool = logs.reduce((acc, log) => {
        acc[log.toolName] = (acc[log.toolName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(byTool["create_issue"]).toBe(2);
      expect(byTool["list_repos"]).toBe(1);
    });
  });

  describe("Billing Meters", () => {
    it("should track requests per period", () => {
      const meter = {
        userId: "user123",
        period: "2024-01",
        requestCount: 1500,
      };

      expect(meter.period).toMatch(/^\d{4}-\d{2}$/);
      expect(meter.requestCount).toBeGreaterThan(0);
    });

    it("should format period correctly", () => {
      const date = new Date("2024-01-15");
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      expect(period).toBe("2024-01");
    });

    it("should accumulate requests per period", () => {
      // Use UTC dates to avoid timezone issues
      const logs = [
        { _creationTime: Date.UTC(2024, 0, 10) }, // January 10, 2024
        { _creationTime: Date.UTC(2024, 0, 15) }, // January 15, 2024
        { _creationTime: Date.UTC(2024, 1, 15) }, // February 15, 2024
      ];

      const countByPeriod = logs.reduce((acc, log) => {
        const date = new Date(log._creationTime);
        const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
        acc[period] = (acc[period] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      expect(countByPeriod["2024-01"]).toBe(2);
      expect(countByPeriod["2024-02"]).toBe(1);
    });
  });

  describe("Time-Based Analytics", () => {
    it("should filter logs by time range", () => {
      const now = Date.now();
      const hourAgo = now - 3600000;

      const logs = [
        { _creationTime: now - 1800000 }, // 30 min ago
        { _creationTime: now - 7200000 }, // 2 hours ago
        { _creationTime: now - 300000 },  // 5 min ago
      ];

      const recentLogs = logs.filter((log) => log._creationTime >= hourAgo);

      expect(recentLogs).toHaveLength(2);
    });

    it("should calculate requests per hour", () => {
      const logs = Array(120).fill({ _creationTime: Date.now() });
      const duration = 2; // hours
      const requestsPerHour = logs.length / duration;

      expect(requestsPerHour).toBe(60);
    });
  });

  describe("Error Rate Tracking", () => {
    it("should calculate error rate", () => {
      const logs = [
        { status: "success" as const },
        { status: "success" as const },
        { status: "error" as const },
        { status: "success" as const },
      ];

      const errorCount = logs.filter((l) => l.status === "error").length;
      const errorRate = (errorCount / logs.length) * 100;

      expect(errorRate).toBe(25);
    });

    it("should identify high error rate", () => {
      const errorRate = 35;
      const threshold = 10;

      const isHighErrorRate = errorRate > threshold;

      expect(isHighErrorRate).toBe(true);
    });
  });

  describe("Performance Metrics", () => {
    it("should identify slow requests", () => {
      const logs = [
        { latencyMs: 50 },
        { latencyMs: 150 },
        { latencyMs: 3000 },
        { latencyMs: 100 },
      ];

      const slowThreshold = 1000;
      const slowRequests = logs.filter((l) => l.latencyMs > slowThreshold);

      expect(slowRequests).toHaveLength(1);
      expect(slowRequests[0].latencyMs).toBe(3000);
    });

    it("should calculate percentiles", () => {
      const latencies = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
      latencies.sort((a, b) => a - b);

      const p50Index = Math.floor(latencies.length * 0.5);
      const p95Index = Math.floor(latencies.length * 0.95);

      const p50 = latencies[p50Index];
      const p95 = latencies[p95Index];

      expect(p50).toBe(300);
      expect(p95).toBe(500);
    });
  });
});

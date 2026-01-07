import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { logger, generateRequestId, createRequestLogger, type LogLevel } from "./logger";

describe("Logger", () => {
  beforeEach(() => {
    logger.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Request ID Generation", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).not.toBe(id2);
    });

    it("should start with req_ prefix", () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_/);
    });

    it("should include timestamp", () => {
      const id = generateRequestId();
      const parts = id.split("_");

      expect(parts.length).toBeGreaterThanOrEqual(2);
      expect(parseInt(parts[1])).toBeGreaterThan(0);
    });
  });

  describe("Basic Logging", () => {
    it("should log info messages", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test message", context);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("info");
      expect(logs[0].message).toBe("Test message");
    });

    it("should log warn messages", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.warn("Warning message", context);

      const logs = logger.getLogs();
      expect(logs[0].level).toBe("warn");
    });

    it("should log error messages", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.error("Error message", context);

      const logs = logger.getLogs();
      expect(logs[0].level).toBe("error");
    });

    it("should log debug messages", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.debug("Debug message", context);

      const logs = logger.getLogs();
      expect(logs[0].level).toBe("debug");
    });
  });

  describe("Log Context", () => {
    it("should include request ID in context", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context);

      const logs = logger.getLogs();
      expect(logs[0].context.requestId).toBe("req_123");
    });

    it("should include HTTP method in context", () => {
      const context = {
        requestId: "req_123",
        method: "POST",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context);

      const logs = logger.getLogs();
      expect(logs[0].context.method).toBe("POST");
    });

    it("should include path in context", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/gateway/tools/call",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context);

      const logs = logger.getLogs();
      expect(logs[0].context.path).toBe("/api/gateway/tools/call");
    });

    it("should include optional user ID", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        userId: "user_456",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context);

      const logs = logger.getLogs();
      expect(logs[0].context.userId).toBe("user_456");
    });

    it("should include timestamp", () => {
      const timestamp = new Date().toISOString();
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp,
      };

      logger.info("Test", context);

      const logs = logger.getLogs();
      expect(logs[0].context.timestamp).toBe(timestamp);
    });
  });

  describe("Additional Data", () => {
    it("should support additional data object", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      const data = { userId: "user_123", action: "create" };
      logger.info("Test", context, data);

      const logs = logger.getLogs();
      expect(logs[0].data).toEqual(data);
    });

    it("should handle empty data object", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context, {});

      const logs = logger.getLogs();
      expect(logs[0].data).toEqual({});
    });

    it("should handle undefined data", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context);

      const logs = logger.getLogs();
      expect(logs[0].data).toBeUndefined();
    });
  });

  describe("Log Retrieval", () => {
    beforeEach(() => {
      const contexts = [
        {
          requestId: "req_1",
          method: "GET",
          path: "/api/test",
          timestamp: new Date().toISOString(),
        },
        {
          requestId: "req_2",
          method: "POST",
          path: "/api/test",
          timestamp: new Date().toISOString(),
        },
        {
          requestId: "req_3",
          method: "GET",
          path: "/api/other",
          timestamp: new Date().toISOString(),
        },
      ];

      logger.info("Message 1", contexts[0]);
      logger.warn("Message 2", contexts[1]);
      logger.error("Message 3", contexts[2]);
    });

    it("should get all logs", () => {
      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
    });

    it("should filter logs by request ID", () => {
      const logs = logger.getLogs({ requestId: "req_1" });
      expect(logs).toHaveLength(1);
      expect(logs[0].context.requestId).toBe("req_1");
    });

    it("should filter logs by method", () => {
      const logs = logger.getLogs({ method: "GET" });
      expect(logs).toHaveLength(2);
    });

    it("should filter logs by path", () => {
      const logs = logger.getLogs({ path: "/api/test" });
      expect(logs).toHaveLength(2);
    });

    it("should filter logs by level", () => {
      const logs = logger.getLogsByLevel("error");
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe("error");
    });

    it("should handle multiple filters", () => {
      const logs = logger.getLogs({
        method: "GET",
        path: "/api/test",
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].context.requestId).toBe("req_1");
    });
  });

  describe("Log Management", () => {
    it("should clear all logs", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test 1", context);
      logger.info("Test 2", context);
      expect(logger.getLogs()).toHaveLength(2);

      logger.clear();
      expect(logger.getLogs()).toHaveLength(0);
    });

    it("should limit log storage to max size", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      // Add 1100 logs (max is 1000)
      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`, context);
      }

      const logs = logger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(1000);
    });

    it("should keep most recent logs when trimming", () => {
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      for (let i = 0; i < 1100; i++) {
        logger.info(`Message ${i}`, context);
      }

      const logs = logger.getLogs();
      // Should have message 100 to 1099 (most recent 1000)
      expect(logs[0].message).toBe("Message 100");
      expect(logs[logs.length - 1].message).toBe("Message 1099");
    });
  });

  describe("Request Logger", () => {
    it("should create request logger", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      expect(reqLogger).toHaveProperty("success");
      expect(reqLogger).toHaveProperty("error");
    });

    it("should log incoming request", () => {
      createRequestLogger("req_123", "GET", "/api/test");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain("Incoming request");
    });

    it("should log successful request completion", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      reqLogger.success(200);

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[1].message).toContain("Request completed");
      expect(logs[1].context.statusCode).toBe(200);
    });

    it("should include duration in completion log", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      reqLogger.success(200);

      const logs = logger.getLogs();
      expect(logs[1].context.duration).toBeDefined();
      expect(logs[1].context.duration).toBeGreaterThanOrEqual(0);
    });

    it("should log failed requests", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      reqLogger.error(500, "Internal server error");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[1].level).toBe("error");
      expect(logs[1].message).toContain("Request failed");
      expect(logs[1].context.error).toBe("Internal server error");
    });

    it("should handle Error objects", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      const error = new Error("Something went wrong");
      reqLogger.error(500, error);

      const logs = logger.getLogs();
      expect(logs[1].context.error).toBe("Something went wrong");
    });

    it("should warn on slow requests", () => {
      vi.useFakeTimers();
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");

      // Advance time by 1.5 seconds
      vi.advanceTimersByTime(1500);
      reqLogger.success(200);

      const logs = logger.getLogs();
      const warnLogs = logs.filter((log) => log.level === "warn");
      expect(warnLogs).toHaveLength(1);
      expect(warnLogs[0].message).toContain("Slow request");

      vi.useRealTimers();
    });

    it("should not warn on fast requests", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      reqLogger.success(200);

      const logs = logger.getLogs();
      const warnLogs = logs.filter((log) => log.level === "warn");
      expect(warnLogs).toHaveLength(0);
    });

    it("should include user ID if provided", () => {
      createRequestLogger("req_123", "GET", "/api/test", "user_456");

      const logs = logger.getLogs();
      expect(logs[0].context.userId).toBe("user_456");
    });

    it("should support additional data in success log", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      reqLogger.success(200, { items: 5, cached: true });

      const logs = logger.getLogs();
      expect(logs[1].data).toEqual({ items: 5, cached: true });
    });

    it("should support additional data in error log", () => {
      const reqLogger = createRequestLogger("req_123", "GET", "/api/test");
      reqLogger.error(500, "Error", { stack: "...", userId: "user_123" });

      const logs = logger.getLogs();
      expect(logs[1].data).toEqual({ stack: "...", userId: "user_123" });
    });
  });

  describe("Console Output", () => {
    it("should output to console.log for info", () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.info("Test", context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should output to console.warn for warnings", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.warn("Warning", context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should output to console.error for errors", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.error("Error", context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should output to console.debug for debug", () => {
      const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      const context = {
        requestId: "req_123",
        method: "GET",
        path: "/api/test",
        timestamp: new Date().toISOString(),
      };

      logger.debug("Debug", context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});

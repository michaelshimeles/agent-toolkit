/**
 * Tests for Analytics Utilities
 */

import { describe, it, expect } from "vitest";
import {
  calculatePercentiles,
  calculateErrorRate,
  calculateUptime,
  aggregateByPeriod,
  movingAverage,
  detectAnomalies,
  formatDuration,
  formatThroughput,
  calculateGrowthRate,
  getHealthStatus,
  generateTimeSeriesLabels,
  MetricData,
} from "./analytics-utils";

describe("Analytics Utilities", () => {
  describe("calculatePercentiles", () => {
    it("should calculate percentiles correctly", () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = calculatePercentiles(values);

      expect(result.p50).toBeGreaterThanOrEqual(4);
      expect(result.p50).toBeLessThanOrEqual(6);
      expect(result.p95).toBeGreaterThan(result.p50);
      expect(result.p99).toBeGreaterThanOrEqual(result.p95); // Can be equal for small datasets
    });

    it("should calculate min and max", () => {
      const values = [5, 2, 8, 1, 9];
      const result = calculatePercentiles(values);

      expect(result.min).toBe(1);
      expect(result.max).toBe(9);
    });

    it("should calculate average", () => {
      const values = [2, 4, 6, 8, 10];
      const result = calculatePercentiles(values);

      expect(result.avg).toBe(6);
    });

    it("should handle empty array", () => {
      const result = calculatePercentiles([]);

      expect(result.p50).toBe(0);
      expect(result.p95).toBe(0);
      expect(result.p99).toBe(0);
      expect(result.min).toBe(0);
      expect(result.max).toBe(0);
      expect(result.avg).toBe(0);
    });

    it("should handle single value", () => {
      const result = calculatePercentiles([5]);

      expect(result.p50).toBe(5);
      expect(result.p95).toBe(5);
      expect(result.p99).toBe(5);
      expect(result.min).toBe(5);
      expect(result.max).toBe(5);
      expect(result.avg).toBe(5);
    });

    it("should handle duplicate values", () => {
      const values = [5, 5, 5, 5, 5];
      const result = calculatePercentiles(values);

      expect(result.p50).toBe(5);
      expect(result.avg).toBe(5);
    });
  });

  describe("calculateErrorRate", () => {
    it("should calculate error rate", () => {
      const rate = calculateErrorRate(90, 10);
      expect(rate).toBe(10);
    });

    it("should handle zero total", () => {
      const rate = calculateErrorRate(0, 0);
      expect(rate).toBe(0);
    });

    it("should handle 100% errors", () => {
      const rate = calculateErrorRate(0, 100);
      expect(rate).toBe(100);
    });

    it("should handle 0% errors", () => {
      const rate = calculateErrorRate(100, 0);
      expect(rate).toBe(0);
    });

    it("should handle decimal results", () => {
      const rate = calculateErrorRate(97, 3);
      expect(rate).toBe(3);
    });
  });

  describe("calculateUptime", () => {
    it("should calculate uptime percentage", () => {
      const uptime = calculateUptime(100, 10);
      expect(uptime).toBe(90);
    });

    it("should handle zero downtime", () => {
      const uptime = calculateUptime(100, 0);
      expect(uptime).toBe(100);
    });

    it("should handle zero total time", () => {
      const uptime = calculateUptime(0, 0);
      expect(uptime).toBe(0);
    });

    it("should handle 100% downtime", () => {
      const uptime = calculateUptime(100, 100);
      expect(uptime).toBe(0);
    });
  });

  describe("aggregateByPeriod", () => {
    it("should aggregate metrics by period", () => {
      const metrics: MetricData[] = [
        { timestamp: 1000, value: 10 },
        { timestamp: 1500, value: 20 },
        { timestamp: 2000, value: 30 },
        { timestamp: 2500, value: 40 },
      ];

      const result = aggregateByPeriod(metrics, 1000);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should average values in same period", () => {
      const metrics: MetricData[] = [
        { timestamp: 1000, value: 10 },
        { timestamp: 1500, value: 20 },
      ];

      const result = aggregateByPeriod(metrics, 2000);
      expect(result.length).toBe(1);
      expect(result[0].value).toBe(15); // average of 10 and 20
    });

    it("should handle empty array", () => {
      const result = aggregateByPeriod([], 1000);
      expect(result).toEqual([]);
    });

    it("should sort results by timestamp", () => {
      const metrics: MetricData[] = [
        { timestamp: 3000, value: 30 },
        { timestamp: 1000, value: 10 },
        { timestamp: 2000, value: 20 },
      ];

      const result = aggregateByPeriod(metrics, 1000);
      expect(result[0].timestamp).toBeLessThan(result[result.length - 1].timestamp);
    });
  });

  describe("movingAverage", () => {
    it("should calculate moving average", () => {
      const data = [1, 2, 3, 4, 5];
      const result = movingAverage(data, 3);

      expect(result.length).toBe(3);
      expect(result[0]).toBe(2); // (1+2+3)/3
      expect(result[1]).toBe(3); // (2+3+4)/3
      expect(result[2]).toBe(4); // (3+4+5)/3
    });

    it("should handle empty array", () => {
      const result = movingAverage([], 3);
      expect(result).toEqual([]);
    });

    it("should handle window size larger than data", () => {
      const data = [1, 2, 3];
      const result = movingAverage(data, 10);

      expect(result.length).toBe(1);
      expect(result[0]).toBe(2);
    });

    it("should handle window size of 1", () => {
      const data = [1, 2, 3];
      const result = movingAverage(data, 1);

      expect(result).toEqual([1, 2, 3]);
    });

    it("should handle zero window size", () => {
      const data = [1, 2, 3];
      const result = movingAverage(data, 0);

      expect(result).toEqual([]);
    });
  });

  describe("detectAnomalies", () => {
    it("should detect anomalies", () => {
      const values = [1, 2, 3, 4, 5, 100]; // 100 is an outlier
      const anomalies = detectAnomalies(values, 2);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies).toContain(5); // index of 100
    });

    it("should not detect anomalies in uniform data", () => {
      const values = [5, 5, 5, 5, 5];
      const anomalies = detectAnomalies(values, 3);

      expect(anomalies).toEqual([]);
    });

    it("should handle empty array", () => {
      const anomalies = detectAnomalies([], 3);
      expect(anomalies).toEqual([]);
    });

    it("should handle single value", () => {
      const anomalies = detectAnomalies([5], 3);
      expect(anomalies).toEqual([]);
    });

    it("should use custom threshold", () => {
      const values = [1, 2, 3, 4, 5, 10];
      const strict = detectAnomalies(values, 1);
      const lenient = detectAnomalies(values, 5);

      expect(strict.length).toBeGreaterThanOrEqual(lenient.length);
    });
  });

  describe("formatDuration", () => {
    it("should format milliseconds", () => {
      expect(formatDuration(500)).toBe("500ms");
    });

    it("should format seconds", () => {
      const formatted = formatDuration(2500);
      expect(formatted).toContain("s");
    });

    it("should format minutes", () => {
      const formatted = formatDuration(125000);
      expect(formatted).toContain("m");
    });

    it("should format hours", () => {
      const formatted = formatDuration(3700000);
      expect(formatted).toContain("h");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0ms");
    });

    it("should round appropriately", () => {
      const formatted = formatDuration(1234);
      expect(formatted).toBeTruthy();
    });
  });

  describe("formatThroughput", () => {
    it("should format low throughput as per minute", () => {
      const formatted = formatThroughput(0.5);
      expect(formatted).toContain("/min");
    });

    it("should format medium throughput as per second", () => {
      const formatted = formatThroughput(10);
      expect(formatted).toContain("/s");
    });

    it("should format high throughput as thousands", () => {
      const formatted = formatThroughput(5000);
      expect(formatted).toContain("k/s");
    });

    it("should handle zero", () => {
      const formatted = formatThroughput(0);
      expect(formatted).toBeTruthy();
    });
  });

  describe("calculateGrowthRate", () => {
    it("should calculate growth rate", () => {
      const growth = calculateGrowthRate(100, 150);
      expect(growth).toBe(50);
    });

    it("should calculate negative growth", () => {
      const growth = calculateGrowthRate(100, 50);
      expect(growth).toBe(-50);
    });

    it("should handle zero previous value", () => {
      const growth = calculateGrowthRate(0, 100);
      expect(growth).toBe(100);
    });

    it("should handle zero previous and zero current", () => {
      const growth = calculateGrowthRate(0, 0);
      expect(growth).toBe(0);
    });

    it("should handle no change", () => {
      const growth = calculateGrowthRate(100, 100);
      expect(growth).toBe(0);
    });
  });

  describe("getHealthStatus", () => {
    it("should return healthy for good metrics", () => {
      const status = getHealthStatus({
        errorRate: 1,
        avgLatency: 100,
        uptime: 99,
      });

      expect(status).toBe("healthy");
    });

    it("should return degraded for moderate issues", () => {
      const status = getHealthStatus({
        errorRate: 7,
        avgLatency: 3000,
        uptime: 93,
      });

      expect(status).toBe("degraded");
    });

    it("should return unhealthy for high error rate", () => {
      const status = getHealthStatus({
        errorRate: 15,
        avgLatency: 100,
        uptime: 99,
      });

      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy for high latency", () => {
      const status = getHealthStatus({
        errorRate: 1,
        avgLatency: 6000,
        uptime: 99,
      });

      expect(status).toBe("unhealthy");
    });

    it("should return unhealthy for low uptime", () => {
      const status = getHealthStatus({
        errorRate: 1,
        avgLatency: 100,
        uptime: 85,
      });

      expect(status).toBe("unhealthy");
    });

    it("should handle edge cases", () => {
      const statusPerfect = getHealthStatus({
        errorRate: 0,
        avgLatency: 0,
        uptime: 100,
      });

      expect(statusPerfect).toBe("healthy");
    });
  });

  describe("generateTimeSeriesLabels", () => {
    it("should generate hour labels", () => {
      const labels = generateTimeSeriesLabels("hour", 12);
      expect(labels).toHaveLength(12);
      expect(labels[0]).toBeTruthy();
    });

    it("should generate day labels", () => {
      const labels = generateTimeSeriesLabels("day", 24);
      expect(labels).toHaveLength(24);
    });

    it("should generate week labels", () => {
      const labels = generateTimeSeriesLabels("week", 7);
      expect(labels).toHaveLength(7);
    });

    it("should generate month labels", () => {
      const labels = generateTimeSeriesLabels("month", 30);
      expect(labels).toHaveLength(30);
    });

    it("should use default data points", () => {
      const labels = generateTimeSeriesLabels("day");
      expect(labels).toHaveLength(24);
    });

    it("should generate valid labels", () => {
      const labels = generateTimeSeriesLabels("day", 5);
      labels.forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large numbers", () => {
      const values = [1000000, 2000000, 3000000];
      const result = calculatePercentiles(values);
      expect(result.avg).toBe(2000000);
    });

    it("should handle very small numbers", () => {
      const values = [0.001, 0.002, 0.003];
      const result = calculatePercentiles(values);
      expect(result.avg).toBeCloseTo(0.002);
    });

    it("should handle negative numbers", () => {
      const values = [-5, -3, -1, 1, 3, 5];
      const result = calculatePercentiles(values);
      expect(result.avg).toBe(0);
    });

    it("should handle mixed positive and negative", () => {
      const growth = calculateGrowthRate(-100, 50);
      expect(growth).toBe(-150); // (-100 to 50 is -150% decrease)
    });
  });
});

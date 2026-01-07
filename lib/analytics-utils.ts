/**
 * Analytics Utilities
 * Pure functions for analytics calculations and aggregations
 */

export interface MetricData {
  timestamp: number;
  value: number;
}

export interface PercentileResult {
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
}

/**
 * Calculate percentiles from an array of values
 */
export function calculatePercentiles(values: number[]): PercentileResult {
  if (values.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const len = sorted.length;

  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * len) - 1;
    return sorted[Math.max(0, Math.min(index, len - 1))];
  };

  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    min: sorted[0],
    max: sorted[len - 1],
    avg: sum / len,
  };
}

/**
 * Calculate error rate from success/error counts
 */
export function calculateErrorRate(
  successCount: number,
  errorCount: number
): number {
  const total = successCount + errorCount;
  if (total === 0) return 0;
  return (errorCount / total) * 100;
}

/**
 * Calculate uptime percentage
 */
export function calculateUptime(
  totalTime: number,
  downtime: number
): number {
  if (totalTime === 0) return 0;
  const uptime = totalTime - downtime;
  return (uptime / totalTime) * 100;
}

/**
 * Aggregate metrics by time period
 */
export function aggregateByPeriod(
  metrics: MetricData[],
  periodMs: number
): MetricData[] {
  if (metrics.length === 0) return [];

  const aggregated = new Map<number, number[]>();

  metrics.forEach((metric) => {
    const periodStart = Math.floor(metric.timestamp / periodMs) * periodMs;
    const existing = aggregated.get(periodStart) || [];
    existing.push(metric.value);
    aggregated.set(periodStart, existing);
  });

  return Array.from(aggregated.entries())
    .map(([timestamp, values]) => ({
      timestamp,
      value: values.reduce((sum, v) => sum + v, 0) / values.length,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Calculate moving average
 */
export function movingAverage(
  data: number[],
  windowSize: number
): number[] {
  if (data.length === 0 || windowSize <= 0) return [];
  if (windowSize > data.length) windowSize = data.length;

  const result: number[] = [];

  for (let i = 0; i <= data.length - windowSize; i++) {
    const window = data.slice(i, i + windowSize);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    result.push(avg);
  }

  return result;
}

/**
 * Detect anomalies using standard deviation
 */
export function detectAnomalies(
  values: number[],
  threshold: number = 3
): number[] {
  if (values.length < 2) return [];

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return values
    .map((value, index) => ({
      index,
      value,
      zScore: Math.abs((value - mean) / stdDev),
    }))
    .filter((item) => item.zScore > threshold)
    .map((item) => item.index);
}

/**
 * Format duration in human-readable form
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    return `${(ms / 60000).toFixed(1)}m`;
  } else {
    return `${(ms / 3600000).toFixed(1)}h`;
  }
}

/**
 * Format throughput (requests per second)
 */
export function formatThroughput(requestsPerSecond: number): string {
  if (requestsPerSecond < 1) {
    return `${(requestsPerSecond * 60).toFixed(1)}/min`;
  } else if (requestsPerSecond < 100) {
    return `${requestsPerSecond.toFixed(1)}/s`;
  } else {
    return `${(requestsPerSecond / 1000).toFixed(1)}k/s`;
  }
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(
  previous: number,
  current: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get health status based on metrics
 */
export function getHealthStatus(metrics: {
  errorRate: number;
  avgLatency: number;
  uptime: number;
}): "healthy" | "degraded" | "unhealthy" {
  const { errorRate, avgLatency, uptime } = metrics;

  // Unhealthy: high error rate OR high latency OR low uptime
  if (errorRate > 10 || avgLatency > 5000 || uptime < 90) {
    return "unhealthy";
  }

  // Degraded: moderate issues
  if (errorRate > 5 || avgLatency > 2000 || uptime < 95) {
    return "degraded";
  }

  return "healthy";
}

/**
 * Generate time series labels for a period
 */
export function generateTimeSeriesLabels(
  period: "hour" | "day" | "week" | "month",
  dataPoints: number = 24
): string[] {
  const now = new Date();
  const labels: string[] = [];

  for (let i = dataPoints - 1; i >= 0; i--) {
    const date = new Date(now);

    switch (period) {
      case "hour":
        date.setMinutes(now.getMinutes() - i * 5); // 5-minute intervals
        labels.push(date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
        break;
      case "day":
        date.setHours(now.getHours() - i);
        labels.push(date.toLocaleTimeString("en-US", { hour: "2-digit" }));
        break;
      case "week":
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString("en-US", { weekday: "short" }));
        break;
      case "month":
        date.setDate(now.getDate() - i);
        labels.push(date.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
        break;
    }
  }

  return labels;
}

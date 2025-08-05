import {
  PerformanceMeasurement,
  TransactionType,
  MagicBlockMetrics,
} from '@/types/magicblock.types';
import {
  TransactionMetrics,
  RoutingDecision,
} from '@/types/transaction-routing.types';
import { IPerformanceMonitor } from '@/interfaces/rollup-connection.interface';

interface ActiveMeasurement {
  transactionId: string;
  transactionType: TransactionType;
  startTime: number;
  stages: Map<string, number>;
  routingDecision?: RoutingDecision;
}

export class PerformanceMonitor implements IPerformanceMonitor {
  private activeMeasurements: Map<string, ActiveMeasurement> = new Map();
  private completedMeasurements: TransactionMetrics[] = [];
  private maxStoredMeasurements = 1000;
  private isMonitoring = false;

  public startMeasurement(
    transactionId: string,
    transactionType?: TransactionType,
  ): void {
    const measurement: ActiveMeasurement = {
      transactionId,
      transactionType: transactionType || 'transfer_token_between_users',
      startTime: performance.now(),
      stages: new Map(),
    };

    this.activeMeasurements.set(transactionId, measurement);
    this.recordLatency(transactionId, 'start', measurement.startTime);
  }

  public recordLatency(
    transactionId: string,
    stage: string,
    timestamp?: number,
  ): void {
    const measurement = this.activeMeasurements.get(transactionId);
    if (!measurement) {
      console.warn(
        `[PerformanceMonitor] No active measurement found for transaction ${transactionId}`,
      );
      return;
    }

    const recordTime = timestamp || performance.now();
    measurement.stages.set(stage, recordTime);

    console.log(
      `[PerformanceMonitor] Recorded ${stage} for ${transactionId} at ${recordTime}ms`,
    );
  }

  public setRoutingDecision(
    transactionId: string,
    routingDecision: RoutingDecision,
  ): void {
    const measurement = this.activeMeasurements.get(transactionId);
    if (measurement) {
      measurement.routingDecision = routingDecision;
    }
  }

  public completeMeasurement(
    transactionId: string,
    success: boolean = true,
    error?: string,
  ): PerformanceMeasurement {
    const measurement = this.activeMeasurements.get(transactionId);
    if (!measurement) {
      throw new Error(
        `No active measurement found for transaction ${transactionId}`,
      );
    }

    const endTime = performance.now();
    this.recordLatency(transactionId, 'end', endTime);

    const startTime = measurement.stages.get('start') || measurement.startTime;
    const rollupConfirmation = measurement.stages.get('rollup_confirmation');
    const mainnetSync = measurement.stages.get('mainnet_sync');
    const uiUpdate = measurement.stages.get('ui_update');

    const performanceMeasurement: PerformanceMeasurement = {
      transactionSubmission: startTime,
      rollupConfirmation,
      mainnetSync,
      uiUpdate,
      totalLatency: endTime - startTime,
    };

    // Store detailed metrics
    const transactionMetrics: TransactionMetrics = {
      transactionId,
      transactionType: measurement.transactionType,
      routingDecision: measurement.routingDecision!,
      startTime: startTime,
      endTime,
      confirmationTime: rollupConfirmation || mainnetSync,
      success,
      error,
      latencyMs: performanceMeasurement.totalLatency,
    };

    this.storeCompletedMeasurement(transactionMetrics);
    this.activeMeasurements.delete(transactionId);

    return performanceMeasurement;
  }

  public getAverageLatency(timeWindow: number = 300000): number {
    // Default 5 minutes
    const cutoffTime = Date.now() - timeWindow;
    const recentMeasurements = this.completedMeasurements.filter(
      (m) => m.startTime >= cutoffTime && m.success,
    );

    if (recentMeasurements.length === 0) {
      return 0;
    }

    const totalLatency = recentMeasurements.reduce(
      (sum, m) => sum + m.latencyMs,
      0,
    );
    return totalLatency / recentMeasurements.length;
  }

  public getSuccessRate(timeWindow: number = 300000): number {
    // Default 5 minutes
    const cutoffTime = Date.now() - timeWindow;
    const recentMeasurements = this.completedMeasurements.filter(
      (m) => m.startTime >= cutoffTime,
    );

    if (recentMeasurements.length === 0) {
      return 1.0; // 100% if no data
    }

    const successfulTransactions = recentMeasurements.filter(
      (m) => m.success,
    ).length;
    return successfulTransactions / recentMeasurements.length;
  }

  public getLatencyPercentiles(timeWindow: number = 300000): {
    p50: number;
    p95: number;
    p99: number;
  } {
    const cutoffTime = Date.now() - timeWindow;
    const recentMeasurements = this.completedMeasurements
      .filter((m) => m.startTime >= cutoffTime && m.success)
      .map((m) => m.latencyMs)
      .sort((a, b) => a - b);

    if (recentMeasurements.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const p50Index = Math.floor(recentMeasurements.length * 0.5);
    const p95Index = Math.floor(recentMeasurements.length * 0.95);
    const p99Index = Math.floor(recentMeasurements.length * 0.99);

    return {
      p50: recentMeasurements[p50Index] || 0,
      p95: recentMeasurements[p95Index] || 0,
      p99: recentMeasurements[p99Index] || 0,
    };
  }

  public getMetricsByTransactionType(
    transactionType: TransactionType,
    timeWindow: number = 300000,
  ): {
    count: number;
    averageLatency: number;
    successRate: number;
  } {
    const cutoffTime = Date.now() - timeWindow;
    const typeMeasurements = this.completedMeasurements.filter(
      (m) => m.transactionType === transactionType && m.startTime >= cutoffTime,
    );

    if (typeMeasurements.length === 0) {
      return { count: 0, averageLatency: 0, successRate: 1.0 };
    }

    const successfulMeasurements = typeMeasurements.filter((m) => m.success);
    const totalLatency = successfulMeasurements.reduce(
      (sum, m) => sum + m.latencyMs,
      0,
    );

    return {
      count: typeMeasurements.length,
      averageLatency:
        successfulMeasurements.length > 0
          ? totalLatency / successfulMeasurements.length
          : 0,
      successRate: successfulMeasurements.length / typeMeasurements.length,
    };
  }

  public getRollupVsMainnetComparison(timeWindow: number = 300000): {
    rollup: { count: number; averageLatency: number; successRate: number };
    mainnet: { count: number; averageLatency: number; successRate: number };
  } {
    const cutoffTime = Date.now() - timeWindow;
    const recentMeasurements = this.completedMeasurements.filter(
      (m) => m.startTime >= cutoffTime,
    );

    const rollupMeasurements = recentMeasurements.filter(
      (m) => m.routingDecision.useRollup,
    );
    const mainnetMeasurements = recentMeasurements.filter(
      (m) => !m.routingDecision.useRollup,
    );

    const calculateStats = (measurements: TransactionMetrics[]) => {
      if (measurements.length === 0) {
        return { count: 0, averageLatency: 0, successRate: 1.0 };
      }

      const successful = measurements.filter((m) => m.success);
      const totalLatency = successful.reduce((sum, m) => sum + m.latencyMs, 0);

      return {
        count: measurements.length,
        averageLatency:
          successful.length > 0 ? totalLatency / successful.length : 0,
        successRate: successful.length / measurements.length,
      };
    };

    return {
      rollup: calculateStats(rollupMeasurements),
      mainnet: calculateStats(mainnetMeasurements),
    };
  }

  public getMagicBlockMetrics(): MagicBlockMetrics {
    const recentMeasurements = this.completedMeasurements.filter(
      (m) => m.startTime >= Date.now() - 300000, // Last 5 minutes
    );

    const rollupTransactions = recentMeasurements.filter(
      (m) => m.routingDecision.useRollup,
    );
    const successfulTransactions = recentMeasurements.filter((m) => m.success);
    const failedTransactions = recentMeasurements.filter((m) => !m.success);

    const totalLatency = successfulTransactions.reduce(
      (sum, m) => sum + m.latencyMs,
      0,
    );
    const averageLatency =
      successfulTransactions.length > 0
        ? totalLatency / successfulTransactions.length
        : 0;

    // Estimate active rollups based on unique rollup IDs in recent transactions
    const activeRollupIds = new Set(
      rollupTransactions
        .filter((m) => m.routingDecision.rollupId)
        .map((m) => m.routingDecision.rollupId!),
    );

    return {
      activeRollups: activeRollupIds.size,
      totalTransactions: recentMeasurements.length,
      averageLatency,
      successRate:
        recentMeasurements.length > 0
          ? successfulTransactions.length / recentMeasurements.length
          : 1.0,
      errorRate:
        recentMeasurements.length > 0
          ? failedTransactions.length / recentMeasurements.length
          : 0.0,
    };
  }

  public exportMetrics(): TransactionMetrics[] {
    return [...this.completedMeasurements];
  }

  public clearMetrics(): void {
    this.completedMeasurements = [];
    this.activeMeasurements.clear();
  }

  public startContinuousMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Log performance summary every minute
    const summaryInterval = setInterval(() => {
      const metrics = this.getMagicBlockMetrics();
      const percentiles = this.getLatencyPercentiles();

      console.log('[PerformanceMonitor] Performance Summary:', {
        activeRollups: metrics.activeRollups,
        totalTransactions: metrics.totalTransactions,
        averageLatency: `${metrics.averageLatency.toFixed(2)}ms`,
        successRate: `${(metrics.successRate * 100).toFixed(1)}%`,
        latencyP95: `${percentiles.p95.toFixed(2)}ms`,
        latencyP99: `${percentiles.p99.toFixed(2)}ms`,
      });
    }, 60000);

    // Clean up old measurements every 10 minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMeasurements();
    }, 600000);

    // Store interval IDs for cleanup
    (this as any).summaryInterval = summaryInterval;
    (this as any).cleanupInterval = cleanupInterval;

    console.log('[PerformanceMonitor] Started continuous monitoring');
  }

  public stopContinuousMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if ((this as any).summaryInterval) {
      clearInterval((this as any).summaryInterval);
    }

    if ((this as any).cleanupInterval) {
      clearInterval((this as any).cleanupInterval);
    }

    console.log('[PerformanceMonitor] Stopped continuous monitoring');
  }

  private storeCompletedMeasurement(measurement: TransactionMetrics): void {
    this.completedMeasurements.push(measurement);

    // Keep only the most recent measurements to prevent memory issues
    if (this.completedMeasurements.length > this.maxStoredMeasurements) {
      this.completedMeasurements = this.completedMeasurements.slice(
        -this.maxStoredMeasurements,
      );
    }
  }

  private cleanupOldMeasurements(): void {
    const oneHourAgo = Date.now() - 3600000; // 1 hour
    const initialCount = this.completedMeasurements.length;

    this.completedMeasurements = this.completedMeasurements.filter(
      (m) => m.startTime >= oneHourAgo,
    );

    const cleanedCount = initialCount - this.completedMeasurements.length;
    if (cleanedCount > 0) {
      console.log(
        `[PerformanceMonitor] Cleaned up ${cleanedCount} old measurements`,
      );
    }
  }
}

#!/usr/bin/env tsx

import { SystemProgram, Keypair } from '@solana/web3.js';
import { PerformanceMonitor } from '../src/util/monitoring/performance-monitor';
import { MagicBlockRouter } from '../src/util/server/magicblock-router';
import { TransactionType } from '../src/types/magicblock.types';

interface BenchmarkConfig {
  transactionTypes: TransactionType[];
  transactionCount: number;
  concurrentUsers: number;
  gameIds: string[];
  measurementDuration: number;
}

interface BenchmarkResults {
  transactionType: TransactionType;
  totalTransactions: number;
  successfulTransactions: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  successRate: number;
  throughput: number;
}

class PerformanceBenchmark {
  private performanceMonitor: PerformanceMonitor;
  private magicBlockRouter: MagicBlockRouter;

  constructor() {
    this.performanceMonitor = new PerformanceMonitor();
    this.magicBlockRouter = MagicBlockRouter.getInstance();
  }

  public async runBenchmark(
    config: BenchmarkConfig,
  ): Promise<BenchmarkResults[]> {
    console.log('🚀 Starting MagicBlock Rollup Performance Benchmark');
    console.log('Configuration:', config);

    this.performanceMonitor.startContinuousMonitoring();
    const results: BenchmarkResults[] = [];

    for (const transactionType of config.transactionTypes) {
      console.log(`\n📊 Benchmarking transaction type: ${transactionType}`);

      const result = await this.benchmarkTransactionType(
        transactionType,
        config.transactionCount,
        config.concurrentUsers,
        config.gameIds,
      );

      results.push(result);

      // Wait between transaction types to avoid interference
      await this.sleep(2000);
    }

    this.performanceMonitor.stopContinuousMonitoring();

    console.log('\n📈 Benchmark Results Summary:');
    this.printResults(results);

    return results;
  }

  private async benchmarkTransactionType(
    transactionType: TransactionType,
    transactionCount: number,
    concurrentUsers: number,
    gameIds: string[],
  ): Promise<BenchmarkResults> {
    const startTime = Date.now();
    const transactionPromises: Promise<void>[] = [];
    const successfulTransactions: string[] = [];
    const failedTransactions: string[] = [];

    // Create concurrent transaction batches
    const batchSize = Math.ceil(transactionCount / concurrentUsers);

    for (let user = 0; user < concurrentUsers; user++) {
      const userPromise = this.runUserTransactions(
        transactionType,
        batchSize,
        gameIds[user % gameIds.length],
        user,
        successfulTransactions,
        failedTransactions,
      );

      transactionPromises.push(userPromise);
    }

    // Wait for all transactions to complete
    await Promise.all(transactionPromises);

    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000; // seconds

    // Calculate metrics
    const metrics =
      this.performanceMonitor.getMetricsByTransactionType(transactionType);
    const percentiles = this.performanceMonitor.getLatencyPercentiles();

    return {
      transactionType,
      totalTransactions:
        successfulTransactions.length + failedTransactions.length,
      successfulTransactions: successfulTransactions.length,
      averageLatency: metrics.averageLatency,
      p95Latency: percentiles.p95,
      p99Latency: percentiles.p99,
      successRate: metrics.successRate,
      throughput: successfulTransactions.length / totalDuration,
    };
  }

  private async runUserTransactions(
    transactionType: TransactionType,
    transactionCount: number,
    gameId: string,
    userId: number,
    successfulTransactions: string[],
    failedTransactions: string[],
  ): Promise<void> {
    for (let i = 0; i < transactionCount; i++) {
      const transactionId = `${transactionType}_user${userId}_tx${i}_${Date.now()}`;

      try {
        await this.executeTransaction(transactionId, transactionType, gameId);
        successfulTransactions.push(transactionId);
      } catch (error) {
        console.error(`Transaction ${transactionId} failed:`, error);
        failedTransactions.push(transactionId);

        this.performanceMonitor.completeMeasurement(
          transactionId,
          false,
          error instanceof Error ? error.message : 'Unknown error',
        );
      }

      // Small delay between transactions from the same user
      await this.sleep(10);
    }
  }

  private async executeTransaction(
    transactionId: string,
    transactionType: TransactionType,
    gameId?: string,
  ): Promise<void> {
    // Start performance measurement
    this.performanceMonitor.startMeasurement(transactionId, transactionType);

    // Create mock transaction instruction
    const mockInstruction = SystemProgram.transfer({
      fromPubkey: Keypair.generate().publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1000000,
    });

    // Get routing decision
    const routingDecision = await this.magicBlockRouter.routeTransaction(
      mockInstruction,
      transactionType,
      gameId,
    );

    this.performanceMonitor.setRoutingDecision(transactionId, routingDecision);
    this.performanceMonitor.recordLatency(transactionId, 'routing_decision');

    // Simulate transaction execution
    const executionLatency = routingDecision.useRollup
      ? this.simulateRollupExecution()
      : this.simulateMainnetExecution();

    await this.sleep(executionLatency);
    this.performanceMonitor.recordLatency(transactionId, 'execution_complete');

    // Simulate confirmation
    if (routingDecision.useRollup) {
      await this.sleep(10); // Fast rollup confirmation
      this.performanceMonitor.recordLatency(
        transactionId,
        'rollup_confirmation',
      );

      // Simulate mainnet sync for critical transactions
      if (this.needsMainnetSync(transactionType)) {
        await this.sleep(200); // Mainnet sync delay
        this.performanceMonitor.recordLatency(transactionId, 'mainnet_sync');
      }
    } else {
      await this.sleep(400); // Standard Solana confirmation
      this.performanceMonitor.recordLatency(
        transactionId,
        'mainnet_confirmation',
      );
    }

    // Simulate UI update
    await this.sleep(5);
    this.performanceMonitor.recordLatency(transactionId, 'ui_update');

    // Complete measurement
    this.performanceMonitor.completeMeasurement(transactionId, true);
  }

  private simulateRollupExecution(): number {
    // Simulate rollup execution latency: 5-25ms
    return Math.random() * 20 + 5;
  }

  private simulateMainnetExecution(): number {
    // Simulate mainnet execution latency: 300-500ms
    return Math.random() * 200 + 300;
  }

  private needsMainnetSync(transactionType: TransactionType): boolean {
    // High-value transactions need mainnet sync
    const syncRequired = ['user_end_game', 'deposit'];
    return syncRequired.includes(transactionType);
  }

  private printResults(results: BenchmarkResults[]): void {
    console.table(
      results.map((result) => ({
        'Transaction Type': result.transactionType,
        'Total Txs': result.totalTransactions,
        'Success Rate': `${(result.successRate * 100).toFixed(1)}%`,
        'Avg Latency (ms)': result.averageLatency.toFixed(2),
        'P95 Latency (ms)': result.p95Latency.toFixed(2),
        'P99 Latency (ms)': result.p99Latency.toFixed(2),
        'Throughput (TPS)': result.throughput.toFixed(2),
      })),
    );

    // Compare rollup vs mainnet performance
    const rollupComparison =
      this.performanceMonitor.getRollupVsMainnetComparison();
    console.log('\n📊 Rollup vs Mainnet Comparison:');
    console.table({
      Rollup: {
        Count: rollupComparison.rollup.count,
        'Avg Latency (ms)': rollupComparison.rollup.averageLatency.toFixed(2),
        'Success Rate': `${(rollupComparison.rollup.successRate * 100).toFixed(1)}%`,
      },
      Mainnet: {
        Count: rollupComparison.mainnet.count,
        'Avg Latency (ms)': rollupComparison.mainnet.averageLatency.toFixed(2),
        'Success Rate': `${(rollupComparison.mainnet.successRate * 100).toFixed(1)}%`,
      },
    });

    // Check if performance targets are met
    this.checkPerformanceTargets(results);
  }

  private checkPerformanceTargets(results: BenchmarkResults[]): void {
    console.log('\n🎯 Performance Target Analysis:');

    const rollupResults = results.filter((r) =>
      [
        'transfer_token_between_users',
        'user_transfer_token_to_game',
        'take_token_from_game',
      ].includes(r.transactionType),
    );

    const targetLatency = 50; // ms
    const targetSuccessRate = 0.99; // 99%

    rollupResults.forEach((result) => {
      const latencyMet = result.p95Latency <= targetLatency;
      const successRateMet = result.successRate >= targetSuccessRate;

      console.log(`${result.transactionType}:`);
      console.log(
        `  ✅ P95 Latency: ${result.p95Latency.toFixed(2)}ms ${latencyMet ? '(TARGET MET)' : '(TARGET MISSED)'}`,
      );
      console.log(
        `  ✅ Success Rate: ${(result.successRate * 100).toFixed(1)}% ${successRateMet ? '(TARGET MET)' : '(TARGET MISSED)'}`,
      );
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async establishBaseline(): Promise<void> {
    console.log('📊 Establishing Performance Baseline...\n');

    const baselineConfig: BenchmarkConfig = {
      transactionTypes: [
        'transfer_token_between_users',
        'user_transfer_token_to_game',
        'take_token_from_game',
        'user_join_game',
        'user_quit_game',
        'deposit',
        'init_game',
      ],
      transactionCount: 100,
      concurrentUsers: 10,
      gameIds: ['game-1', 'game-2', 'game-3', 'game-4', 'game-5'],
      measurementDuration: 60000, // 1 minute
    };

    await this.runBenchmark(baselineConfig);

    console.log(
      '\n✅ Baseline established. Use this data to track performance improvements.',
    );
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();

  benchmark
    .establishBaseline()
    .then(() => {
      console.log('\n🎉 Benchmark completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Benchmark failed:', error);
      process.exit(1);
    });
}

export { PerformanceBenchmark };
export type { BenchmarkConfig, BenchmarkResults };

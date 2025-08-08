import { Connection } from '@solana/web3.js';
import {
  EndpointConfig,
  HealthCheckResult,
  CircuitBreakerConfig,
  CircuitBreakerState,
} from '@/types/enhanced-connection.types';
import { EndpointManager } from './endpoint-manager';

export class HealthChecker {
  private endpointManager: EndpointManager;
  private healthResults: Map<string, HealthCheckResult> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  private circuitBreakerConfig: CircuitBreakerConfig;
  private isRunning: boolean = false;

  constructor(
    endpointManager: EndpointManager,
    circuitBreakerConfig?: CircuitBreakerConfig,
  ) {
    this.endpointManager = endpointManager;
    this.circuitBreakerConfig = circuitBreakerConfig || {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringWindow: 300000, // 5 minutes
      halfOpenMaxCalls: 3,
    };
  }

  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.setupHealthChecks();
    console.log('[HealthChecker] Started health monitoring');
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.clearHealthChecks();
    console.log('[HealthChecker] Stopped health monitoring');
  }

  private setupHealthChecks(): void {
    const endpoints = this.endpointManager.getAllEndpoints();

    endpoints.forEach((endpoint) => {
      this.initializeCircuitBreaker(endpoint.id);
      this.scheduleHealthCheck(endpoint);
    });
  }

  private clearHealthChecks(): void {
    this.healthCheckIntervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.healthCheckIntervals.clear();
  }

  private scheduleHealthCheck(endpoint: EndpointConfig): void {
    // Clear existing interval if any
    const existingInterval = this.healthCheckIntervals.get(endpoint.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new health check
    const interval = setInterval(async () => {
      await this.performHealthCheck(endpoint);
    }, endpoint.healthCheckInterval);

    this.healthCheckIntervals.set(endpoint.id, interval);

    // Perform initial health check
    this.performHealthCheck(endpoint).catch((error) => {
      console.error(
        `[HealthChecker] Initial health check failed for ${endpoint.id}:`,
        error,
      );
    });
  }

  public async performHealthCheck(endpoint: EndpointConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const circuitBreaker = this.circuitBreakers.get(endpoint.id);

    // Check circuit breaker state
    if (circuitBreaker && this.shouldSkipHealthCheck(circuitBreaker)) {
      return this.createFailedResult(endpoint, 'Circuit breaker is OPEN', startTime);
    }

    try {
      const connection = new Connection(endpoint.url, endpoint.commitment);
      
      // Perform basic connectivity test
      await Promise.race([
        this.testConnection(connection, endpoint),
        this.createTimeoutPromise(endpoint.timeoutMs),
      ]);

      const latency = Date.now() - startTime;
      const result = this.createSuccessResult(endpoint, latency);
      
      this.updateHealthResult(result);
      this.updateCircuitBreaker(endpoint.id, true);
      
      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = this.createFailedResult(endpoint, errorMessage, startTime, latency);
      
      this.updateHealthResult(result);
      this.updateCircuitBreaker(endpoint.id, false);
      
      return result;
    }
  }

  private async testConnection(connection: Connection, endpoint: EndpointConfig): Promise<void> {
    // Test basic connection with appropriate method based on endpoint type
    if (endpoint.type === 'rollup') {
      // For rollup endpoints, test with a simple getVersion call
      await connection.getVersion();
    } else {
      // For Solana clusters, test with getSlot which is lightweight
      await connection.getSlot();
    }
  }

  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  private createSuccessResult(
    endpoint: EndpointConfig,
    latency: number,
  ): HealthCheckResult {
    const previousResult = this.healthResults.get(endpoint.id);
    
    return {
      endpointId: endpoint.id,
      isHealthy: true,
      latency,
      timestamp: new Date(),
      consecutiveFailures: 0,
      consecutiveSuccesses: (previousResult?.consecutiveSuccesses || 0) + 1,
    };
  }

  private createFailedResult(
    endpoint: EndpointConfig,
    error: string,
    startTime: number,
    latency?: number,
  ): HealthCheckResult {
    const previousResult = this.healthResults.get(endpoint.id);
    
    return {
      endpointId: endpoint.id,
      isHealthy: false,
      latency: latency || Date.now() - startTime,
      timestamp: new Date(),
      error,
      consecutiveFailures: (previousResult?.consecutiveFailures || 0) + 1,
      consecutiveSuccesses: 0,
    };
  }

  private updateHealthResult(result: HealthCheckResult): void {
    this.healthResults.set(result.endpointId, result);
  }

  private initializeCircuitBreaker(endpointId: string): void {
    if (!this.circuitBreakers.has(endpointId)) {
      this.circuitBreakers.set(endpointId, {
        endpointId,
        state: 'CLOSED',
        failures: 0,
        successes: 0,
      });
    }
  }

  private updateCircuitBreaker(endpointId: string, success: boolean): void {
    const circuitBreaker = this.circuitBreakers.get(endpointId);
    if (!circuitBreaker) {
      this.initializeCircuitBreaker(endpointId);
      return this.updateCircuitBreaker(endpointId, success);
    }

    const now = new Date();

    if (success) {
      circuitBreaker.successes += 1;
      circuitBreaker.lastSuccessTime = now;

      if (circuitBreaker.state === 'HALF_OPEN') {
        if (circuitBreaker.successes >= this.circuitBreakerConfig.halfOpenMaxCalls) {
          circuitBreaker.state = 'CLOSED';
          circuitBreaker.failures = 0;
        }
      } else if (circuitBreaker.state === 'OPEN') {
        // Check if recovery timeout has passed
        if (
          circuitBreaker.lastFailureTime &&
          now.getTime() - circuitBreaker.lastFailureTime.getTime() >=
            this.circuitBreakerConfig.recoveryTimeout
        ) {
          circuitBreaker.state = 'HALF_OPEN';
          circuitBreaker.successes = 1;
        }
      }
    } else {
      circuitBreaker.failures += 1;
      circuitBreaker.lastFailureTime = now;
      circuitBreaker.successes = 0;

      if (
        circuitBreaker.state === 'CLOSED' &&
        circuitBreaker.failures >= this.circuitBreakerConfig.failureThreshold
      ) {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.nextAttemptTime = new Date(
          now.getTime() + this.circuitBreakerConfig.recoveryTimeout,
        );
      } else if (circuitBreaker.state === 'HALF_OPEN') {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.nextAttemptTime = new Date(
          now.getTime() + this.circuitBreakerConfig.recoveryTimeout,
        );
      }
    }

    this.circuitBreakers.set(endpointId, circuitBreaker);
  }

  private shouldSkipHealthCheck(circuitBreaker: CircuitBreakerState): boolean {
    if (circuitBreaker.state !== 'OPEN') {
      return false;
    }

    return (
      !circuitBreaker.nextAttemptTime ||
      new Date() < circuitBreaker.nextAttemptTime
    );
  }

  public getHealthStatus(endpointId: string): HealthCheckResult | null {
    return this.healthResults.get(endpointId) || null;
  }

  public getAllHealthStatuses(): HealthCheckResult[] {
    return Array.from(this.healthResults.values());
  }

  public getHealthyEndpoints(): string[] {
    return Array.from(this.healthResults.entries())
      .filter(([_, result]) => result.isHealthy)
      .map(([endpointId]) => endpointId);
  }

  public getUnhealthyEndpoints(): string[] {
    return Array.from(this.healthResults.entries())
      .filter(([_, result]) => !result.isHealthy)
      .map(([endpointId]) => endpointId);
  }

  public isEndpointHealthy(endpointId: string): boolean {
    const result = this.healthResults.get(endpointId);
    return result?.isHealthy ?? false;
  }

  public getCircuitBreakerState(endpointId: string): CircuitBreakerState | null {
    return this.circuitBreakers.get(endpointId) || null;
  }

  public getAllCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  public getHealthSummary(): {
    totalEndpoints: number;
    healthyEndpoints: number;
    unhealthyEndpoints: number;
    circuitBreakersOpen: number;
    averageLatency: number;
  } {
    const results = Array.from(this.healthResults.values());
    const healthyCount = results.filter((r) => r.isHealthy).length;
    const openCircuitBreakers = Array.from(this.circuitBreakers.values()).filter(
      (cb) => cb.state === 'OPEN',
    ).length;

    const totalLatency = results.reduce((sum, result) => sum + result.latency, 0);
    const averageLatency = results.length > 0 ? totalLatency / results.length : 0;

    return {
      totalEndpoints: results.length,
      healthyEndpoints: healthyCount,
      unhealthyEndpoints: results.length - healthyCount,
      circuitBreakersOpen: openCircuitBreakers,
      averageLatency,
    };
  }

  public async forceHealthCheck(endpointId: string): Promise<HealthCheckResult | null> {
    const endpoint = this.endpointManager.getEndpoint(endpointId);
    if (!endpoint) {
      return null;
    }

    return await this.performHealthCheck(endpoint);
  }

  public resetCircuitBreaker(endpointId: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(endpointId);
    if (!circuitBreaker) {
      return false;
    }

    circuitBreaker.state = 'CLOSED';
    circuitBreaker.failures = 0;
    circuitBreaker.successes = 0;
    delete circuitBreaker.lastFailureTime;
    delete circuitBreaker.nextAttemptTime;

    this.circuitBreakers.set(endpointId, circuitBreaker);
    return true;
  }

  public updateEndpoint(endpoint: EndpointConfig): void {
    // Update health check schedule if interval changed
    const existingInterval = this.healthCheckIntervals.get(endpoint.id);
    if (existingInterval && this.isRunning) {
      clearInterval(existingInterval);
      this.scheduleHealthCheck(endpoint);
    }
  }

  public removeEndpoint(endpointId: string): void {
    // Clear health check interval
    const interval = this.healthCheckIntervals.get(endpointId);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(endpointId);
    }

    // Remove health data
    this.healthResults.delete(endpointId);
    this.circuitBreakers.delete(endpointId);
  }
}
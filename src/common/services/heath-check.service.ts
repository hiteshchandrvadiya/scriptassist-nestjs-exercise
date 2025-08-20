import { DataSource } from 'typeorm';
import { CacheService } from './cache.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { EHealthStatus, HealthCheck, HealthCheckResult } from 'src/types/health-check';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: CacheService,
  ) {}

  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Perform all health checks in parallel
      const [databaseCheck, redisCheck, memoryCheck] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkMemory(),
      ]);

      // Process results
      const checks = {
        database: this.processCheckResult(databaseCheck),
        redis: this.processCheckResult(redisCheck),
        memory: this.processCheckResult(memoryCheck),
      };

      // Calculate summary
      const summary = this.calculateSummary(checks);

      // Determine overall status
      const overallStatus = this.determineOverallStatus(summary);

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks,
        summary,
      };

      // Log health check results
      this.logHealthCheckResult(result, Date.now() - startTime);

      return result;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      throw error;
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');

      const finalTime = Date.now() - start;

      return {
        status: EHealthStatus.HEALTHY,
        responseTime: finalTime,
        details: `Connected to ${this.dataSource.options.database} database`,
      };
    } catch (error) {
      const finalTime = Date.now() - start;

      return {
        status: EHealthStatus.UNHEALTHY,
        responseTime: finalTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  private async checkRedis(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const check = await this.redisService.healthCheck();

      const finalTime = Date.now() - start;
      if (check) {
        return {
          status: EHealthStatus.HEALTHY,
          responseTime: finalTime,
          details: 'Redis connection is healthy',
        };
      } else {
        return {
          status: EHealthStatus.UNHEALTHY,
          responseTime: finalTime,
          error: 'Redis health-check failed',
        };
      }
    } catch (error) {
      const finalTime = Date.now() - start;
      return {
        status: EHealthStatus.UNHEALTHY,
        responseTime: finalTime,
        error: error instanceof Error ? error.message : 'Redis health-check failed',
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const memoryUsage = process.memoryUsage();

      const finalTime = Date.now() - start;

      const usagePercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      let status = EHealthStatus.HEALTHY;

      let details = `Memory usage: ${Math.round(usagePercentage)}%`;

      if (usagePercentage > 90) {
        status = EHealthStatus.DEGRADED;
        details += ' - Critical memory usage';
      } else if (usagePercentage > 80) {
        status = EHealthStatus.UNHEALTHY;
        details += ' - High memory usage';
      }

      return {
        status,
        responseTime: finalTime,
        details,
      };
    } catch (error) {
      const finalTime = Date.now() - start;

      return {
        status: EHealthStatus.UNHEALTHY,
        responseTime: finalTime,
        error: error instanceof Error ? error.message : 'Memory check failed',
      };
    }
  }

  private processCheckResult(result: PromiseSettledResult<HealthCheck>): HealthCheck {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: EHealthStatus.UNHEALTHY,
        responseTime: 0,
        error: result.reason instanceof Error ? result.reason.message : 'Check failed',
      };
    }
  }

  private calculateSummary(checks: HealthCheckResult['checks']) {
    const allChecks = Object.values(checks);
    const total = allChecks.length;
    const healthy = allChecks.filter(c => c.status === EHealthStatus.HEALTHY).length;
    const unhealthy = allChecks.filter(c => c.status === EHealthStatus.UNHEALTHY).length;
    const degraded = allChecks.filter(c => c.status === EHealthStatus.DEGRADED).length;

    return { total, healthy, unhealthy, degraded };
  }

  private determineOverallStatus(summary: HealthCheckResult['summary']): EHealthStatus {
    if (summary.unhealthy > 0) {
      return EHealthStatus.UNHEALTHY;
    } else if (summary.degraded > 0) {
      return EHealthStatus.DEGRADED;
    } else {
      return EHealthStatus.HEALTHY;
    }
  }

  private logHealthCheckResult(result: HealthCheckResult, totalTime: number) {
    const { status, summary } = result;

    if (status === EHealthStatus.HEALTHY) {
      this.logger.log(
        `Health check completed in ${totalTime}ms - Status: ${status} (${summary.healthy}/${summary.total} checks passed)`,
      );
    } else if (status === EHealthStatus.DEGRADED) {
      this.logger.warn(
        `Health check completed in ${totalTime}ms - Status: ${status} (${summary.healthy}/${summary.total} healthy, ${summary.degraded} degraded)`,
      );
    } else {
      this.logger.error(
        `Health check completed in ${totalTime}ms - Status: ${status} (${summary.unhealthy} unhealthy, ${summary.degraded} degraded)`,
      );
    }

    // Log individual check failures
    Object.entries(result.checks).forEach(([name, check]) => {
      if (check.status !== EHealthStatus.HEALTHY) {
        this.logger.warn(`${name} check failed: ${check.error || check.details}`);
      }
    });
  }

  // Quick health check for load balancers
  async quickHealthCheck(): Promise<boolean> {
    try {
      const result = await this.performHealthCheck();
      return result.status === EHealthStatus.HEALTHY;
    } catch (error) {
      this.logger.error('Quick health check failed:', error);
      return false;
    }
  }
}

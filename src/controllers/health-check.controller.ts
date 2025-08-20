import { HealthCheckService } from '@common/services/heath-check.service';
import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthCheckResult } from 'src/types/health-check';

@ApiTags('health')
@Controller('health')
export class HealthCheckController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  /**
   * Comprehensive health check
   * Checks database, Redis, memory, etc.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Full health check',
    description:
      'Runs all health checks (database, Redis, memory, etc.) and returns a detailed report.',
  })
  @ApiResponse({
    status: 200,
    description: 'System is healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'System is unhealthy or degraded',
  })
  async getHealthCheck(): Promise<HealthCheckResult> {
    return this.healthCheckService.performHealthCheck();
  }

  /**
   * Readiness probe
   * Used by load balancers or Kubernetes to know if app can handle traffic
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Quick check to see if the system is ready to accept traffic (for load balancers/Kubernetes).',
  })
  @ApiResponse({
    status: 200,
    description: 'System is ready',
    schema: {
      example: {
        status: 'ready',
        timestamp: '2025-08-20T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'System is not ready',
  })
  async getReadiness(): Promise<{ status: string; timestamp: string }> {
    const isHealthy = await this.healthCheckService.quickHealthCheck();

    if (isHealthy) {
      return { status: 'ready', timestamp: new Date().toISOString() };
    } else {
      throw new Error('System not ready');
    }
  }

  /**
   * Liveness probe
   * Used to check if the app process is running
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Basic check to confirm the application is running (used by Kubernetes liveness probes).',
  })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
    schema: {
      example: {
        status: 'alive',
        timestamp: '2025-08-20T12:00:00.000Z',
      },
    },
  })
  async getLiveness(): Promise<{ status: string; timestamp: string }> {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  /**
   * Startup probe
   * Indicates when app has fully started up
   */
  @Get('startup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Startup probe',
    description:
      'Confirms the application has completed startup (used by Kubernetes startup probes).',
  })
  @ApiResponse({
    status: 200,
    description: 'Application started',
    schema: {
      example: {
        status: 'started',
        timestamp: '2025-08-20T12:00:00.000Z',
        uptime: 120000,
      },
    },
  })
  async getStartup(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return {
      status: 'started',
      timestamp: new Date().toISOString(),
      uptime: process.uptime() * 1000, // in ms
    };
  }
}

export interface HealthCheck {
  status: EHealthStatus;
  responseTime: number;
  details?: string;
  error?: string;
}

export enum EHealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  DEGRADED = 'degraded',
}

export interface HealthCheckResult {
  status: EHealthStatus;
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
  };
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

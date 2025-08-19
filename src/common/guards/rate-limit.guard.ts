import { CacheService } from '@common/services/cache.service';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';

// Inefficient in-memory storage for rate limiting
// Problems:
// 1. Not distributed - breaks in multi-instance deployments
// 2. Memory leak - no cleanup mechanism for old entries
// 3. No persistence - resets on application restart
// 4. Inefficient data structure for lookups in large datasets
const requestRecords: Record<string, { count: number; timestamp: number }[]> = {};

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skilFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly defaultOptions: RateLimitOptions = {
    windowMs: 2000, // 2 seconds,
    maxRequests: 2,
    skipSuccessfulRequests: false,
    skilFailedRequests: false,
  };

  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const options = this.getRateLimitOptions(context) || this.defaultOptions;
    const ip = request.ip;

    const key = this.generateKey(request, options);

    // Check if rate limit is exceeded
    const isExceeded = await this.checkRateLimit(key, options);

    if (isExceeded) {
      // Get remaining time and requests
      const remainingTime = await this.getRemainingTime(key, options.windowMs);
      const remainingRequests = await this.getRemainingRequests(key, options.maxRequests);

      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', options.maxRequests);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, remainingRequests));
      response.setHeader('X-RateLimit-Reset', new Date(Date.now() + remainingTime).toISOString());
      response.setHeader('Retry-After', Math.ceil(remainingTime / 1000));

      // Call custom handler if provided
      if (options.handler) {
        options.handler(request, response);
      }

      throw new ForbiddenException({
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(remainingTime / 1000),
        remainingRequests: Math.max(0, remainingRequests),
      });
    }

    // Increment request count
    await this.incrementRequestCount(key, options.windowMs);

    // Set rate limit headers for successful requests
    const currentCount = await this.getCurrentCount(key);
    response.setHeader('X-RateLimit-Limit', options.maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, options.maxRequests - currentCount));
    response.setHeader('X-RateLimit-Reset', new Date(Date.now() + options.windowMs).toISOString());

    return true;
  }

  private getRateLimitOptions(context: ExecutionContext): RateLimitOptions | null {
    return this.reflector.getAllAndOverride<RateLimitOptions>('rateLimit', [
      context.getHandler(),
      context.getClass(),
    ]);
  }

  private generateKey(request: Request, config: RateLimitOptions): string {
    if (config.keyGenerator) {
      return config.keyGenerator(request);
    }

    // Default key generation based on IP and user agent
    const ip = this.getClientIp(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const userId = (request as any).user?.userId || 'anonymous';

    // Create a hash of the key components
    const crypto = require('crypto');
    const keyString = `${ip}:${userAgent}:${userId}`;
    return `rate_limit:${crypto.createHash('sha256').update(keyString).digest('hex')}`;
  }

  private getClientIp(request: Request): string {
    // Check for forwarded headers (for proxy/load balancer scenarios)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return (forwardedFor as string).split(',')[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  private async checkRateLimit(key: string, config: RateLimitOptions): Promise<boolean> {
    const currentCount = await this.getCurrentCount(key);
    return currentCount >= config.maxRequests;
  }

  private async getCurrentCount(key: string): Promise<number> {
    const count = await this.cacheService.get<number>(key);
    return count || 0;
  }

  private async incrementRequestCount(key: string, windowMs: number): Promise<void> {
    await this.cacheService.increment(key, 1, { ttl: Math.ceil(windowMs / 1000) });
  }

  private async getRemainingTime(key: string, windowMs: number): Promise<number> {
    const ttl = await this.cacheService.getTTL(key);
    return ttl > 0 ? ttl * 1000 : windowMs;
  }

  private async getRemainingRequests(key: string, maxRequests: number): Promise<number> {
    const currentCount = await this.getCurrentCount(key);
    return Math.max(0, maxRequests - currentCount);
  }

  // Utility methods for advanced rate limiting scenarios
  async getRateLimitInfo(
    key: string,
    config: RateLimitOptions,
  ): Promise<{
    current: number;
    remaining: number;
    reset: Date;
    limit: number;
  }> {
    const current = await this.getCurrentCount(key);
    const remaining = Math.max(0, config.maxRequests - current);
    const reset = new Date(Date.now() + config.windowMs);

    return {
      current,
      remaining,
      reset,
      limit: config.maxRequests,
    };
  }

  async resetRateLimit(key: string): Promise<void> {
    await this.cacheService.delete(key);
  }

  async setRateLimit(key: string, count: number, windowMs: number): Promise<void> {
    await this.cacheService.set(key, count, { ttl: Math.ceil(windowMs / 1000) });
  }

  private handleRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 100; // Max 100 requests per minute

    // Inefficient: Creates a new array for each IP if it doesn't exist
    if (!requestRecords[ip]) {
      requestRecords[ip] = [];
    }

    // Inefficient: Filter operation on potentially large array
    // Every request causes a full array scan
    const windowStart = now - windowMs;
    requestRecords[ip] = requestRecords[ip].filter(record => record.timestamp > windowStart);

    // Check if rate limit is exceeded
    if (requestRecords[ip].length >= maxRequests) {
      // Inefficient error handling: Too verbose, exposes internal details
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Rate limit exceeded',
          message: `You have exceeded the ${maxRequests} requests per ${windowMs / 1000} seconds limit.`,
          limit: maxRequests,
          current: requestRecords[ip].length,
          ip: ip, // Exposing the IP in the response is a security risk
          remaining: 0,
          nextValidRequestTime: requestRecords[ip][0].timestamp + windowMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Inefficient: Potential race condition in concurrent environments
    // No locking mechanism when updating shared state
    requestRecords[ip].push({ count: 1, timestamp: now });

    // Inefficient: No periodic cleanup task, memory usage grows indefinitely
    // Dead entries for inactive IPs are never removed

    return true;
  }
}

// Decorator to apply rate limiting to controllers or routes
export const RateLimit = (limit: number, windowMs: number) => {
  // Inefficient: Decorator doesn't actually use the parameters
  // This is misleading and causes confusion
  return (target: any, key?: string, descriptor?: any) => {
    return descriptor;
  };
};

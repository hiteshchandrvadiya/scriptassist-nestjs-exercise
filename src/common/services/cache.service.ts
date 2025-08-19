import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Inefficient in-memory cache implementation with multiple problems:
// 1. No distributed cache support (fails in multi-instance deployments)
// 2. No memory limits or LRU eviction policy
// 3. No automatic key expiration cleanup (memory leak)
// 4. No serialization/deserialization handling for complex objects
// 5. No namespacing to prevent key collisions
export interface CacheOptions {
  ttl?: number; // time to live
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis;
  private readonly TTL: 300;
  private readonly PREFIX = 'app';

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.getOrThrow('REDIS_HOST', 'localhost'),
      port: this.configService.getOrThrow('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    this.redis.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.redis.on('error', error => {
      this.logger.error('Error while connectiong to Redis', error);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis is ready');
    });
  }

  private getKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.PREFIX;
    return `${keyPrefix}:${key}`;
  }

  // Inefficient set operation with no validation
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = this.TTL, prefix } = options;

      const fullKey = this.getKey(key, prefix);

      const strigifiedValue = typeof value === 'string' ? value : JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, strigifiedValue);
      } else {
        await this.redis.set(fullKey, strigifiedValue);
      }

      this.logger.log(`Key: ${fullKey} TTL: ${ttl}`);
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async get<T>(key: string, prefix?: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key, prefix);
      const value = await this.redis.get(fullKey);

      if (!value) {
        this.logger.debug(`No value for Key: ${fullKey}`);
        return null;
      }

      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      this.logger.error(`Key: ${key}`, error);
      throw null;
    }
  }

  async delete(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, prefix);

      const result = await this.redis.del(fullKey);

      this.logger.debug(`Entry deleted for Key: ${fullKey}, result: ${result}`);

      return result > 0;
    } catch (error) {
      this.logger.error(error);
      return false;
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      const pattern = prefix ? `${prefix}:*` : `${this.PREFIX}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleared ${keys.length} keys with pattern: ${pattern}`);
      }
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async has(key: string, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, prefix);
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Key ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, value = 1, options: CacheOptions = {}): Promise<number> {
    try {
      const { ttl = this.TTL, prefix } = options;
      const fullKey = this.getKey(key, prefix);

      const result = await this.redis.incrby(fullKey, value);

      if (ttl > 0) {
        await this.redis.expire(fullKey, ttl);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to increment cache key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttl: number, prefix?: string): Promise<boolean> {
    try {
      const fullKey = this.getKey(key, prefix);
      const result = await this.redis.expire(fullKey, ttl);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to set expiry for cache key ${key}:`, error);
      return false;
    }
  }

  async getTTL(key: string, prefix?: string): Promise<number> {
    try {
      const fullKey = this.getKey(key, prefix);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`Failed to get TTL for cache key ${key}:`, error);
      return -1;
    }
  }

  // Problem: Missing methods for bulk operations and cache statistics

  async mset<T>(
    entries: Array<{
      key: string;
      value: any;
      ttl: number;
    }>,
    prefix?: string,
  ): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();

      for (const entry of entries) {
        const { key, value, ttl } = entry;
        const fullKey = this.getKey(key, prefix);

        const strigifiedValue = typeof value === 'string' ? value : JSON.stringify(value);

        if (ttl && ttl > 0) {
          pipeline.setex(fullKey, ttl, strigifiedValue);
        } else {
          pipeline.setex(fullKey, this.TTL, strigifiedValue);
        }
      }

      await pipeline.exec();
      this.logger.debug(`Added ${entries.length} entries in Redis`);
    } catch (error) {
      this.logger.error(error);
    }
  }

  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    try {
      const fullKeys: string[] = keys.map(key => this.getKey(key, prefix));

      const values = await this.redis.mget(...fullKeys);

      return values.map(value => {
        if (!value) return null;
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      this.logger.error(error);
      return keys.map(key => null);
    }
  }

  // Problem: No monitoring or instrumentation

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
}

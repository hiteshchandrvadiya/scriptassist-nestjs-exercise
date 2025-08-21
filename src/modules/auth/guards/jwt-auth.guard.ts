import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { CacheService } from '@common/services/cache.service';
import { RequestUser } from '../types/request-user.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private cacheService: CacheService,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Extract + Validate Token
    const token = this.extractTokenFromHeader(request);
    if (!token) throw new UnauthorizedException('No token provided');

    const payload = await this.validateToken(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // 2. Validate Session via SID from token (stable)
    const sessionValid = await this.validateSession(payload.sub, payload.sid);
    if (!sessionValid) {
      throw new UnauthorizedException('Invalid session');
    }

    // 3. User Status Check
    const user = await this.usersService.findOne(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');

    // 4. Role Check
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    // 5. Permission Check
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = await this.getUserPermissions(user.id);
      const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // 6. Resource Ownership Check
    const checkOwner = this.reflector.getAllAndOverride<boolean>('checkResourceOwner', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (checkOwner) {
      const isOwner = await this.checkResourceOwnership(request, user.id);
      if (!isOwner) {
        throw new ForbiddenException('Access denied to this resource');
      }
    }

    // 7. Rate Limit
    const rateLimitExceeded = await this.checkRateLimit(request, user.id);
    if (rateLimitExceeded) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    // Attach user context
    request.user = <RequestUser>{
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: await this.getUserPermissions(user.id),
      sessionId: payload.sid, // use sid from token
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });

      const isBlacklisted = await this.cacheService.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token revoked');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private async validateSession(userId: string, sid?: string): Promise<boolean> {
    if (!userId || !sid) return false;
    const sessionKey = `session:${userId}:${sid}`;
    const session = await this.cacheService.get(sessionKey);
    return !!session;
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = `permissions:${userId}`;
    let permissions = await this.cacheService.get<string[]>(cacheKey);
    if (!permissions) {
      const user = await this.usersService.findOne(userId);
      permissions = this.getRolePermissions(user?.role || 'USER');
      await this.cacheService.set(cacheKey, permissions, { ttl: 300 });
    }
    return permissions;
  }

  private getRolePermissions(role: string): string[] {
    const map: Record<string, string[]> = {
      ADMIN: ['users:read', 'users:write', 'tasks:read', 'tasks:write'],
      MANAGER: ['users:read', 'tasks:read', 'tasks:write'],
      USER: ['tasks:read', 'tasks:write:own'],
    };
    return map[role] || [];
  }

  private async checkResourceOwnership(request: Request, userId: string): Promise<boolean> {
    const resourceId = (request.params as any).id || (request.body as any)?.userId;
    if (!resourceId) return true;

    const ownershipKey = `ownership:${resourceId}`;
    const ownerId = await this.cacheService.get(ownershipKey);
    if (ownerId) return ownerId === userId;

    return true; // allow if not cached; DB check could go here
  }

  private async checkRateLimit(request: Request, userId: string): Promise<boolean> {
    const endpoint = `${request.method}:${request.route?.path || request.url}`;
    const key = `rate_limit:${userId}:${endpoint}`;
    const currentCount = await this.cacheService.increment(key, 1, { ttl: 60 });

    const limits: Record<string, number> = {
      'GET:/tasks': 100,
      'POST:/tasks': 10,
      'PUT:/tasks': 20,
      'DELETE:/tasks': 5,
      default: 50,
    };

    return currentCount > (limits[endpoint] || limits.default);
  }
}

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  LogoutResponse,
  JwtPayload,
  LockoutData,
} from './types/auth.types';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { CacheService } from '@common/services/cache.service';
import { generateSessionId } from '@common/utils/session.util';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly cacheService: CacheService,
  ) {}

  async login(req: Request, loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password } = loginDto;

    const lockoutKey = `lockout:${email}`;
    const lockoutDataStr = await this.cacheService.get(lockoutKey);

    if (typeof lockoutDataStr === 'string' && lockoutDataStr) {
      const { attempts, lockedUntil }: LockoutData = JSON.parse(lockoutDataStr);
      if (attempts >= this.MAX_LOGIN_ATTEMPTS && Date.now() < lockedUntil) {
        const remainingTime = Math.ceil((lockedUntil - Date.now()) / 1000 / 60);
        throw new UnauthorizedException(
          `Account temporarily locked. Try again in ${remainingTime} minutes.`,
        );
      }
    }

    const user: User | null = await this.usersService.findByEmail(email);
    if (!user) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      await this.recordFailedAttempt(email);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.cacheService.delete(lockoutKey);

    // --- NEW: create session and embed SID ---
    const sid = generateSessionId(req);
    const storedValue = await this.cacheService.set(`session:${user.id}:${sid}`, '1', {
      ttl: this.SESSION_TTL_SECONDS,
    });

    const { accessToken, refreshToken } = await this.generateTokens(user, sid);

    // Store refresh token hash for rotation
    const refreshTokenHash = this.hashToken(refreshToken);
    await this.cacheService.set(`refresh_token:${user.id}`, 'valid', { ttl: 7 * 24 * 60 * 60 });
    await this.cacheService.set(`refresh_token_hash:${user.id}`, refreshTokenHash, {
      ttl: 7 * 24 * 60 * 60,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(req: Request, registerDto: RegisterDto): Promise<RegisterResponse> {
    this.validatePasswordStrength(registerDto.password);

    const existingUser: User | null = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) throw new ConflictException('Email already exists');

    const user: User = await this.usersService.create(registerDto);

    // --- NEW: create session and embed SID ---
    const sid = generateSessionId(req);
    await this.cacheService.set(`session:${user.id}:${sid}`, '1', {
      ttl: this.SESSION_TTL_SECONDS,
    });

    const { accessToken, refreshToken } = await this.generateTokens(user, sid);

    const refreshTokenHash = this.hashToken(refreshToken);
    await this.cacheService.set(`refresh_token:${user.id}`, 'valid', { ttl: 7 * 24 * 60 * 60 });
    await this.cacheService.set(`refresh_token_hash:${user.id}`, refreshTokenHash, {
      ttl: 7 * 24 * 60 * 60,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user: User | null = await this.usersService.findOne(payload.sub);
      if (!user) throw new UnauthorizedException('Invalid refresh token');

      // Check if refresh token is in cache (not revoked)
      const isTokenValid = await this.cacheService.get(`refresh_token:${user.id}`);
      if (!isTokenValid) throw new UnauthorizedException('Refresh token has been revoked');

      // Verify the token hash matches
      const tokenHash = await this.cacheService.get(`refresh_token_hash:${user.id}`);
      if (!tokenHash || tokenHash !== this.hashToken(refreshToken)) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        await this.cacheService.delete(`refresh_token:${user.id}`);
        await this.cacheService.delete(`refresh_token_hash:${user.id}`);
        throw new UnauthorizedException('Refresh token has expired');
      }

      // Token rotation: invalidate current refresh token
      await this.cacheService.delete(`refresh_token:${user.id}`);
      await this.cacheService.delete(`refresh_token_hash:${user.id}`);

      // Issue new tokens using the same SID (stable session)
      const sid = payload.sid; // <--- IMPORTANT
      const { accessToken, refreshToken: newRefreshToken } = await this.generateTokens(user, sid);

      // Store new refresh token hash
      const newRefreshTokenHash = this.hashToken(newRefreshToken);
      await this.cacheService.set(`refresh_token:${user.id}`, 'valid', { ttl: 7 * 24 * 60 * 60 });
      await this.cacheService.set(`refresh_token_hash:${user.id}`, newRefreshTokenHash, {
        ttl: 7 * 24 * 60 * 60,
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<LogoutResponse> {
    await this.cacheService.delete(`refresh_token:${userId}`);
    await this.cacheService.delete(`refresh_token_hash:${userId}`);
    // Optional: delete all sessions for the user or current sid if you track it
    return { message: 'Successfully logged out' };
  }

  // --- helpers unchanged except generateTokens ---
  private async generateTokens(
    user: User,
    sid?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
      sid,
    };
    const refreshPayload: JwtPayload = {
      sub: user.id,
      type: 'refresh',
      sid,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '1h',
        secret: process.env.JWT_SECRET || 'your-secret-key',
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async validateUser(userId: string): Promise<User | null> {
    const cacheKey = `user:${userId}`;
    let userStr = await this.cacheService.get(cacheKey);
    let user: User | null = null;

    if (typeof userStr === 'string' && userStr) {
      user = JSON.parse(userStr);
    } else {
      user = await this.usersService.findOne(userId);
      if (user) await this.cacheService.set(cacheKey, JSON.stringify(user), { ttl: 300 });
    }

    return user;
  }

  async validateUserRoles(userId: string, requiredRoles: string[]): Promise<boolean> {
    const user = await this.validateUser(userId);
    if (!user) return false;
    return requiredRoles.includes(user.role);
  }

  private async recordFailedAttempt(email: string) {
    const lockoutKey = `lockout:${email}`;
    const existingData = await this.cacheService.get(lockoutKey);

    let attempts = 1;
    let lockedUntil = 0;

    if (typeof existingData === 'string' && existingData) {
      const data: LockoutData = JSON.parse(existingData);
      attempts = data.attempts + 1;
      if (attempts >= this.MAX_LOGIN_ATTEMPTS) lockedUntil = Date.now() + this.LOCKOUT_DURATION;
    }

    await this.cacheService.set(lockoutKey, JSON.stringify({ attempts, lockedUntil }), {
      ttl: this.LOCKOUT_DURATION / 1000,
    });
  }

  private validatePasswordStrength(password: string) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength)
      throw new BadRequestException('Password must be at least 8 characters long');
    if (!hasUpperCase)
      throw new BadRequestException('Password must contain at least one uppercase letter');
    if (!hasLowerCase)
      throw new BadRequestException('Password must contain at least one lowercase letter');
    if (!hasNumbers) throw new BadRequestException('Password must contain at least one number');
    if (!hasSpecialChar)
      throw new BadRequestException('Password must contain at least one special character');
  }
}

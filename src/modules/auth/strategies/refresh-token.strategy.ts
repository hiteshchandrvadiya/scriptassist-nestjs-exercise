import { CacheService } from '@common/services/cache.service';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as crypto from 'crypto';

export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private redisService: CacheService,
    private jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  public async validate(req: Request, payload: any) {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const authHeader = req.get('Authorization');
    if (!authHeader) throw new UnauthorizedException('No authorization header');

    const refreshToken = authHeader.replace('Bearer', '').trim();

    const isTokenValid = await this.redisService.get(`refresh_token:${payload.sub}`);
    if (!isTokenValid) throw new UnauthorizedException('Refresh token has been revoked');

    const tokenHash = await this.redisService.get(`refresh_token_hash:${payload.sub}`);
    if (!tokenHash || tokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.exp * 1000 < Date.now()) {
      await this.redisService.delete(`refresh_token:${payload.sub}`);
      await this.redisService.delete(`refresh_token_hash:${payload.sub}`);
      throw new UnauthorizedException('Refresh token has expired');
    }

    // NOTE: don’t delete here; do rotation in service after issuing a new refresh
    return {
      userId: payload.sub,
      sid: payload.sid,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

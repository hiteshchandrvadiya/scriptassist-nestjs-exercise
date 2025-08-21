import { Request } from 'express';
import * as crypto from 'crypto';

export function generateSessionId(req: Request): string {
  // Prefer x-forwarded-for for proxy setups, fall back gracefully.
  const forwarded = (req.headers['x-forwarded-for'] as string) || '';
  const ipRaw =
    forwarded.split(',')[0]?.trim() || req.ip || (req.socket as any)?.remoteAddress || '';
  const ip = ipRaw.replace('::ffff:', ''); // normalize IPv4-mapped IPv6

  const ua = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(`${ua}:${ip}`).digest('hex').substring(0, 16);
}

import { randomBytes } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';

import { db } from './db.js';

export const SESSION_COOKIE_NAME = 'snag_session';
const HISTORY_AUTH_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface AuthSession {
  userId: string;
  email: string;
  expiresAt: Date;
}

export function createToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('hex')}`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function getHistoryCutoff(now = new Date()): Date {
  return new Date(now.getTime() - HISTORY_AUTH_WINDOW_MS);
}

export async function getSessionFromRequest(request: FastifyRequest): Promise<AuthSession | null> {
  const authHeader = request.headers.authorization;
  const bearerToken =
    typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice('bearer '.length).trim()
      : null;
  const sessionToken = bearerToken || request.cookies[SESSION_COOKIE_NAME];
  if (!sessionToken) {
    return null;
  }

  const session = await db.session.findUnique({
    where: { token: sessionToken },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await db.session.deleteMany({
      where: { token: sessionToken },
    });
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    expiresAt: session.expiresAt,
  };
}

export function setSessionCookie(reply: FastifyReply, token: string, expiresAt: Date): void {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

import type { FastifyPluginAsync } from 'fastify';

import { addHours, addMinutes, clearSessionCookie, createToken, getSessionFromRequest, setSessionCookie } from '../lib/auth.js';
import { db } from '../lib/db.js';
import { magicLinkBodySchema, verifyMagicLinkQuerySchema } from '../lib/schemas.js';

const authRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: { email: string } }>(
    '/api/auth/magic-link',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator: (request) => request.ip,
        },
      },
    },
    async (request, reply) => {
      const parsedBody = magicLinkBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedBody.error.flatten() });
      }

      const email = parsedBody.data.email.toLowerCase();
      const token = createToken('ml');
      const expiresAt = addMinutes(new Date(), fastify.config.MAGIC_LINK_TTL_MINUTES);

      const user = await db.user.upsert({
        where: { email },
        create: { email },
        update: {},
        select: { id: true, email: true },
      });

      await db.magicLink.create({
        data: {
          token,
          email,
          userId: user.id,
          expiresAt,
        },
      });

      const verifyUrl = new URL('/api/auth/verify', fastify.config.APP_URL);
      verifyUrl.searchParams.set('token', token);

      request.log.info({ email, verifyUrl: verifyUrl.toString() }, 'magic link issued');

      return reply.status(200).send({
        ok: true,
        expiresAt: expiresAt.toISOString(),
        magicLinkUrl: verifyUrl.toString(),
      });
    },
  );

  fastify.get<{ Querystring: { token: string; mode?: 'web' | 'token' } }>(
    '/api/auth/verify',
    {
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
          keyGenerator: (request) => request.ip,
        },
      },
    },
    async (request, reply) => {
      const parsedQuery = verifyMagicLinkQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.status(422).send({ error: 'Validation failed', details: parsedQuery.error.flatten() });
      }

      const link = await db.magicLink.findUnique({
        where: { token: parsedQuery.data.token },
        select: {
          id: true,
          token: true,
          email: true,
          userId: true,
          expiresAt: true,
          consumedAt: true,
        },
      });

      if (!link) {
        return reply.status(404).send({ error: 'Magic link not found' });
      }
      if (link.consumedAt) {
        return reply.status(410).send({ error: 'Magic link already used' });
      }
      if (link.expiresAt.getTime() <= Date.now()) {
        return reply.status(410).send({ error: 'Magic link expired' });
      }

      const user =
        link.userId === null
          ? await db.user.upsert({
              where: { email: link.email.toLowerCase() },
              create: { email: link.email.toLowerCase() },
              update: {},
              select: { id: true, email: true },
            })
          : await db.user.findUnique({
              where: { id: link.userId },
              select: { id: true, email: true },
            });

      if (!user) {
        return reply.status(500).send({ error: 'Unable to resolve magic link user' });
      }

      const sessionToken = createToken('sess');
      const sessionExpiresAt = addHours(new Date(), fastify.config.SESSION_TTL_HOURS);

      await db.$transaction([
        db.magicLink.update({
          where: { id: link.id },
          data: { consumedAt: new Date(), userId: user.id },
        }),
        db.session.create({
          data: {
            token: sessionToken,
            userId: user.id,
            expiresAt: sessionExpiresAt,
          },
        }),
      ]);

      const mode = parsedQuery.data.mode ?? 'web';

      if (mode === 'token') {
        return reply.status(200).send({
          token: sessionToken,
          expiresAt: sessionExpiresAt.toISOString(),
          user: {
            id: user.id,
            email: user.email,
          },
        });
      }

      setSessionCookie(reply, sessionToken, sessionExpiresAt);
      return reply.redirect(`${fastify.config.APP_URL}/login?verified=1`);
    },
  );

  fastify.get('/api/auth/me', async (request, reply) => {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return reply.status(401).send({ user: null });
    }

    return reply.status(200).send({
      user: {
        id: session.userId,
        email: session.email,
      },
      expiresAt: session.expiresAt.toISOString(),
    });
  });

  fastify.post('/api/auth/logout', async (request, reply) => {
    const sessionToken = request.cookies.snag_session;
    if (sessionToken) {
      await db.session.deleteMany({
        where: { token: sessionToken },
      });
    }

    clearSessionCookie(reply);
    return reply.status(200).send({ ok: true });
  });
};

export default authRoute;

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { eq, sql, ilike, desc, and } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { communities } from '../../lib/db/schema.js';

const DiscoverQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(['members', 'newest']).optional().default('members'),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export default async function discoverRoutes(app: FastifyInstance) {
  // Public endpoint - no auth required
  app.get(
    '/api/discover',
    async (
      request: FastifyRequest<{
        Querystring: { q?: string; sort?: string; limit?: number };
      }>,
      reply: FastifyReply,
    ) => {
      const { q, sort, limit } = DiscoverQuerySchema.parse(request.query);

      const memberCountSql = sql<number>`(
        SELECT count(*)::int FROM community_memberships
        WHERE community_memberships.community_id = ${communities.id}
        AND community_memberships.membership_status = 'active'
      )`.as('member_count');

      const conditions = q
        ? and(eq(communities.visibility, 'public'), ilike(communities.name, `%${q}%`))
        : eq(communities.visibility, 'public');

      let query = db
        .select({
          id: communities.id,
          slug: communities.slug,
          name: communities.name,
          description: communities.description,
          iconUrl: communities.iconUrl,
          visibility: communities.visibility,
          createdAt: communities.createdAt,
          memberCount: memberCountSql,
        })
        .from(communities)
        .where(conditions)
        .$dynamic();

      if (sort === 'newest') {
        query = query.orderBy(desc(communities.createdAt));
      } else {
        query = query.orderBy(desc(memberCountSql));
      }

      const rows = await query.limit(limit);

      return reply.send({ communities: rows });
    },
  );
}

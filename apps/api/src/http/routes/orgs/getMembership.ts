import { ensureAuthenticated } from "@/http/middleware/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { roleSchema } from "@saas/auth";

export async function getMembership(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/organizations/:slug/membership',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Get user membership in an organization',
                    security: [{ 'bearerAuth': [] }],
                    params: z.object({
                        slug: z.string().min(3)
                    }),
                    response: {
                        200: z.object({
                            membership: z.object({
                                id: z.uuid(),
                                organizationId: z.uuid(),
                                role: roleSchema
                            })
                        })
                    }
                }

            },
            async (request) => {
                const { slug } = request.params
                const { membership } = await request.getUserMembership(slug)

                return {
                    membership: {
                        id: membership.id,
                        organizationId: membership.organizationId,
                        role: membership.role
                    }
                }
            }
        )
}
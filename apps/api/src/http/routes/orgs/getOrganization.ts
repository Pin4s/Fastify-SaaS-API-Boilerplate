import { ensureAuthenticated } from "@/http/middleware/auth";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";


export async function getOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/organizations/:slug',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Get details from organization',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string()
                    }),
                    response: {
                        200: z.object({
                            organization: z.object({
                                name: z.string(),
                                id: z.uuid(),
                                slug: z.string(),
                                domain: z.string().nullable(),
                                shouldAttachUsersByDomain: z.boolean(),
                                avatarUrl: z.string().nullable(),
                                createdAt: z.date(),
                                updatedAt: z.date(),
                                ownerId: z.uuid(),
                            })
                        })
                    }
                }
            }, async (request) => {
                const { slug } = request.params
                const { organization } = await request.getUserMembership(slug)

                return {
                    organization
                }
            }
        )
}
import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { roleSchema } from "@saas/auth";

export async function getInvites(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .post(
            '/organizations/:slug/invites',
            {
                schema: {
                    tags: ['Invites'],
                    summary: 'Get all organization invites',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string()
                    }),
                    200: z.object({
                        invites: z.array(
                            z.object({
                                id: z.uuid(),
                                email: z.email(),
                                role: roleSchema,
                                createdAt: z.date(),
                                author: z.object({
                                    id: z.string(),
                                    name: z.string().nullable(),

                                }).nullable()
                            })
                        )
                    })
                }
            }, async (request) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('get', 'Invite')) {
                    throw new UnauthorizedError(`You're not allowed to get organization invites`)
                }

                const invites = await prisma.invite.findMany({
                    where: {
                        organizationId: organization.id
                    },
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                }
                )

                return { invites }
            }
        )
}
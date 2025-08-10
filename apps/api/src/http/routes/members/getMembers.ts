import { ensureAuthenticated } from "@/http/middleware/auth";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { roleSchema } from "@saas/auth";

export async function getMembers(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/organizations/:slug/members',
            {
                schema: {
                    tags: ['Members'],
                    summary: 'Get all organization members',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string(),
                    }),
                    response: {
                        200: z.object({
                            members: z.array(
                                z.object({
                                    id: z.uuid(),
                                    name: z.string().nullable(),
                                    email: z.email(),
                                    avatarUrl: z.url().nullable(),
                                    role: roleSchema,
                                    userId: z.uuid(),
                                }
                                )
                            )
                        })
                    }
                }
            }, async (request, reply) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('get', 'User')) {
                    throw new UnauthorizedError(`You're not allowed to see organization members`)
                }

                const members = await prisma.member.findMany({
                    select: {
                        id: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            }
                        }
                    },
                    where: {
                        organizationId: organization.id
                    },
                    orderBy: {
                        role: 'asc'
                    }

                })

                const membersWithRoles = members.map((
                    { user: { id: userId, ...user }, ...member }) => {
                    return {
                        ...user,
                        ...member,
                        userId
                    }
                })


                return reply.status(200).send({ members: membersWithRoles })
            }
        )

}
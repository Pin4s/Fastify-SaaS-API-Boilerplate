import { ensureAuthenticated } from "@/http/middleware/auth";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function getProjects(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/organizations/:orgSlug/projects/:projectSlug',
            {
                schema: {
                    tags: ['Project'],
                    summary: 'Get all organization projects',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string(),
                    }),
                    response: {
                        200: z.object({
                            projects: z.array(
                                z.object({
                                    id: z.string(),
                                    name: z.string(),
                                    slug: z.string(),
                                    ownerId: z.string(),
                                    description: z.string().nullable(),
                                    avatarUrl: z.string().nullable(),
                                    organizationId: z.string(),
                                    createdAt: z.date(),
                                    owner: z.object({
                                        id: z.string(),
                                        name: z.string().nullable(),
                                        avatarUrl: z.string().nullable()
                                    })
                                })
                            )
                        })
                    }
                }
            }, async (request, reply) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('get', 'Project')) {
                    throw new UnauthorizedError(`You're not allowed to see organization projects`)
                }

                const projects = await prisma.project.findMany({
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        ownerId: true,
                        description: true,
                        avatarUrl: true,
                        organizationId: true,
                        createdAt: true,
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true
                            }
                        }
                    },
                    where: {
                        organizationId: organization.id
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                })



                return reply.status(200).send({ projects })
            }
        )

}
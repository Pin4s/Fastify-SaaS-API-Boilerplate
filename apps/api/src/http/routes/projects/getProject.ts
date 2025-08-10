import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { createSlug } from "@/utils/createSlug";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";

export async function getProject(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/organizations/:orgSlug/projects/:projectSlug',
            {
                schema: {
                    tags: ['Project'],
                    summary: 'Get project details',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        orgSlug: z.string(),
                        projectSlug: z.uuid()
                    }),
                    response: {
                        200: z.object({
                            project: z.object({
                                id: z.string(),
                                name: z.string(),
                                slug: z.string(),
                                ownerId: z.string(),
                                description: z.string().nullable(),
                                avatarUrl: z.string().nullable(),
                                organizationId: z.string(),
                                owner: z.object({
                                    id: z.string(),
                                    name: z.string().nullable(),
                                    avatarUrl: z.string().nullable()
                                })
                            })
                        })
                    }
                }
            }, async (request, reply) => {
                const { orgSlug, projectSlug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(orgSlug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('get', 'Project')) {
                    throw new UnauthorizedError(`You're not allowed to see this projects`)
                }

                const project = await prisma.project.findUnique({
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        ownerId: true,
                        description: true,
                        avatarUrl: true,
                        organizationId: true,
                        owner: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true
                            }
                        }
                    },
                    where: {
                        slug: projectSlug,
                        organizationId: organization.id
                    },
                })

                if (!project) {
                    throw new BadRequestError('Project not found')
                }

                return reply.status(200).send({ project })
            }
        )

}
import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { createSlug } from "@/utils/createSlug";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";

export async function createProject(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .post(
            '/organizations/:slug/projects',
            {
                schema: {
                    tags: ['Project'],
                    summary: 'Create a new project',
                    security: [{ bearerAuth: [] }],
                    body: z.object({
                        name: z.string(),
                        description: z.string(),
                    }),
                    params: z.object({
                        slug: z.string()
                    }),
                    response: {
                        201: z.object({
                            projectId: z.uuid()
                        })
                    }
                }
            }, async (request, reply) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('create', 'Project')) {
                    throw new UnauthorizedError(`You're not allowed to create new projects`)
                }

                const { name, description } = request.body

                const project = await prisma.project.create({
                    data: {
                        name,
                        slug: createSlug(name),
                        description,
                        organizationId: organization.id,
                        ownerId: userId,
                    }
                })

                return reply.status(201).send({
                    projectId: project.id
                })
            }
        )
}
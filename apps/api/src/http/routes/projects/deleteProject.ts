import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { createSlug } from "@/utils/createSlug";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { projectSchema } from "@saas/auth";

export async function deleteProject(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .delete(
            '/organizations/:slug/projects/:projectId',
            {
                schema: {
                    tags: ['Project'],
                    summary: 'Delete a project',
                    security: [{ bearerAuth: [] }],
                    body: z.object({
                        name: z.string(),
                        description: z.string(),
                    }),
                    params: z.object({
                        slug: z.string(),
                        projectId: z.uuid()
                    }),
                    response: {
                        204: z.null()
                    }
                }
            }, async (request, reply) => {
                const { slug, projectId } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const project = await prisma.project.findUnique({
                    where: {
                        id: projectId,
                        organizationId: organization.id
                    }
                })

                if(!project){
                    throw new BadRequestError('Project not found')
                }

                const { cannot } = getUsePermissions(userId, membership.role)
                const authProject = projectSchema.parse(project)

                if (cannot('delete', 'Project')) {
                    throw new UnauthorizedError(`You're not allowed to delete this projects`)
                }



                await prisma.project.delete({
                    where:{
                        id: project.id
                    }
                })

                return reply.status(201).send()
            }
        )
}
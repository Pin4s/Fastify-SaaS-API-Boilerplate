import { ensureAuthenticated } from "@/http/middleware/auth";
import { organizationSchema } from "@saas/auth";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance } from "fastify";
import { BadRequestError } from "../_erros/badRequestErrors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function shutdownOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .delete(
            '/organizations/:slug',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Shutdown a organization',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string().min(1).max(50)
                    }),
                    response: {
                        204: z.null()
                    }
                }
            }, async (request, reply) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { membership, organization } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)
                const authOrganization = organizationSchema.parse(
                    organization
                )

                if (cannot('delete', authOrganization)) {
                    throw new UnauthorizedError('You are no allowed to shutdown this organization')
                }


                try {
                    await prisma.$transaction([
                        prisma.project.deleteMany({
                            where: {
                                organizationId: organization.id,
                            },
                        }),

                        prisma.invite.deleteMany({
                            where: {
                                organizationId: organization.id,
                            },
                        }),

                        prisma.member.deleteMany({
                            where: {
                                organizationId: organization.id,
                            },
                        }),

                        prisma.organization.delete({
                            where: {
                                id: organization.id
                            },
                        })
                    ]);
                } catch (error) {
                    console.error("Failed to shutdown organization:", error)
                    throw new BadRequestError('Failed to shutdown organization.')
                }

                return reply.status(204).send()
            }
        )
}


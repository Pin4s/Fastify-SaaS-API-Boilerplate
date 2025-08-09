import { ensureAuthenticated } from "@/http/middleware/auth";
import { organizationSchema } from "@saas/auth";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance } from "fastify";
import { BadRequestError } from "../_erros/badRequestErrors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function updateOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .post(
            '/organizations/:slug',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Update a organization',
                    security: [{ bearerAuth: [] }],
                    body: z.object({
                        name: z.string().max(50),
                        domain: z.string().max(50).optional(),
                        shouldAttachUsersByDomain: z.boolean().optional(),
                    }),
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

                const { name, domain, shouldAttachUsersByDomain } = request.body

                const { cannot } = getUsePermissions(userId, membership.role)

                const authOrganization = organizationSchema.parse({
                    organization
                })

                if (cannot('update', authOrganization)) {
                    throw new UnauthorizedError('You are no allowed to update this organization')
                }

                if (domain) {
                    const organizationByDomain = await prisma.organization.findFirst({
                        where: {
                            domain,
                            id: {
                                not: organization.id
                            }
                        }
                    })

                    if (organizationByDomain) {
                        throw new BadRequestError('Another organization with same domain already exist.')
                    }
                }

                await prisma.organization.update({
                    where: {
                        id: organization.id
                    },
                    data: {
                        name,
                        domain,
                        shouldAttachUsersByDomain,
                    }
                })

                return reply.status(204).send()
            }
        )
}
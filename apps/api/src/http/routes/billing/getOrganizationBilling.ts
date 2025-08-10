import { ensureAuthenticated } from "@/http/middleware/auth";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { prisma } from "@/lib/prisma";


export async function getOrganizationBilling(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/organizations/:slug/billing',
            {
                schema: {
                    tags: ['Billing'],
                    summary: 'Get Billing information from organization',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string()
                    }),
                    response: {
                        200: z.object({
                            billing: z.object({
                                seats: z.object({
                                    amount: z.number(),
                                    unity: z.number(),
                                    prince: z.number(),
                                }),
                                projects: z.object({
                                    amount: z.number(),
                                    unity: z.number(),
                                    prince: z.number(),
                                }),
                                total: z.number(),
                            })
                        })
                    }
                }
            }, async (request) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('get', 'Billing')) {
                    throw new UnauthorizedError(`You don't have permission to view billing information on this organization`)
                }

                const [amountOfMembers, amountOfProject] = await Promise.all([
                    prisma.member.count({
                        where: {
                            organizationId: organization.id,
                            role: { not: 'BILLING' }
                        }
                    }),

                    prisma.project.count({
                        where: {
                            organizationId: organization.id,
                        }
                    })
                ])

                return {
                    billing: {
                        seats: {
                            amount: amountOfMembers,
                            unity: 10,
                            prince: amountOfMembers * 10
                        },
                        projects: {
                            amount: amountOfProject,
                            unity: 20,
                            prince: amountOfProject * 20
                        },
                        total: amountOfMembers * 10 + amountOfProject * 20
                    }
                }
            }
        )
}
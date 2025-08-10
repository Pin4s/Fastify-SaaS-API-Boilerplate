import { ensureAuthenticated } from "@/http/middleware/auth";
import { organizationSchema } from "@saas/auth";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { FastifyInstance } from "fastify";
import { BadRequestError } from "../_erros/badRequestErrors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function transferOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .patch(
            '/organizations/:slug/owner',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Transfer organization ownership',
                    security: [{ bearerAuth: [] }],
                    body: z.object({
                        transferToUserId: z.string().uuid(),
                    }),
                    params: z.object({
                        slug: z.string(),
                    }),
                    response: {
                        204: z.null(),
                    },
                },
            },
            async (request, reply) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { membership, organization } =
                    await request.getUserMembership(slug)

                const authOrganization = organizationSchema.parse(organization)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('trasnfer_ownership', authOrganization)) {
                    throw new UnauthorizedError(
                        `You're not allowed to transfer this organization ownership.`,
                    )
                }

                const { transferToUserId } = request.body

                const transferMembership = await prisma.member.findUnique({
                    where: {
                        organizationId_userId: {
                            organizationId: organization.id,
                            userId: transferToUserId,
                        },
                    },
                })

                if (!transferMembership) {
                    throw new BadRequestError(
                        'Target user is not a member of this organization.',
                    )
                }

                await prisma.$transaction([
                    prisma.member.update({
                        where: {
                            organizationId_userId: {
                                organizationId: organization.id,
                                userId: transferToUserId,
                            },
                        },
                        data: {
                            role: 'ADMIN',
                        },
                    }),
                    prisma.organization.update({
                        where: { id: organization.id },
                        data: { ownerId: transferToUserId },
                    }),
                ])

                return reply.status(204).send()
            },
        )
}
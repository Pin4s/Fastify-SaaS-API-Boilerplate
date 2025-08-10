import { ensureAuthenticated } from "@/http/middleware/auth";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { roleSchema } from "@saas/auth";

export async function updateMember(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .put(
            '/organizations/:slug/members/:memberId',
            {
                schema: {
                    tags: ['Members'],
                    summary: 'Update a member',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string(),
                        memberId: z.uuid()
                    }),
                    body: z.object({
                        role: roleSchema
                    }),
                    response: {
                        204: z.null()
                    }
                }
            }, async (request, reply) => {
                const { slug, memberId } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('update', 'User')) {
                    throw new UnauthorizedError(`You're not allowed to update this members`)
                }

                const { role } = request.body

                await prisma.member.update({
                    where: {
                        id: memberId,
                        organizationId: organization.id
                    },
                    data:{
                        role,
                    }
                })

                return reply.status(204).send()
            }
        )

}
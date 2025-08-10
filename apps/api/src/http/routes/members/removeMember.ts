import { ensureAuthenticated } from "@/http/middleware/auth";
import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { roleSchema } from "@saas/auth";

export async function removeMember(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .delete(
            '/organizations/:slug/members/:memberId',
            {
                schema: {
                    tags: ['Members'],
                    summary: 'Remove a member',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string(),
                        memberId: z.uuid()
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

                if (cannot('delete', 'User')) {
                    throw new UnauthorizedError(`You're not allowed to remove this members from the organization`)
                }

                await prisma.member.delete({
                    where: {
                        id: memberId,
                        organizationId: organization.id
                    },
                })

                return reply.status(204).send()
            }
        )

}
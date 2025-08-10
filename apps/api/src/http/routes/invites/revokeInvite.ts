import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";


export async function revokeInvite(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .delete(
            '/organizations/:slug/invites/:inviteId',
            {
                schema: {
                    tags: ['Invites'],
                    summary: 'Revoke an invite',
                    security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string(),
                        inviteId: z.uuid()
                    }),
                    response: {
                        204: z.null()
                    }
                }
            }, async (request, reply) => {
                const { slug, inviteId } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('delete', 'Invite')) {
                    throw new UnauthorizedError(`You're not allowed to delete an invites`)
                }

                const invite = await prisma.invite.findUnique({
                    where: {
                        id: inviteId,
                        organizationId: organization.id
                    }
                })

                if (!invite) {
                    throw new BadRequestError(`Invite not found`)
                }

                await prisma.invite.delete({
                    where:{
                        id: inviteId
                    }
                })

                return reply.status(204).send()
            }
        )
}
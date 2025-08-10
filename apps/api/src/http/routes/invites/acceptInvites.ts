import { ensureAuthenticated } from "@/http/middleware/auth";
import { BadRequestError } from "../_erros/badRequestErrors";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function acceptInvite(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .post(
            '/invites/:inviteId/accept',
            {
                schema: {
                    tags: ['Invites'],
                    summary: 'Accept an invite',
                    params: z.object({
                        inviteId: z.uuid()
                    }),
                    response: {
                        204: z.null()

                    }
                }
            }, async (request, reply) => {
                const userId = await request.getCurrentUserId()
                const { inviteId } = request.params

                const invite = await prisma.invite.findUnique({
                    where: {
                        id: inviteId
                    },
                })

                if (!invite) {
                    throw new BadRequestError(`Invite not found or expired`)
                }

                const user = await prisma.user.findUnique({
                    where: {
                        id: userId
                    }
                })

                if (!user) {
                    throw new BadRequestError(`User not found`)
                }

                if (invite.email !== user.email) {
                    throw new BadRequestError(`Invite email does not match user email`)
                }

                await prisma.$transaction([
                    prisma.member.create({
                        data: {
                            userId,
                            organizationId: invite.organizationId,
                            role: invite.role,
                        }
                    }),

                    prisma.invite.delete({
                        where: {
                            id: inviteId
                        }
                    })
                ])

                return reply.status(204).send();
            }
        )
}
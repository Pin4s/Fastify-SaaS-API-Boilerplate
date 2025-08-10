import { ensureAuthenticated } from "@/http/middleware/auth";
import { BadRequestError } from "../_erros/badRequestErrors";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { roleSchema } from "@saas/auth";

export async function getPendingInvites(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .get(
            '/pending-invites',
            {
                schema: {
                    tags: ['Invites'],
                    summary: 'Get pending invites for the current user',
                    params: z.object({
                        inviteId: z.uuid()
                    }),
                    response: {
                        200: z.object({
                            invites: z.array(
                                z.object({
                                    id: z.uuid(),
                                    email: z.email(),
                                    role: roleSchema,
                                    createdAt: z.date(),
                                    author: z.object({
                                        id: z.string(),
                                        name: z.string().nullable(),
                                        avatarUrl: z.url().nullable()
                                    }).nullable()
                                })
                            )
                        })

                    }
                }
            }, async (request) => {
                const userId = await request.getCurrentUserId()

                const user = await prisma.user.findUnique({
                    where: {
                        id: userId
                    }
                })

                if (!user) {
                    throw new BadRequestError(`User not found`)
                }



                const invites = await prisma.invite.findMany({
                    where: {
                        email: user.email
                    },
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        createdAt: true,
                        author: {
                            select: {
                                id: true,
                                name: true,
                                avatarUrl: true
                            }
                        },
                        organization: {
                            select: {
                                name: true,
                            }
                        }
                    }
                })


                return { invites }
            }
        )
}
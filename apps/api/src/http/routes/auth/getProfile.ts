import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { BadRequestError } from "../_erros/badRequestErrors";
import { ensureAuthenticated } from "@/http/middleware/auth";

export async function getProfile(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().register(ensureAuthenticated).get('/profile', {
        schema: {
            tags: ['Auth'],
            summary: 'Get authenticate user profile',
            security: [
                {
                    bearerAuth: []
                }
            ],
            response: {
                200: z.object({
                    user: z.object({
                        id: z.uuid(),
                        name: z.string().nullable(),
                        email: z.email(),
                        avatarUrl: z.url().nullable(),
                    })
                })
            }
        }
    },
        async (request, reply) => {
            const userId = await request.getCurrentUserId()

            const user = await prisma.user.findUnique({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                },
                where: {
                    id: userId
                },
            })

            if (!user) {
                throw new BadRequestError('User not found');
            }

            return reply.status(200).send({ user })
        }
    )
}
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

import { BadRequestError } from "../_erros/badRequestErrors";
import { ensureAuthenticated } from "@/http/middleware/auth";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { hash } from "bcryptjs";

export async function resetPassword(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post(
        '/password/reset',
        {
            schema: {
                tags: ['Auth'],
                summary: 'Get authenticated user profile',
                body: z.object({
                    code: z.string(),
                    password: z.string().min(6),
                }),
                // response: {
                //     201: z.null(),
                // },
            },
        },
        async (request, reply) => {
            const { code, password } = request.body

            const tokenFromCode = await prisma.token.findUnique({
                where: { id: code },
            })

            if (!tokenFromCode) {
                throw new UnauthorizedError()
            }

            const passwordHash = await hash(password, 8)

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: tokenFromCode.userId },
                    data: {
                        passwordHash,
                    },
                }),
                prisma.token.delete({
                    where: {
                        id: code
                    }
                })
            ])



            console.log(`Password reset for user with code ${code}`)
            return reply.status(201).send()
        },
    )
}
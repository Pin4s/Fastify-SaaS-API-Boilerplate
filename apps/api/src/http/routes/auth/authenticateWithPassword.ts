import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z, { email } from "zod";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function authenticateWithPassword(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/sessions/password', {
        schema: {
            tags: ['Auth'],
            summary: 'Authenticate with email and password',
            body: z.object({
                email: z.string().email(),
                password: z.string().min(6),
            })
        }
    },
        async (request, reply) => {
            const { email, password } = request.body;

            const userFromEmail = await prisma.user.findUnique({
                where: { email }
            });

            if (!userFromEmail) {
                return reply.status(400).send({
                    message: 'Invalid email or password.'
                });
            }


            if (userFromEmail.passwordHash === null) {
                return reply.status(400).send({
                    message: 'User does not have a password set.'
                });
            }

            const isPasswordValid = await compare(password, userFromEmail.passwordHash)

            if (!isPasswordValid) {
                return reply.status(400).send({
                    message: 'Invalid email or password.'
                });
            }



            const token = await reply.jwtSign({
                sub: userFromEmail.id,
            }, {
                sign: {
                    expiresIn: '7d',
                }
            })

            return reply.status(200).send({
                token
            })
        })
}
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z, { email } from "zod";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { BadRequestError } from "../_erros/badRequestErrors";

export async function authenticateWithPassword(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/sessions/password', {
        schema: {
            tags: ['Auth'],
            summary: 'Authenticate with email and password',
            body: z.object({
                email: z.string().email(),
                password: z.string().min(6),
            }),
            response:{
                201: z.object({
                    token: z.string(),
                })
            }
        }
    },
        async (request, reply) => {
            const { email, password } = request.body;

            const userFromEmail = await prisma.user.findUnique({
                where: { email }
            });

            if (!userFromEmail) {
                throw new BadRequestError('Invalid credentials');
            }


            if (userFromEmail.passwordHash === null) {
                throw new BadRequestError('User does not have a password set.');
            }

            const isPasswordValid = await compare(password, userFromEmail.passwordHash)

            if (!isPasswordValid) {
                throw new BadRequestError('Invalid credentials');
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
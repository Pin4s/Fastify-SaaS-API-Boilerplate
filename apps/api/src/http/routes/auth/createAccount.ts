
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { primsa } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { z } from "zod";

export async function createAccont(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post(
        "/users",
        {
            schema: {
                summary: "Create a new Accoung",
                body: z.object({
                    name: z.string(),
                    email: z.string().email(),
                    password: z.string().min(6),
                })
            }
        },
        async (request, reply) => {
            const { name, email, password } = request.body

            const userWithSameEmail = await primsa.user.findUnique({
                where: { email }
            })

            if (userWithSameEmail) {
                return reply.status(400).send({
                    message: "User with this email already exists."
                })
            }

            const passwordHash = await hash(password, 8)

            await primsa.user.create({
                data: {
                    name,
                    email,
                    passwordHash
                }
            })

            return reply.status(201).send({
                message: "User created successfully."
            })
        }
    )
}

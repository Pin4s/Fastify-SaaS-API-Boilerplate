import { FastifyInstance } from "fastify"
import { UnauthorizedError } from "../routes/_erros/unauthorizedError"


import fastifyPlugin from "fastify-plugin"
import { prisma } from "@/lib/prisma"

export const ensureAuthenticated = fastifyPlugin(async (app: FastifyInstance) => {
    app.decorateRequest('getCurrentUserId')

    app.addHook('preHandler', async (request, reply) => {
        console.log(request.headers)

        request.getCurrentUserId = async () => {
            try {
                const payload = await request.jwtVerify<{ sub: string }>()
                return payload.sub

            } catch (err) {
                throw new UnauthorizedError('Invalid token')
            }
        }

        request.getUserMembership = async (slug: string) => {
            const userId = await request.getCurrentUserId()
            const member = await prisma.member.findFirst({
                where: {
                    userId: userId,
                    organization: {
                        slug
                    }
                },
                include: {
                    organization: true
                }
            })

            if(!member){
                throw new UnauthorizedError('You are not a member of this organization')
            }

            const {organization, ...membership} = member

            return{
                organization,
                membership
            }
        }
    })

})
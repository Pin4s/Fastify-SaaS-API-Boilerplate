import { FastifyInstance } from "fastify"
import { UnauthorizedError } from "../routes/_erros/unauthorizedError"

import fastifyPlugin from "fastify-plugin"

export const ensureAuthenticated = fastifyPlugin(async (app: FastifyInstance) => {
    app.decorateRequest('getCurrentUserId')

    app.addHook('preHandler', async (request, reply) => {
        request.getCurrentUserId = async () => {
            try {
                const payload = await request.jwtVerify<{ sub: string }>()
                return payload.sub

            } catch (err) {
                throw new UnauthorizedError('Invalid token')
            }
        }
    })

})
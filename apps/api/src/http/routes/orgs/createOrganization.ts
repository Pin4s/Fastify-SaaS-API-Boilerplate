import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { createSlug } from "@/utils/createSlug";

export async function createOrganization(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .post(
            '/organizations',
            {
                schema: {
                    tags: ['Organizations'],
                    summary: 'Create a new organization',
                    security: [{ bearerAuth: [] }], 
                    body: z.object({
                        name: z.string().max(50),
                        domain: z.string().max(50).optional(),
                        shouldAttachUsersByDomain: z.boolean().optional(),
                    }),
                    response: {
                        201: z.object({
                            organizationId: z.uuid()
                        })
                    }
                }
            }, async (request, reply) => {
                const userId = await request.getCurrentUserId()
                const { name, domain, shouldAttachUsersByDomain } = request.body

                if (domain) {
                    const organizationByDomain = await prisma.organization.findUnique({
                        where: { domain }
                    })

                    if (organizationByDomain) {
                        throw new BadRequestError('Another organization with same domain already exist.')
                    }
                }

                const organization = await prisma.organization.create({
                    data: {
                        name,
                        slug: createSlug(name),
                        domain,
                        shouldAttachUsersByDomain,
                        ownerId: userId,
                        members: {
                            create: {
                                userId,
                                role: 'ADMIN',
                            },
                        }
                    }
                })

                return reply.status(201).send({
                    organizationId: organization.id
                })
            }
        )
}
import { ensureAuthenticated } from "@/http/middleware/auth";
import { prisma } from "@/lib/prisma";
import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";

import { getUsePermissions } from "@/utils/getUserPernissions";
import { UnauthorizedError } from "../_erros/unauthorizedError";
import { roleSchema } from "@saas/auth";

export async function createInvite(app: FastifyInstance) {
    app
        .withTypeProvider<ZodTypeProvider>()
        .register(ensureAuthenticated)
        .post(
            '/organizations/:slug/invites',
            {
                schema: {
                    tags: ['Invites'],
                    summary: 'Create a new invite for an organization',
                    security: [{ bearerAuth: [] }],
                    body: z.object({
                        email: z.email(),
                        role: roleSchema,
                    }),
                    params: z.object({
                        slug: z.string()
                    }),
                    response: {
                        201: z.object({
                            inviteId: z.uuid()
                        })
                    }
                }
            }, async (request, reply) => {
                const { slug } = request.params
                const userId = await request.getCurrentUserId()
                const { organization, membership } = await request.getUserMembership(slug)

                const { cannot } = getUsePermissions(userId, membership.role)

                if (cannot('create', 'Invite')) {
                    throw new UnauthorizedError(`You're not allowed to create new invites`)
                }

                const { email, role } = request.body

                const [, domain] = email

                if (organization.shouldAttachUsersByDomain && organization.domain === domain) {
                    throw new BadRequestError(`users with ${domain} email domain are automatically attached to this organization`)
                }

                const inviteWithSameEmail = await prisma.invite.findUnique({
                    where: {
                        email_organizationId: {
                            email,
                            organizationId: organization.id,
                        }
                    }
                })

                if (inviteWithSameEmail) {
                    throw new BadRequestError(`An invite with email ${email} already exists`)
                }

                const memberWithSameEmail = await prisma.member.findFirst({
                    where: {
                        organizationId: organization.id,
                        user: {
                            email
                        }
                    }
                })

                if (memberWithSameEmail) {
                    throw new BadRequestError(`User with email ${email} is already a member of this organization`)
                }

                const invite = await prisma.invite.create({
                    data: {
                        organizationId: organization.id,
                        email,
                        role,
                        authorId: userId,
                    }
                })

                return reply.status(201).send({
                    inviteId: invite.id

                })
            }
        )
}
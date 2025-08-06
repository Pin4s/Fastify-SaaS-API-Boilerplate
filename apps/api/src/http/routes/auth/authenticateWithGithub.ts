import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { BadRequestError } from "../_erros/badRequestErrors";
import { prisma } from "@/lib/prisma";
import { env } from "@saas/env";


export async function authenticateWithGithub(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/sessions/github', {
        schema: {
            tags: ['Auth'],
            summary: 'Authenticate with github',
            body: z.object({
                code: z.string(),
            }),
            response: {
                201: z.object({
                    token: z.string(),
                })
            }
        }
    },
        async (request, reply) => {
            const { code } = request.body;

            const githubOAuthURL = new URL('https://github.com/login/oauth/access_token')

            githubOAuthURL.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID);
            githubOAuthURL.searchParams.set('client_secret', env.GITHUB_OAUTH_CLIENT_SECRET);
            githubOAuthURL.searchParams.set('redirect_uri', env.GITHUB_OAUTH_CLIENT_REDIRECT_URI);
            githubOAuthURL.searchParams.set('code', code);

            const githubResponse = await fetch(githubOAuthURL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                }
            })

            const githubAccessTokenResponse = await githubResponse.json();

            console.log('GitHub Access Token Response:', githubAccessTokenResponse);

            const { access_token: gitHubAccessToken } = z.object({
                access_token: z.string(),
                token_type: z.literal('bearer'),
                scope: z.string(),
            }).parse(githubAccessTokenResponse);

            const GitHubUserResponse = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${gitHubAccessToken}`,
                },
            });

            const gitHubUserData = await GitHubUserResponse.json();

            const { id: githubId, name, email, avatar_url: avatarUrl } = z.object({
                id: z.number().int().transform(String),
                avatar_url: z.url(),
                name: z.string().nullable(),
                email: z.email().nullable(),
            }).parse(gitHubUserData);

            if (email === null) {
                throw new BadRequestError('Email not provided by GitHub')
            }

            let user = await prisma.user.findUnique({
                where: {
                    email,
                }
            })

            if (!user) {
                user = await prisma.user.create({
                    data: {

                        name,
                        email,
                        avatarUrl,
                    }
                })
            }

            let account = await prisma.account.findUnique({
                where: {
                    provider_userId: {
                        provider: 'GITHUB',
                        userId: user.id,
                    }
                }
            })

            if (!account) {
                await prisma.account.create({
                    data: {
                        provider: 'GITHUB',
                        providerAccountId: githubId,
                        userId: user.id,
                    }
                })
            }

            const token = await reply.jwtSign({
                sub: user.id,
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
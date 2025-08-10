import { fastify } from 'fastify';
import fastifyCors from '@fastify/cors';
import {
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    ZodTypeProvider
} from 'fastify-type-provider-zod'

import fastifySwaggerUI from '@fastify/swagger-ui';
import fastifySwagger from '@fastify/swagger';
import fastifyJwt from '@fastify/jwt';

import { authenticateWithPassword } from './routes/auth/authenticateWithPassword';
import { createAccont } from './routes/auth/createAccount';
import { getProfile } from './routes/auth/getProfile';
import { errorHandler } from './errorHandler';
import { requestPasswordRecover } from './routes/auth/requestPasswordRecover';
import { resetPassword } from './routes/auth/resetPassword';
import { authenticateWithGithub } from './routes/auth/authenticateWithGithub';
import { env } from '@saas/env';
import { createOrganization } from './routes/orgs/createOrganization';
import { getMembership } from './routes/orgs/getMembership';
import { getOrganization } from './routes/orgs/getOrganization';
import { getOrganizations } from './routes/orgs/getOrganizations';
import { updateOrganization } from './routes/orgs/updateOrganization';
import { shutdownOrganization } from './routes/orgs/shutdownOrganization';
import { transferOrganization } from './routes/orgs/transferOrganization';
import { createProject } from './routes/projects/createProject';



const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.setErrorHandler(errorHandler)

app.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Next.js SaaS',
            description: 'Full-stack SaaS with multi-tenant & RBAC.',
            version: '1.0.0',
        },
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            }

        },
    },
    transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
})


app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
})

app.register(fastifyCors)

//Rotas
app.register(createAccont)
app.register(authenticateWithPassword)
app.register(getProfile)
app.register(requestPasswordRecover)
app.register(resetPassword)
app.register(authenticateWithGithub)

//Organization
app.register(getMembership)
app.register(createOrganization)
app.register(getOrganization)
app.register(getOrganizations)
app.register(updateOrganization)
app.register(shutdownOrganization)
app.register(transferOrganization)

//projects
app.register(createProject)

app.listen({ port: env.SERVER_PORT }).then(() => {
    console.log(`Server is running on ${env.SERVER_PORT}`);
})


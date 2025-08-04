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

const PORT = 3333

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Next.js SaaS',
            description: 'Full-stack SaaS with multi-tenant & RBAC.',
            version: '1.0.0',
        },
        servers: [],
    },
    transform: jsonSchemaTransform,
})

app.register(fastifySwaggerUI, {
    routePrefix: '/docs',
})


app.register(fastifyJwt, {
    secret: 'my-jwt-secret'
})

app.register(fastifyCors)

//Rotas
app.register(createAccont)
app.register(authenticateWithPassword)

app.listen({ port: PORT }).then(() => {
    console.log(`Server is running on ${PORT}`);
})
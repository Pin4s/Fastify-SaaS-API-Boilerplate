import { fastify } from 'fastify';
import fastifyCors from '@fastify/cors';
import { 
    jsonSchemaTransform,
    serializerCompiler,
    validatorCompiler,
    ZodTypeProvider
} from 'fastify-type-provider-zod'

import { createAccont } from './routes/auth/createAccount';

const PORT = 3333

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)

app.register(fastifyCors)

//Rotas
app.register(createAccont)


app.listen({ port: PORT }).then(() => {
    console.log(`Server is running on ${PORT}`);
})
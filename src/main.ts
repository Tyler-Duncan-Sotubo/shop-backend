// main.ts
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import fastifyCompress from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import multipart from '@fastify/multipart';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false, bodyLimit: 10 * 1024 * 1024 }),
    {
      bufferLogs: true,
      bodyParser: false,
    },
  );

  // must be before other bootstrapping logs
  app.useLogger(app.get(Logger));

  app.setGlobalPrefix('api');

  // register Fastify plugins via import’d variables
  const fastify = app.getHttpAdapter().getInstance();
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  });

  await fastify.register(fastifyCompress as any);

  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET, // if you need signed cookies
  });

  // CORS, cookie parser, pipes, etc.
  app.enableCors({
    origin: (origin, callback) => {
      // Allow SSR / server-to-server / Postman
      if (!origin) return callback(null, true);

      try {
        const { hostname } = new URL(origin);

        const primaryDomain = process.env.PRIMARY_DOMAIN;
        const allowLocalhost = process.env.ALLOW_LOCALHOST === 'true';

        const isPrimaryDomain =
          primaryDomain &&
          (hostname === primaryDomain ||
            hostname.endsWith(`.${primaryDomain}`));

        const isLocalhost =
          allowLocalhost &&
          (hostname === 'localhost' || hostname === '127.0.0.1');

        if (isPrimaryDomain || isLocalhost) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked: ${origin}`), false);
      } catch {
        return callback(new Error(`Invalid origin: ${origin}`), false);
      }
    },

    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Host'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT! || 8000;
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`🚀 Listening on port ${port}`);
}

bootstrap();

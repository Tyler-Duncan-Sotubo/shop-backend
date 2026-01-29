"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const nestjs_pino_1 = require("nestjs-pino");
const common_1 = require("@nestjs/common");
const compress_1 = require("@fastify/compress");
const cookie_1 = require("@fastify/cookie");
const multipart_1 = require("@fastify/multipart");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter({ logger: false, bodyLimit: 10 * 1024 * 1024 }), {
        bufferLogs: true,
        bodyParser: false,
    });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.setGlobalPrefix('api');
    const fastify = app.getHttpAdapter().getInstance();
    await app.register(multipart_1.default, {
        limits: { fileSize: 10 * 1024 * 1024 },
    });
    await fastify.register(compress_1.default);
    await fastify.register(cookie_1.default, {
        secret: process.env.COOKIE_SECRET,
    });
    const extraAllowed = (process.env.EXTRA_ALLOWED_ORIGINS ?? '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    function matchesAllowedHost(hostname, rule) {
        hostname = hostname.toLowerCase();
        if (rule.startsWith('*.')) {
            const root = rule.slice(2);
            return hostname === root || hostname.endsWith(`.${root}`);
        }
        return hostname === rule;
    }
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            try {
                const { hostname } = new URL(origin);
                const primaryDomain = process.env.PRIMARY_DOMAIN?.toLowerCase();
                const allowLocalhost = process.env.ALLOW_LOCALHOST === 'true';
                const host = hostname.toLowerCase();
                const isPrimaryDomain = primaryDomain &&
                    (host === primaryDomain || host.endsWith(`.${primaryDomain}`));
                const isLocalhost = allowLocalhost && (host === 'localhost' || host === '127.0.0.1');
                const isExtraAllowed = extraAllowed.some((rule) => matchesAllowedHost(host, rule));
                if (isPrimaryDomain || isLocalhost || isExtraAllowed) {
                    return callback(null, true);
                }
                return callback(new Error(`CORS blocked: ${origin}`), false);
            }
            catch {
                return callback(new Error(`Invalid origin: ${origin}`), false);
            }
        },
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Store-Host'],
        exposedHeaders: ['Content-Length', 'Content-Type'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
    const port = process.env.PORT || 8000;
    await app.listen(port, '0.0.0.0');
    app.get(nestjs_pino_1.Logger).log(`🚀 Listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map
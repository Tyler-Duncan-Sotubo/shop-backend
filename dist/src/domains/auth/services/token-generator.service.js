"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
let TokenGeneratorService = class TokenGeneratorService {
    constructor(configService, jwtService) {
        this.configService = configService;
        this.jwtService = jwtService;
    }
    mustGetString(key) {
        const v = this.configService.get(key);
        if (!v)
            throw new common_1.BadRequestException(`${key} is missing`);
        return v;
    }
    getNumberOrDefault(key, def) {
        const v = this.configService.get(key);
        return Number.isFinite(v) ? Number(v) : def;
    }
    async generateToken(user) {
        const payload = { sub: user.id, email: user.email };
        const accessSecret = this.mustGetString('JWT_SECRET');
        const refreshSecret = this.mustGetString('JWT_REFRESH_SECRET');
        const accessExpSeconds = this.getNumberOrDefault('JWT_EXPIRATION', 1200);
        const refreshExpSeconds = this.getNumberOrDefault('JWT_REFRESH_EXPIRATION', 60 * 60 * 24 * 7);
        const accessToken = this.jwtService.sign(payload, {
            secret: accessSecret,
            expiresIn: accessExpSeconds,
        });
        const refreshToken = this.jwtService.sign(payload, {
            secret: refreshSecret,
            expiresIn: refreshExpSeconds,
        });
        return { accessToken, refreshToken };
    }
    async generateTempToken(user) {
        const payload = { sub: user.id, email: user.email };
        const secret = this.mustGetString('JWT_SECRET');
        return this.jwtService.sign(payload, {
            secret,
            expiresIn: '60m',
        });
    }
};
exports.TokenGeneratorService = TokenGeneratorService;
exports.TokenGeneratorService = TokenGeneratorService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jwt_1.JwtService])
], TokenGeneratorService);
//# sourceMappingURL=token-generator.service.js.map
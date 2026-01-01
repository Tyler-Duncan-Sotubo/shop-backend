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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsService = void 0;
const common_1 = require("@nestjs/common");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const config_1 = require("@nestjs/config");
const drizzle_module_1 = require("../../drizzle/drizzle.module");
let AwsService = class AwsService {
    constructor(configService, db) {
        this.configService = configService;
        this.db = db;
        this.s3Client = new client_s3_1.S3Client({
            region: this.configService.get('AWS_REGION'),
        });
    }
    bucket() {
        const b = this.configService.get('AWS_BUCKET_NAME');
        if (!b)
            throw new Error('AWS_BUCKET_NAME not configured');
        return b;
    }
    async uploadImageToS3(email, fileName, image) {
        const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const contentType = image.startsWith('data:image/png')
            ? 'image/png'
            : 'image/jpeg';
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.configService.get('AWS_BUCKET_NAME'),
            Key: `${email}/${fileName}`,
            Body: base64Data,
            ContentEncoding: 'base64',
            ContentType: contentType,
            ACL: 'public-read',
        }));
        return `https://${this.configService.get('AWS_BUCKET_NAME')}.s3.amazonaws.com/${email}/${fileName}`;
    }
    async uploadPublicObject(params) {
        const { key, body, contentType } = params;
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket(),
            Key: key,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read',
        }));
        const url = `https://${this.bucket()}.s3.amazonaws.com/${key}`;
        return { key, url };
    }
    async uploadPublicPdf(params) {
        return this.uploadPublicObject({
            key: params.key,
            body: params.pdfBuffer,
            contentType: 'application/pdf',
        });
    }
    async getSignedUrl(key, expiresInSeconds = 300) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: this.bucket(),
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
            expiresIn: expiresInSeconds,
        });
    }
    async uploadBase64ImagePublic(params) {
        const { key, base64DataUrl } = params;
        const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        const contentType = base64DataUrl.startsWith('data:image/png')
            ? 'image/png'
            : base64DataUrl.startsWith('data:image/webp')
                ? 'image/webp'
                : base64DataUrl.startsWith('data:image/svg+xml')
                    ? 'image/svg+xml'
                    : 'image/jpeg';
        return this.uploadPublicObject({ key, body: buffer, contentType });
    }
    async deleteFromS3(storageKey) {
        const Bucket = this.configService.get('AWS_BUCKET_NAME');
        if (!Bucket)
            throw new Error('AWS_S3_BUCKET is not set');
        await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket,
            Key: storageKey,
        }));
        return { ok: true };
    }
    extractKeyFromUrl(url) {
        try {
            const u = new URL(url);
            return u.pathname.replace(/^\//, '');
        }
        catch {
            return null;
        }
    }
};
exports.AwsService = AwsService;
exports.AwsService = AwsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], AwsService);
//# sourceMappingURL=aws.service.js.map
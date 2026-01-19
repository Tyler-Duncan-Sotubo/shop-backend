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
const drizzle_module_1 = require("../drizzle/drizzle.module");
let AwsService = class AwsService {
    constructor(configService, db) {
        this.configService = configService;
        this.db = db;
        this.s3Client = new client_s3_1.S3Client({
            region: this.configService.get('AWS_REGION'),
        });
    }
    region() {
        const r = this.configService.get('AWS_REGION');
        if (!r)
            throw new Error('AWS_REGION not configured');
        return r;
    }
    bucket() {
        const b = this.configService.get('AWS_BUCKET_NAME');
        if (!b)
            throw new Error('AWS_BUCKET_NAME not configured');
        return b;
    }
    publicUrlForKey(key) {
        return `https://${this.bucket()}.s3.${this.region()}.amazonaws.com/${key}`;
    }
    publicReadEnabled() {
        return this.configService.get('AWS_S3_PUBLIC_READ') === 'true';
    }
    async headObject(key) {
        const res = await this.s3Client.send(new client_s3_1.HeadObjectCommand({
            Bucket: this.bucket(),
            Key: key,
        }));
        return {
            contentType: res.ContentType ?? null,
            contentLength: typeof res.ContentLength === 'number' ? res.ContentLength : null,
        };
    }
    async uploadImageToS3(email, fileName, image) {
        const base64Data = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const contentType = image.startsWith('data:image/png')
            ? 'image/png'
            : 'image/jpeg';
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket(),
            Key: `${email}/${fileName}`,
            Body: base64Data,
            ContentEncoding: 'base64',
            ContentType: contentType,
            ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
        }));
        return this.publicUrlForKey(`${email}/${fileName}`);
    }
    async uploadPublicObject(params) {
        const { key, body, contentType } = params;
        await this.s3Client.send(new client_s3_1.PutObjectCommand({
            Bucket: this.bucket(),
            Key: key,
            Body: body,
            ContentType: contentType,
            ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
        }));
        const url = this.publicUrlForKey(key);
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
        await this.s3Client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: this.bucket(),
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
    async createPresignedPutUrl(params) {
        const { key, contentType, expiresInSeconds = 300, publicRead = this.publicReadEnabled(), } = params;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: this.bucket(),
            Key: key,
            ContentType: contentType,
            ...(publicRead ? { ACL: 'public-read' } : {}),
        });
        const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, {
            expiresIn: expiresInSeconds,
        });
        return {
            key,
            uploadUrl,
            url: this.publicUrlForKey(key),
        };
    }
    async assertObjectExists(key) {
        await this.s3Client.send(new client_s3_1.HeadObjectCommand({
            Bucket: this.bucket(),
            Key: key,
        }));
        return true;
    }
    async moveObject(params) {
        const { fromKey, toKey } = params;
        await this.s3Client.send(new client_s3_1.CopyObjectCommand({
            Bucket: this.bucket(),
            CopySource: `${this.bucket()}/${fromKey}`,
            Key: toKey,
            ...(this.publicReadEnabled() ? { ACL: 'public-read' } : {}),
        }));
        await this.deleteFromS3(fromKey);
        return {
            key: toKey,
            url: this.publicUrlForKey(toKey),
        };
    }
    async getObjectBuffer(key) {
        const res = await this.s3Client.send(new client_s3_1.GetObjectCommand({
            Bucket: this.bucket(),
            Key: key,
        }));
        if (!res.Body) {
            throw new Error('S3 object body is empty');
        }
        const stream = res.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return {
            buffer: Buffer.concat(chunks),
            contentType: res.ContentType ?? null,
        };
    }
};
exports.AwsService = AwsService;
exports.AwsService = AwsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)(drizzle_module_1.DRIZZLE)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], AwsService);
//# sourceMappingURL=aws.service.js.map
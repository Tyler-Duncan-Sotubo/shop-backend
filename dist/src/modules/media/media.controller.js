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
exports.MediaController = void 0;
const common_1 = require("@nestjs/common");
const upload_editor_image_dto_1 = require("./dto/upload-editor-image.dto");
const media_service_1 = require("./media.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorator/current-user.decorator");
const create_media_dto_1 = require("./dto/create-media.dto");
const get_media_query_dto_1 = require("./dto/get-media-query.dto");
let MediaController = class MediaController {
    constructor(mediaService) {
        this.mediaService = mediaService;
    }
    uploadEditorImage(user, dto) {
        return this.mediaService.uploadEditorImage(user.companyId, dto);
    }
    uploadMediaFile(user, dto) {
        return this.mediaService.uploadMediaFile(user.companyId, dto);
    }
    getMedia(user, query) {
        return this.mediaService.getMedia(user.companyId, query);
    }
    deleteMedia(user, mediaId) {
        return this.mediaService.removeMedia(user.companyId, mediaId);
    }
};
exports.MediaController = MediaController;
__decorate([
    (0, common_1.Post)('editor-image'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['media.upload']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, upload_editor_image_dto_1.UploadEditorImageDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "uploadEditorImage", null);
__decorate([
    (0, common_1.Post)('upload-file'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['media.upload']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_media_dto_1.CreateMediaDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "uploadMediaFile", null);
__decorate([
    (0, common_1.Get)('list'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['media.upload']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_media_query_dto_1.GetMediaQueryDto]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "getMedia", null);
__decorate([
    (0, common_1.Delete)(':mediaId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.SetMetadata)('permissions', ['media.upload']),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('mediaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], MediaController.prototype, "deleteMedia", null);
exports.MediaController = MediaController = __decorate([
    (0, common_1.Controller)('media'),
    __metadata("design:paramtypes", [media_service_1.MediaService])
], MediaController);
//# sourceMappingURL=media.controller.js.map
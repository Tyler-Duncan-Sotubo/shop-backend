import {
  Body,
  Controller,
  Post,
  UseGuards,
  SetMetadata,
  Get,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { CreateMediaDto } from './dto/create-media.dto';
import { GetMediaQueryDto } from './dto/get-media-query.dto';
import { PresignProductUploadsDto } from './dto/uploads-signed.dto';
import { FinalizeMediaUploadDto } from './dto/finalize-media.dto';
import { PresignMediaUploadsDto } from './dto/presign-media.dto';
import { GenerateFaviconsDto } from './dto/generate-favicons.dto';
import { MediaService } from 'src/domains/media/media.service';
import { CurrentUser } from '../common/decorator/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('editor-image')
  @SetMetadata('permissions', ['media.upload']) // or blog.posts.create
  uploadEditorImage(
    @CurrentUser() user: User,
    @Body() dto: UploadEditorImageDto,
  ) {
    return this.mediaService.uploadEditorImage(user.companyId, dto);
  }

  @Post('upload-file')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['media.upload']) // or blog.posts.create
  uploadMediaFile(@CurrentUser() user: User, @Body() dto: CreateMediaDto) {
    return this.mediaService.uploadMediaFile(user.companyId, dto);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['media.upload'])
  getMedia(@CurrentUser() user: User, @Query() query: GetMediaQueryDto) {
    return this.mediaService.getMedia(user.companyId, query);
  }

  @Delete(':mediaId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['media.upload'])
  deleteMedia(@CurrentUser() user: User, @Param('mediaId') mediaId: string) {
    return this.mediaService.removeMedia(user.companyId, mediaId);
  }

  @Post('products/presign')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['media.upload'])
  async presignProductUploads(
    @CurrentUser() user: User,
    @Body() dto: PresignProductUploadsDto,
  ) {
    const result = await this.mediaService.presignProductUploads({
      companyId: user.companyId,
      files: dto.files,
    });
    return result;
  }

  @Post('presign')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['media.upload'])
  async presignMediaUploads(
    @CurrentUser() user: User,
    @Body() dto: PresignMediaUploadsDto,
  ) {
    return this.mediaService.presignMediaUploads({
      companyId: user.companyId,
      files: dto.files,
      storeId: dto.storeId,
      folder: dto.folder,
      expiresInSeconds: dto.expiresInSeconds,
      publicRead: dto.publicRead ?? true,
    });
  }

  @Post('finalize')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['media.upload'])
  async finalizeMediaUpload(
    @CurrentUser() user: User,
    @Body() dto: FinalizeMediaUploadDto,
  ) {
    return this.mediaService.finalizeMediaUpload({
      companyId: user.companyId,
      storeId: dto.storeId,
      key: dto.key,
      url: dto.url,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      folder: dto.folder,
      tag: dto.tag,
      altText: dto.altText,
    });
  }

  @Post('seo/generate-favicons')
  @UseGuards(JwtAuthGuard)
  generateFavicons(
    @CurrentUser() user: User,
    @Body() dto: GenerateFaviconsDto,
  ) {
    return this.mediaService.generateFaviconsFromIcon({
      companyId: user.companyId,
      storeId: dto.storeId,
      sourceUrl: dto.sourceUrl,
      folder: 'seo/favicons',
    });
  }
}

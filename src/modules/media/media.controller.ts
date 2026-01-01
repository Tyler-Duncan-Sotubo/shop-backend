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
import { User } from 'src/common/types/user.type';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { CreateMediaDto } from './dto/create-media.dto';
import { GetMediaQueryDto } from './dto/get-media-query.dto';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('editor-image')
  @UseGuards(JwtAuthGuard)
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
}

import { Body, Controller, Post, UseGuards, SetMetadata } from '@nestjs/common';
import { User } from 'src/common/types/user.type';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';

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
    return this.mediaService.uploadEditorImage(user.companyId, dto.base64);
  }
}

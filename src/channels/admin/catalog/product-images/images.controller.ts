import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Delete,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { User } from 'src/channels/admin/common/types/user.type';
import { ImagesService } from 'src/domains/catalog/services/images.service';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';
import { CreateImageDto, UpdateImageDto } from './dto';

@Controller('product-images')
@UseGuards(JwtAuthGuard)
export class ImagesController extends BaseController {
  constructor(private readonly imagesService: ImagesService) {
    super();
  }

  // ----------------- List images for a product -----------------

  @Get('products/:productId')
  @SetMetadata('permissions', ['products.read'])
  async getProductImages(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.imagesService.getImages(user.companyId, productId);
  }

  // ----------------- Create image for a product -----------------
  @Post('products/:productId')
  @SetMetadata('permissions', ['products.update'])
  async createImage(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body() dto: CreateImageDto,
    @Ip() ip: string,
  ) {
    return this.imagesService.createImage(
      user.companyId,
      productId,
      dto,
      user,
      ip,
    );
  }

  // ----------------- Update image (metadata / variant / file) -----------------

  @Patch(':imageId')
  @SetMetadata('permissions', ['products.update'])
  async updateImage(
    @CurrentUser() user: User,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateImageDto,
    @Ip() ip: string,
  ) {
    return this.imagesService.updateImage(
      user.companyId,
      imageId,
      dto,
      user,
      ip,
    );
  }

  // ----------------- Delete image -----------------

  @Delete(':imageId')
  @SetMetadata('permissions', ['products.update'])
  async deleteImage(
    @CurrentUser() user: User,
    @Param('imageId') imageId: string,
    @Ip() ip: string,
  ) {
    return this.imagesService.deleteImage(user.companyId, imageId, user, ip);
  }
}

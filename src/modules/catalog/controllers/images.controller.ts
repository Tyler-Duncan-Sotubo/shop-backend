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
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';

import { ImagesService } from '../services/images.service';
import { CreateImageDto, UpdateImageDto } from '../dtos/images';

@Controller('catalog')
export class ImagesController extends BaseController {
  constructor(private readonly imagesService: ImagesService) {
    super();
  }

  // ----------------- List images for a product -----------------

  @Get('products/:productId/images')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getProductImages(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.imagesService.getImages(user.companyId, productId);
  }

  // ----------------- Create image for a product -----------------

  @Post('products/:productId/images')
  @UseGuards(JwtAuthGuard)
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

  @Patch('images/:imageId')
  @UseGuards(JwtAuthGuard)
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

  @Delete('images/:imageId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async deleteImage(
    @CurrentUser() user: User,
    @Param('imageId') imageId: string,
    @Ip() ip: string,
  ) {
    return this.imagesService.deleteImage(user.companyId, imageId, user, ip);
  }
}

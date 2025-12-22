// src/modules/catalog/controllers/options.controller.ts
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

import { OptionsService } from '../services/options.service';
import {
  CreateOptionDto,
  UpdateOptionDto,
  CreateOptionValueDto,
  UpdateOptionValueDto,
} from '../dtos/options';

@Controller('catalog')
export class OptionsController extends BaseController {
  constructor(private readonly optionsService: OptionsService) {
    super();
  }

  // ----------------- Product Options -----------------

  @Get('products/:productId/options')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.read'])
  async getOptionsForProduct(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
  ) {
    return this.optionsService.getOptionsWithValues(user.companyId, productId);
  }

  @Post('products/:productId/options')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async createOption(
    @CurrentUser() user: User,
    @Param('productId') productId: string,
    @Body() dto: CreateOptionDto,
    @Ip() ip: string,
  ) {
    return this.optionsService.createOption(
      user.companyId,
      productId,
      dto,
      user,
      ip,
    );
  }

  @Patch('options/:optionId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async updateOption(
    @CurrentUser() user: User,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateOptionDto,
    @Ip() ip: string,
  ) {
    return this.optionsService.updateOption(
      user.companyId,
      optionId,
      dto,
      user,
      ip,
    );
  }

  @Delete('options/:optionId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async deleteOption(
    @CurrentUser() user: User,
    @Param('optionId') optionId: string,
    @Ip() ip: string,
  ) {
    return this.optionsService.deleteOption(user.companyId, optionId, user, ip);
  }

  // ----------------- Option Values -----------------

  @Post('options/:optionId/values')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async createOptionValue(
    @CurrentUser() user: User,
    @Param('optionId') optionId: string,
    @Body() dto: CreateOptionValueDto,
    @Ip() ip: string,
  ) {
    return this.optionsService.createOptionValue(
      user.companyId,
      optionId,
      dto,
      user,
      ip,
    );
  }

  @Patch('option-values/:valueId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async updateOptionValue(
    @CurrentUser() user: User,
    @Param('valueId') valueId: string,
    @Body() dto: UpdateOptionValueDto,
    @Ip() ip: string,
  ) {
    return this.optionsService.updateOptionValue(
      user.companyId,
      valueId,
      dto,
      user,
      ip,
    );
  }

  @Delete('option-values/:valueId')
  @UseGuards(JwtAuthGuard)
  @SetMetadata('permissions', ['products.update'])
  async deleteOptionValue(
    @CurrentUser() user: User,
    @Param('valueId') valueId: string,
    @Ip() ip: string,
  ) {
    return this.optionsService.deleteOptionValue(
      user.companyId,
      valueId,
      user,
      ip,
    );
  }
}

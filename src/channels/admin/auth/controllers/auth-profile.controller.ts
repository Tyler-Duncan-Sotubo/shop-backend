import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { User } from 'src/channels/admin/common/types/user.type';
import { UserService } from 'src/domains/auth/services';
import { ResponseInterceptor } from 'src/infrastructure/interceptor/error-interceptor';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorator/current-user.decorator';

@Controller('auth')
export class AuthProfileController {
  constructor(private readonly userService: UserService) {}

  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUser(@CurrentUser() user: User) {
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Patch('profile')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateUserProfile(user.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('profile')
  @UseInterceptors(ResponseInterceptor)
  @UseGuards(JwtAuthGuard)
  async getUserProfile(@CurrentUser() user: User) {
    return this.userService.getUserProfile(user.id);
  }
}

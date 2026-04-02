import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SearchService } from 'src/domains/search/search.service';
import { User } from '../common/types/user.type';
import { CurrentUser } from '../common/decorator/current-user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async globalSearch(@Query('q') q: string, @CurrentUser() user: User) {
    if (!q || q.trim().length < 2) {
      return { data: { orders: [], invoices: [], quotes: [] } };
    }
    return {
      data: await this.searchService.globalSearch(user.companyId, q.trim()),
    };
  }
}

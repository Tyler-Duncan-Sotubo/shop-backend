import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogModule } from 'src/domains/blog/blog.module';

@Module({
  imports: [BlogModule],
  controllers: [BlogController],
})
export class StorefrontBlogModule {}

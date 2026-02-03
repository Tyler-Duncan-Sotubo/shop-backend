import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { StoresService } from '../commerce/stores/stores.service';
import { BlogPostsReportService } from './blog-posts-report.service';

@Module({
  providers: [BlogService, AwsService, StoresService, BlogPostsReportService],
  exports: [BlogService, BlogPostsReportService],
})
export class BlogModule {}

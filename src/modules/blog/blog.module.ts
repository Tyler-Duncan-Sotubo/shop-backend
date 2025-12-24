import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [BlogController],
  providers: [BlogService, AwsService],
})
export class BlogModule {}

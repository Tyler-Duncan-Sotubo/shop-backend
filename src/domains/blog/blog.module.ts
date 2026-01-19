import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';
import { StoresService } from '../commerce/stores/stores.service';

@Module({
  providers: [BlogService, AwsService, StoresService],
  exports: [BlogService],
})
export class BlogModule {}

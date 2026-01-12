import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { AwsService } from 'src/common/aws/aws.service';
import { StoresService } from '../commerce/stores/stores.service';

@Module({
  controllers: [BlogController],
  providers: [BlogService, AwsService, StoresService],
})
export class BlogModule {}

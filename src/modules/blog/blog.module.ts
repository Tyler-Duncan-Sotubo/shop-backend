import { Module } from '@nestjs/common';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { AwsService } from 'src/common/aws/aws.service';
import { ApiKeysService } from '../iam/api-keys/api-keys.service';

@Module({
  controllers: [BlogController],
  providers: [BlogService, AwsService, ApiKeysService],
})
export class BlogModule {}

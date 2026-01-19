import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { AwsService } from 'src/infrastructure/aws/aws.service';

@Module({
  providers: [MediaService, AwsService],
  exports: [MediaService],
})
export class MediaModule {}

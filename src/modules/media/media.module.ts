import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { AwsService } from 'src/common/aws/aws.service';

@Module({
  controllers: [MediaController],
  providers: [MediaService, AwsService],
  exports: [MediaService],
})
export class MediaModule {}

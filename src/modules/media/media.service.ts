import { Injectable } from '@nestjs/common';
import { AwsService } from 'src/common/aws/aws.service';

@Injectable()
export class MediaService {
  constructor(private readonly aws: AwsService) {}

  async uploadEditorImage(companyId: string, base64: string) {
    const fileName = `editor-${Date.now()}.jpg`;
    const url = await this.aws.uploadImageToS3(companyId, fileName, base64);
    return { url };
  }
}

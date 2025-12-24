import { AwsService } from 'src/common/aws/aws.service';
export declare class MediaService {
    private readonly aws;
    constructor(aws: AwsService);
    uploadEditorImage(companyId: string, base64: string): Promise<{
        url: string;
    }>;
}

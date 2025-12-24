import { User } from 'src/common/types/user.type';
import { UploadEditorImageDto } from './dto/upload-editor-image.dto';
import { MediaService } from './media.service';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    uploadEditorImage(user: User, dto: UploadEditorImageDto): Promise<{
        url: string;
    }>;
}

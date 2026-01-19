import { User } from 'src/channels/admin/common/types/user.type';
import { ImagesService } from 'src/domains/catalog/services/images.service';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateImageDto, UpdateImageDto } from './dto';
export declare class ImagesController extends BaseController {
    private readonly imagesService;
    constructor(imagesService: ImagesService);
    getProductImages(user: User, productId: string): Promise<{
        [x: string]: any;
    }[]>;
    createImage(user: User, productId: string, dto: CreateImageDto, ip: string): Promise<any>;
    updateImage(user: User, imageId: string, dto: UpdateImageDto, ip: string): Promise<{
        [x: string]: any;
    }>;
    deleteImage(user: User, imageId: string, ip: string): Promise<any>;
}

import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
import { ImagesService } from '../services/images.service';
import { CreateImageDto, UpdateImageDto } from '../dtos/images';
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

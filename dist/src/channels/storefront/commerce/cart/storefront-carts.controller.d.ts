import { FastifyReply } from 'fastify';
import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { CreateCartDto, AddCartItemDto, UpdateCartItemDto } from './dto';
import { CartService } from 'src/domains/commerce/cart/cart.service';
import { AuthCustomer } from '../../common/types/customers';
export declare class StorefrontCartController extends BaseController {
    private readonly cartService;
    constructor(cartService: CartService);
    private attachRotatedCartToken;
    createGuestCart(companyId: string, storeId: string, dto: CreateCartDto, ip: string, reply: FastifyReply): Promise<never>;
    getCart(req: any, reply: FastifyReply, companyId: string, storeId: string, cartId: string): Promise<never>;
    items(req: any, reply: FastifyReply, companyId: string, storeId: string, cartId: string): Promise<never>;
    addItem(req: any, reply: FastifyReply, companyId: string, storeId: string, cartId: string, dto: AddCartItemDto, ip: string): Promise<never>;
    updateItemQty(req: any, reply: FastifyReply, companyId: string, storeId: string, cartId: string, cartItemId: string, dto: UpdateCartItemDto, ip: string): Promise<never>;
    removeItem(req: any, reply: FastifyReply, companyId: string, storeId: string, cartId: string, cartItemId: string, ip: string): Promise<never>;
    claimCart(req: any, reply: FastifyReply, companyId: string, storeId: string, customer: AuthCustomer, ip: string): Promise<never>;
}

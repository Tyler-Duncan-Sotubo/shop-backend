import { CreateBlogPostDto, BlogPostProductDto } from './create-blog-post.dto';
declare const UpdateBlogPostDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateBlogPostDto>>;
export declare class UpdateBlogPostDto extends UpdateBlogPostDto_base {
    products?: BlogPostProductDto[];
}
export declare class ReplaceBlogPostProductsDto {
    products: BlogPostProductDto[];
}
export declare class BlogPostIdParamDto {
    id: string;
}
export {};

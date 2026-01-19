// storefront-product.dto.ts (shape matches ProductCard)
export type StorefrontProductDto = {
  id: string;
  name: string;
  slug: string;
  permalink: string;

  price: string;
  regular_price: string;
  sale_price: string | null;
  on_sale: boolean;

  price_html: string;

  average_rating: string;
  rating_count: number;

  images: { src: string; alt?: string | null }[];
  tags: { name: string; slug?: string }[];
};

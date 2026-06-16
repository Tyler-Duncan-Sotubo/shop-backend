import { OnModuleInit } from '@nestjs/common';
export type NewsletterContentJson = {
    heroImageUrl?: string | null;
    heroTitle?: string | null;
    heroHighlight?: string | null;
    discountLabel?: string | null;
    discountValue?: string | null;
    promoCode?: string | null;
    body?: string | null;
    products?: {
        imageUrl: string;
        label: string;
        url?: string;
        price?: string;
    }[];
    ctaUrl?: string | null;
    ctaText?: string | null;
    faqText?: string | null;
};
export type TemplateData = NewsletterContentJson & {
    fromName: string;
    logoUrl?: string | null;
    brandColor?: string | null;
    companyAddress?: string | null;
    socialLinks?: {
        twitter?: string | null;
        facebook?: string | null;
        instagram?: string | null;
        youtube?: string | null;
    } | null;
    subject: string;
    unsubscribeUrl: string;
    year: number;
};
export declare class TemplateRendererService implements OnModuleInit {
    private compiledTemplates;
    onModuleInit(): void;
    private loadTemplates;
    render(templateName: 'newsletter', data: TemplateData): string;
    private parseSocialLinks;
}

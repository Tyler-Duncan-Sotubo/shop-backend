import { z } from 'zod';
export declare const PaymentMethods: readonly ["visa", "mastercard", "verve", "amex", "discover", "paypal", "apple_pay", "google_pay", "bank_transfer"];
export type PaymentMethod = (typeof PaymentMethods)[number];
export declare const StorefrontOverridesV1Schema: z.ZodObject<{
    ui: z.ZodOptional<z.ZodObject<{
        headerMenu: z.ZodOptional<z.ZodObject<{
            about: z.ZodOptional<z.ZodBoolean>;
            contact: z.ZodOptional<z.ZodBoolean>;
            blog: z.ZodOptional<z.ZodBoolean>;
        }, "strict", z.ZodTypeAny, {
            blog?: boolean | undefined;
            about?: boolean | undefined;
            contact?: boolean | undefined;
        }, {
            blog?: boolean | undefined;
            about?: boolean | undefined;
            contact?: boolean | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        headerMenu?: {
            blog?: boolean | undefined;
            about?: boolean | undefined;
            contact?: boolean | undefined;
        } | undefined;
    }, {
        headerMenu?: {
            blog?: boolean | undefined;
            about?: boolean | undefined;
            contact?: boolean | undefined;
        } | undefined;
    }>>;
    theme: z.ZodOptional<z.ZodObject<{
        assets: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            logoUrl?: string | undefined;
        }, {
            logoUrl?: string | undefined;
        }>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        assets: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            logoUrl?: string | undefined;
        }, {
            logoUrl?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        assets: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            logoUrl?: string | undefined;
        }, {
            logoUrl?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">>>;
    seo: z.ZodOptional<z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        favicon: z.ZodOptional<z.ZodObject<{
            ico: z.ZodOptional<z.ZodString>;
            png: z.ZodOptional<z.ZodString>;
            svg: z.ZodOptional<z.ZodString>;
            appleTouch: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            png?: string | undefined;
            ico?: string | undefined;
            svg?: string | undefined;
            appleTouch?: string | undefined;
        }, {
            png?: string | undefined;
            ico?: string | undefined;
            svg?: string | undefined;
            appleTouch?: string | undefined;
        }>>;
        ogImage: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            alt: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            alt?: string | undefined;
        }, {
            url?: string | undefined;
            alt?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        description?: string | undefined;
        title?: string | undefined;
        favicon?: {
            png?: string | undefined;
            ico?: string | undefined;
            svg?: string | undefined;
            appleTouch?: string | undefined;
        } | undefined;
        ogImage?: {
            url?: string | undefined;
            alt?: string | undefined;
        } | undefined;
    }, {
        description?: string | undefined;
        title?: string | undefined;
        favicon?: {
            png?: string | undefined;
            ico?: string | undefined;
            svg?: string | undefined;
            appleTouch?: string | undefined;
        } | undefined;
        ogImage?: {
            url?: string | undefined;
            alt?: string | undefined;
        } | undefined;
    }>>;
    header: z.ZodOptional<z.ZodObject<{
        topBar: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            autoplay: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                intervalMs: z.ZodOptional<z.ZodNumber>;
            }, "strict", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            }, {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            }>>;
            slides: z.ZodOptional<z.ZodArray<z.ZodObject<{
                text: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                text: string;
            }, {
                text: string;
            }>, "many">>;
        }, "strict", z.ZodTypeAny, {
            enabled?: boolean | undefined;
            autoplay?: {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            } | undefined;
            slides?: {
                text: string;
            }[] | undefined;
        }, {
            enabled?: boolean | undefined;
            autoplay?: {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            } | undefined;
            slides?: {
                text: string;
            }[] | undefined;
        }>>;
        nav: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            items: z.ZodOptional<z.ZodArray<z.ZodObject<{
                label: z.ZodString;
                href: z.ZodString;
            }, "strict", z.ZodTypeAny, {
                label: string;
                href: string;
            }, {
                label: string;
                href: string;
            }>, "many">>;
            icons: z.ZodOptional<z.ZodObject<{
                search: z.ZodOptional<z.ZodBoolean>;
                account: z.ZodOptional<z.ZodBoolean>;
                wishlist: z.ZodOptional<z.ZodBoolean>;
                cart: z.ZodOptional<z.ZodBoolean>;
                quote: z.ZodOptional<z.ZodBoolean>;
            }, "strict", z.ZodTypeAny, {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            }, {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            }>>;
        }, "strict", z.ZodTypeAny, {
            enabled?: boolean | undefined;
            items?: {
                label: string;
                href: string;
            }[] | undefined;
            icons?: {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            } | undefined;
        }, {
            enabled?: boolean | undefined;
            items?: {
                label: string;
                href: string;
            }[] | undefined;
            icons?: {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            } | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        topBar?: {
            enabled?: boolean | undefined;
            autoplay?: {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            } | undefined;
            slides?: {
                text: string;
            }[] | undefined;
        } | undefined;
        nav?: {
            enabled?: boolean | undefined;
            items?: {
                label: string;
                href: string;
            }[] | undefined;
            icons?: {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            } | undefined;
        } | undefined;
    }, {
        topBar?: {
            enabled?: boolean | undefined;
            autoplay?: {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            } | undefined;
            slides?: {
                text: string;
            }[] | undefined;
        } | undefined;
        nav?: {
            enabled?: boolean | undefined;
            items?: {
                label: string;
                href: string;
            }[] | undefined;
            icons?: {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>;
    footer: z.ZodOptional<z.ZodObject<{
        brand: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
            blurb: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            logoUrl?: string | undefined;
            blurb?: string | undefined;
        }, {
            logoUrl?: string | undefined;
            blurb?: string | undefined;
        }>>;
        newsletter: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodOptional<z.ZodBoolean>;
            title: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            placeholder: z.ZodOptional<z.ZodString>;
            ctaLabel: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            description?: string | undefined;
            title?: string | undefined;
            enabled?: boolean | undefined;
            placeholder?: string | undefined;
            ctaLabel?: string | undefined;
        }, {
            description?: string | undefined;
            title?: string | undefined;
            enabled?: boolean | undefined;
            placeholder?: string | undefined;
            ctaLabel?: string | undefined;
        }>>;
        bottomBar: z.ZodOptional<z.ZodObject<{
            leftText: z.ZodOptional<z.ZodString>;
            payments: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                methods: z.ZodOptional<z.ZodRecord<z.ZodEnum<["visa", "mastercard", "verve", "amex", "discover", "paypal", "apple_pay", "google_pay", "bank_transfer"]>, z.ZodBoolean>>;
            }, "strict", z.ZodTypeAny, {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            }, {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            payments?: {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            } | undefined;
            leftText?: string | undefined;
        }, {
            payments?: {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            } | undefined;
            leftText?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        brand?: {
            logoUrl?: string | undefined;
            blurb?: string | undefined;
        } | undefined;
        newsletter?: {
            description?: string | undefined;
            title?: string | undefined;
            enabled?: boolean | undefined;
            placeholder?: string | undefined;
            ctaLabel?: string | undefined;
        } | undefined;
        bottomBar?: {
            payments?: {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            } | undefined;
            leftText?: string | undefined;
        } | undefined;
    }, {
        brand?: {
            logoUrl?: string | undefined;
            blurb?: string | undefined;
        } | undefined;
        newsletter?: {
            description?: string | undefined;
            title?: string | undefined;
            enabled?: boolean | undefined;
            placeholder?: string | undefined;
            ctaLabel?: string | undefined;
        } | undefined;
        bottomBar?: {
            payments?: {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            } | undefined;
            leftText?: string | undefined;
        } | undefined;
    }>>;
    pages: z.ZodOptional<z.ZodObject<{
        home: z.ZodOptional<z.ZodObject<{
            hero: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                image: z.ZodOptional<z.ZodObject<{
                    src: z.ZodOptional<z.ZodString>;
                    alt: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    alt?: string | undefined;
                    src?: string | undefined;
                }, {
                    alt?: string | undefined;
                    src?: string | undefined;
                }>>;
                content: z.ZodOptional<z.ZodObject<{
                    eyebrow: z.ZodOptional<z.ZodString>;
                    heading: z.ZodOptional<z.ZodString>;
                    description: z.ZodOptional<z.ZodString>;
                    cta: z.ZodOptional<z.ZodObject<{
                        label: z.ZodOptional<z.ZodString>;
                        href: z.ZodOptional<z.ZodString>;
                    }, "strip", z.ZodTypeAny, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }>>;
                }, "strip", z.ZodTypeAny, {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                }, {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                }>>;
                bottomStrip: z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodOptional<z.ZodBoolean>;
                    text: z.ZodOptional<z.ZodString>;
                    className: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                }, {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                }>>;
                variant: z.ZodOptional<z.ZodString>;
                layout: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
                overlay: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            }, "strip", z.ZodTypeAny, {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            }, {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            }>>;
            sections: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
            contact: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        }, "strip", z.ZodTypeAny, {
            contact?: Record<string, unknown> | undefined;
            hero?: {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            } | undefined;
            sections?: unknown[] | undefined;
        }, {
            contact?: Record<string, unknown> | undefined;
            hero?: {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            } | undefined;
            sections?: unknown[] | undefined;
        }>>;
        about: z.ZodOptional<z.ZodObject<{
            version: z.ZodOptional<z.ZodNumber>;
            seo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            sections: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
        }, "strip", z.ZodTypeAny, {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        }, {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        }>>;
        contact: z.ZodOptional<z.ZodObject<{
            version: z.ZodOptional<z.ZodNumber>;
            seo: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            sections: z.ZodOptional<z.ZodArray<z.ZodUnknown, "many">>;
        }, "strip", z.ZodTypeAny, {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        }, {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        home?: {
            contact?: Record<string, unknown> | undefined;
            hero?: {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            } | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        about?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        contact?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
    }, {
        home?: {
            contact?: Record<string, unknown> | undefined;
            hero?: {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            } | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        about?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        contact?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
    }>>;
}, "strict", z.ZodTypeAny, {
    theme?: z.objectOutputType<{
        assets: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            logoUrl?: string | undefined;
        }, {
            logoUrl?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    header?: {
        topBar?: {
            enabled?: boolean | undefined;
            autoplay?: {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            } | undefined;
            slides?: {
                text: string;
            }[] | undefined;
        } | undefined;
        nav?: {
            enabled?: boolean | undefined;
            items?: {
                label: string;
                href: string;
            }[] | undefined;
            icons?: {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    pages?: {
        home?: {
            contact?: Record<string, unknown> | undefined;
            hero?: {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            } | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        about?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        contact?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
    } | undefined;
    ui?: {
        headerMenu?: {
            blog?: boolean | undefined;
            about?: boolean | undefined;
            contact?: boolean | undefined;
        } | undefined;
    } | undefined;
    seo?: {
        description?: string | undefined;
        title?: string | undefined;
        favicon?: {
            png?: string | undefined;
            ico?: string | undefined;
            svg?: string | undefined;
            appleTouch?: string | undefined;
        } | undefined;
        ogImage?: {
            url?: string | undefined;
            alt?: string | undefined;
        } | undefined;
    } | undefined;
    footer?: {
        brand?: {
            logoUrl?: string | undefined;
            blurb?: string | undefined;
        } | undefined;
        newsletter?: {
            description?: string | undefined;
            title?: string | undefined;
            enabled?: boolean | undefined;
            placeholder?: string | undefined;
            ctaLabel?: string | undefined;
        } | undefined;
        bottomBar?: {
            payments?: {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            } | undefined;
            leftText?: string | undefined;
        } | undefined;
    } | undefined;
}, {
    theme?: z.objectInputType<{
        assets: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            logoUrl?: string | undefined;
        }, {
            logoUrl?: string | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
    header?: {
        topBar?: {
            enabled?: boolean | undefined;
            autoplay?: {
                enabled?: boolean | undefined;
                intervalMs?: number | undefined;
            } | undefined;
            slides?: {
                text: string;
            }[] | undefined;
        } | undefined;
        nav?: {
            enabled?: boolean | undefined;
            items?: {
                label: string;
                href: string;
            }[] | undefined;
            icons?: {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
                quote?: boolean | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    pages?: {
        home?: {
            contact?: Record<string, unknown> | undefined;
            hero?: {
                image?: {
                    alt?: string | undefined;
                    src?: string | undefined;
                } | undefined;
                variant?: string | undefined;
                content?: {
                    description?: string | undefined;
                    eyebrow?: string | undefined;
                    heading?: string | undefined;
                    cta?: {
                        label?: string | undefined;
                        href?: string | undefined;
                    } | undefined;
                } | undefined;
                enabled?: boolean | undefined;
                bottomStrip?: {
                    enabled?: boolean | undefined;
                    text?: string | undefined;
                    className?: string | undefined;
                } | undefined;
                layout?: Record<string, unknown> | undefined;
                overlay?: Record<string, unknown> | undefined;
            } | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        about?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
        contact?: {
            version?: number | undefined;
            seo?: Record<string, unknown> | undefined;
            sections?: unknown[] | undefined;
        } | undefined;
    } | undefined;
    ui?: {
        headerMenu?: {
            blog?: boolean | undefined;
            about?: boolean | undefined;
            contact?: boolean | undefined;
        } | undefined;
    } | undefined;
    seo?: {
        description?: string | undefined;
        title?: string | undefined;
        favicon?: {
            png?: string | undefined;
            ico?: string | undefined;
            svg?: string | undefined;
            appleTouch?: string | undefined;
        } | undefined;
        ogImage?: {
            url?: string | undefined;
            alt?: string | undefined;
        } | undefined;
    } | undefined;
    footer?: {
        brand?: {
            logoUrl?: string | undefined;
            blurb?: string | undefined;
        } | undefined;
        newsletter?: {
            description?: string | undefined;
            title?: string | undefined;
            enabled?: boolean | undefined;
            placeholder?: string | undefined;
            ctaLabel?: string | undefined;
        } | undefined;
        bottomBar?: {
            payments?: {
                enabled?: boolean | undefined;
                methods?: Partial<Record<"bank_transfer" | "visa" | "mastercard" | "verve" | "amex" | "discover" | "paypal" | "apple_pay" | "google_pay", boolean>> | undefined;
            } | undefined;
            leftText?: string | undefined;
        } | undefined;
    } | undefined;
}>;

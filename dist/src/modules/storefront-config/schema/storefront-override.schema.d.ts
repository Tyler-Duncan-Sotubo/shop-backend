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
        siteName: z.ZodOptional<z.ZodString>;
        canonicalBaseUrl: z.ZodOptional<z.ZodString>;
        ogImage: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            alt: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
            url?: string | undefined;
            alt?: string | undefined;
        }, {
            url?: string | undefined;
            alt?: string | undefined;
        }>>;
    }, "strict", z.ZodTypeAny, {
        description?: string | undefined;
        title?: string | undefined;
        siteName?: string | undefined;
        canonicalBaseUrl?: string | undefined;
        ogImage?: {
            url?: string | undefined;
            alt?: string | undefined;
        } | undefined;
    }, {
        description?: string | undefined;
        title?: string | undefined;
        siteName?: string | undefined;
        canonicalBaseUrl?: string | undefined;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
            }, {
                search?: boolean | undefined;
                cart?: boolean | undefined;
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>;
    footer: z.ZodOptional<z.ZodObject<{
        brand: z.ZodOptional<z.ZodObject<{
            logoUrl: z.ZodOptional<z.ZodString>;
            blurb: z.ZodOptional<z.ZodString>;
        }, "strict", z.ZodTypeAny, {
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
        }, "strict", z.ZodTypeAny, {
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
        }, "strict", z.ZodTypeAny, {
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
    }, "strict", z.ZodTypeAny, {
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
                }, "strict", z.ZodTypeAny, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }>>;
                content: z.ZodOptional<z.ZodObject<{
                    eyebrow: z.ZodOptional<z.ZodString>;
                    heading: z.ZodOptional<z.ZodString>;
                    description: z.ZodOptional<z.ZodString>;
                    cta: z.ZodOptional<z.ZodObject<{
                        label: z.ZodOptional<z.ZodString>;
                        href: z.ZodOptional<z.ZodString>;
                    }, "strict", z.ZodTypeAny, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }>>;
                }, "strict", z.ZodTypeAny, {
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
            }, "strict", z.ZodTypeAny, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }>>;
        }, "strict", z.ZodTypeAny, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }>>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        home: z.ZodOptional<z.ZodObject<{
            hero: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                image: z.ZodOptional<z.ZodObject<{
                    src: z.ZodOptional<z.ZodString>;
                    alt: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }>>;
                content: z.ZodOptional<z.ZodObject<{
                    eyebrow: z.ZodOptional<z.ZodString>;
                    heading: z.ZodOptional<z.ZodString>;
                    description: z.ZodOptional<z.ZodString>;
                    cta: z.ZodOptional<z.ZodObject<{
                        label: z.ZodOptional<z.ZodString>;
                        href: z.ZodOptional<z.ZodString>;
                    }, "strict", z.ZodTypeAny, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }>>;
                }, "strict", z.ZodTypeAny, {
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
            }, "strict", z.ZodTypeAny, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }>>;
        }, "strict", z.ZodTypeAny, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        home: z.ZodOptional<z.ZodObject<{
            hero: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                image: z.ZodOptional<z.ZodObject<{
                    src: z.ZodOptional<z.ZodString>;
                    alt: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }>>;
                content: z.ZodOptional<z.ZodObject<{
                    eyebrow: z.ZodOptional<z.ZodString>;
                    heading: z.ZodOptional<z.ZodString>;
                    description: z.ZodOptional<z.ZodString>;
                    cta: z.ZodOptional<z.ZodObject<{
                        label: z.ZodOptional<z.ZodString>;
                        href: z.ZodOptional<z.ZodString>;
                    }, "strict", z.ZodTypeAny, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }>>;
                }, "strict", z.ZodTypeAny, {
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
            }, "strict", z.ZodTypeAny, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }>>;
        }, "strict", z.ZodTypeAny, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough">>>;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    pages?: z.objectOutputType<{
        home: z.ZodOptional<z.ZodObject<{
            hero: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                image: z.ZodOptional<z.ZodObject<{
                    src: z.ZodOptional<z.ZodString>;
                    alt: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }>>;
                content: z.ZodOptional<z.ZodObject<{
                    eyebrow: z.ZodOptional<z.ZodString>;
                    heading: z.ZodOptional<z.ZodString>;
                    description: z.ZodOptional<z.ZodString>;
                    cta: z.ZodOptional<z.ZodObject<{
                        label: z.ZodOptional<z.ZodString>;
                        href: z.ZodOptional<z.ZodString>;
                    }, "strict", z.ZodTypeAny, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }>>;
                }, "strict", z.ZodTypeAny, {
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
            }, "strict", z.ZodTypeAny, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }>>;
        }, "strict", z.ZodTypeAny, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
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
        siteName?: string | undefined;
        canonicalBaseUrl?: string | undefined;
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
                quote?: boolean | undefined;
                account?: boolean | undefined;
                wishlist?: boolean | undefined;
            } | undefined;
        } | undefined;
    } | undefined;
    pages?: z.objectInputType<{
        home: z.ZodOptional<z.ZodObject<{
            hero: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodOptional<z.ZodBoolean>;
                image: z.ZodOptional<z.ZodObject<{
                    src: z.ZodOptional<z.ZodString>;
                    alt: z.ZodOptional<z.ZodString>;
                }, "strict", z.ZodTypeAny, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }, {
                    src?: string | undefined;
                    alt?: string | undefined;
                }>>;
                content: z.ZodOptional<z.ZodObject<{
                    eyebrow: z.ZodOptional<z.ZodString>;
                    heading: z.ZodOptional<z.ZodString>;
                    description: z.ZodOptional<z.ZodString>;
                    cta: z.ZodOptional<z.ZodObject<{
                        label: z.ZodOptional<z.ZodString>;
                        href: z.ZodOptional<z.ZodString>;
                    }, "strict", z.ZodTypeAny, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }, {
                        label?: string | undefined;
                        href?: string | undefined;
                    }>>;
                }, "strict", z.ZodTypeAny, {
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
            }, "strict", z.ZodTypeAny, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }, {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            }>>;
        }, "strict", z.ZodTypeAny, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }, {
            hero?: {
                image?: {
                    src?: string | undefined;
                    alt?: string | undefined;
                } | undefined;
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
            } | undefined;
        }>>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
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
        siteName?: string | undefined;
        canonicalBaseUrl?: string | undefined;
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

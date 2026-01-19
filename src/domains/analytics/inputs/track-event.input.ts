export interface TrackEventInput {
  sessionId: string;
  event: string;

  context?: {
    host?: string;
    path?: string;
    referrer?: string;
    title?: string;
  };

  links?: {
    cartId?: string;
    checkoutId?: string;
    orderId?: string;
    paymentId?: string;
  };

  meta?: Record<string, unknown>;
}

import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
export declare class ResendProvider {
    private config;
    readonly client: Resend;
    constructor(config: ConfigService);
}

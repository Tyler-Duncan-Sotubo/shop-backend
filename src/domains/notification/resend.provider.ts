import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class ResendProvider {
  public readonly client: Resend;

  constructor(private config: ConfigService) {
    this.client = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }
}

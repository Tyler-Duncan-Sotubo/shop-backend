import { Injectable } from '@nestjs/common';

@Injectable()
export class TermiiProvider {
  readonly baseUrl = 'https://api.ng.termii.com';
  readonly apiKey = process.env.TERMII_API_KEY!;
}

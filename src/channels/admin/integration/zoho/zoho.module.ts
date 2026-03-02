import { Module } from '@nestjs/common';
import { ZohoController } from './zoho.controller';
import { ZohoService } from 'src/domains/integration/zoho/zoho.service';
import { ZohoOAuthService } from 'src/domains/integration/zoho/zoho-oauth.service';

@Module({
  controllers: [ZohoController],
  providers: [ZohoService, ZohoOAuthService],
})
export class ZohoModule {}

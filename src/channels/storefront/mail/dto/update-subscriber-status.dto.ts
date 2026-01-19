import { IsIn } from 'class-validator';

export class UpdateSubscriberStatusDto {
  @IsIn(['subscribed', 'unsubscribed', 'pending'])
  status: 'subscribed' | 'unsubscribed' | 'pending';
}

import { BASE } from './constant';

export const MarketingPermissions = [
  ...BASE,

  // Products — read only for campaign context
  'products.read',
  'categories.read',

  // Customers — view and manage opt-in status
  'customers.read',
  'customers.update',

  // Discounts / Promotions — view and run promo campaigns
  'discounts.read',
  'promotions.manage',

  // Campaigns / Newsletters
  'mail.subscribers.read',
  'mail.subscribers.update',
  'mail.messages.read',
  'mail.messages.update',

  // Content
  'blog.posts.read',
  'blog.posts.create',
  'blog.posts.update',
  'blog.posts.publish',

  // Media — upload images for campaigns and blog
  'media.upload',

  // Analytics — campaign and customer performance
  'analytics.read',

  // Users — read only
  'users.read',
];

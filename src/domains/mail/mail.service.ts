import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DRIZZLE } from 'src/infrastructure/drizzle/drizzle.module';
import { db } from 'src/infrastructure/drizzle/types/drizzle';
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import {
  companies,
  contactMessages,
  subscribers,
  users,
} from 'src/infrastructure/drizzle/schema';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ContactNotificationService } from '../notification/services/contact-notification.service';

@Injectable()
export class MailService {
  constructor(
    @Inject(DRIZZLE) private readonly db: db,
    @InjectQueue('emailQueue') private readonly emailQueue: Queue,
    private readonly contactNotificationService: ContactNotificationService,
  ) {}

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  // --------------------------------------------------------------------------
  // ADMIN: Subscribers
  // --------------------------------------------------------------------------

  async listSubscribers(
    companyId: string,
    query: {
      storeId?: string;
      search?: string;
      status?: 'subscribed' | 'unsubscribed' | 'pending';
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const where = and(
      eq(subscribers.companyId, companyId),
      query.storeId ? eq(subscribers.storeId, query.storeId) : undefined,
      query.status ? eq(subscribers.status, query.status) : undefined,
      query.search ? ilike(subscribers.email, `%${query.search}%`) : undefined,
    );

    const rows = await this.db
      .select({
        id: subscribers.id,
        email: subscribers.email,
        status: subscribers.status,
        source: subscribers.source,
        storeId: subscribers.storeId,
        createdAt: subscribers.createdAt,
        updatedAt: subscribers.updatedAt,
      })
      .from(subscribers)
      .where(where)
      .orderBy(desc(subscribers.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(subscribers)
      .where(where);

    return {
      data: rows,
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    };
  }

  async getSubscriber(companyId: string, id: string) {
    const row = await this.db.query.subscribers.findFirst({
      where: and(eq(subscribers.companyId, companyId), eq(subscribers.id, id)),
    });

    if (!row) throw new NotFoundException('Subscriber not found');
    return row;
  }

  async updateSubscriberStatus(
    companyId: string,
    id: string,
    status: 'subscribed' | 'unsubscribed' | 'pending',
  ) {
    const [updated] = await this.db
      .update(subscribers)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(subscribers.companyId, companyId), eq(subscribers.id, id)))
      .returning();

    if (!updated) throw new NotFoundException('Subscriber not found');
    return updated;
  }

  // --------------------------------------------------------------------------
  // ADMIN: Contact Messages
  // --------------------------------------------------------------------------

  async listContactMessages(
    companyId: string,
    query: {
      storeId?: string;
      search?: string;
      status?: 'new' | 'read' | 'archived' | 'spam';
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const searchClause = query.search
      ? or(
          ilike(contactMessages.email, `%${query.search}%`),
          ilike(contactMessages.name, `%${query.search}%`),
          ilike(contactMessages.phone, `%${query.search}%`),
          ilike(contactMessages.company, `%${query.search}%`),
          ilike(contactMessages.message, `%${query.search}%`),
        )
      : undefined;

    const where = and(
      eq(contactMessages.companyId, companyId),
      query.storeId ? eq(contactMessages.storeId, query.storeId) : undefined,
      query.status ? eq(contactMessages.status, query.status) : undefined,
      searchClause,
    );

    const rows = await this.db
      .select({
        id: contactMessages.id,
        storeId: contactMessages.storeId,
        subject: contactMessages.subject,
        name: contactMessages.name,
        email: contactMessages.email,
        phone: contactMessages.phone,
        company: contactMessages.company,
        message: contactMessages.message,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
        updatedAt: contactMessages.updatedAt,
      })
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(contactMessages)
      .where(where);

    return {
      rows,
      count: Number(count),
      page,
      limit,
      offset,
    };
  }

  async getContactMessage(companyId: string, id: string) {
    const row = await this.db.query.contactMessages.findFirst({
      where: and(
        eq(contactMessages.companyId, companyId),
        eq(contactMessages.id, id),
      ),
    });

    if (!row) throw new NotFoundException('Message not found');
    return row;
  }

  async updateContactMessageStatus(
    companyId: string,
    id: string,
    status: 'new' | 'read' | 'archived' | 'spam',
  ) {
    const [updated] = await this.db
      .update(contactMessages)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(contactMessages.companyId, companyId),
          eq(contactMessages.id, id),
        ),
      )
      .returning();

    if (!updated) throw new NotFoundException('Message not found');
    return updated;
  }

  // --------------------------------------------------------------------------
  // PUBLIC: Create endpoints (keep here if you want one service)
  // --------------------------------------------------------------------------

  async createSubscriber(
    companyId: string,
    dto: { email: string; storeId?: string; source?: string },
    metadata?: any,
  ) {
    const email = this.normalizeEmail(dto.email);

    const [created] = await this.db
      .insert(subscribers)
      .values({
        companyId,
        storeId: dto.storeId ?? null,
        email,
        status: 'subscribed',
        source: dto.source ?? 'form',
        metadata: metadata ?? null,
      })
      .onConflictDoUpdate({
        target: [subscribers.companyId, subscribers.email],
        set: { updatedAt: new Date(), status: 'subscribed' },
      })
      .returning();

    return created;
  }

  async createContactMessage(
    companyId: string,
    dto: {
      storeId?: string;
      name?: string;
      email: string;
      phone?: string;
      company?: string;
      message: string;
      subject?: string;
    },
    metadata?: any,
  ) {
    const normalizedEmail = this.normalizeEmail(dto.email);

    const [created] = await this.db
      .insert(contactMessages)
      .values({
        companyId,
        subject: dto.subject ?? null,
        storeId: dto.storeId ?? null,
        name: dto.name ?? null,
        email: normalizedEmail,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
        message: dto.message,
        status: 'new',
        metadata: metadata ?? null,
      })
      .returning();

    const [company] = await this.db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const companyUsers = await this.db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.companyId, companyId));

    const to = companyUsers
      .map((u) => u.email)
      .filter((e): e is string => Boolean(e?.trim()));

    await this.emailQueue.add(
      'sendContactNotification',
      {
        to: to.length ? to : ['support@store.com'],
        storeName: company?.name ?? 'My Store',
        customerName: dto.name ?? null,
        customerEmail: normalizedEmail,
        subject: dto.subject ?? '(no subject)',
        message: dto.message,
        phone: dto.phone ?? null,
        company: dto.company ?? null,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    );

    return created;
  }
}

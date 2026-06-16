1. CreditService
   - getBalance(companyId)
   - topUp(companyId, amount, note) ← admin only
   - debit(companyId, amount, referenceType, referenceId, channel)
   - refund(companyId, amount, referenceId)
   - getTransactions(companyId) ← for admin/billing page

2. EmailSenderConfigService
   - getConfig(companyId)
   - upsertConfig(companyId, dto) ← Settings → Email page

3. CampaignService
   - create(companyId, storeId, dto) ← saves draft
   - update(companyId, id, dto) ← edit draft
   - list(companyId, storeId)
   - getById(companyId, id)
   - delete(companyId, id) ← draft only

4. CampaignAudienceService
   - resolve(companyId, storeId, audienceType)  
     → pulls emails from customers + subscribers
     → deduplicates
     → returns { emails: string[], count: number }

5. CampaignSendService
   - sendNow(companyId, campaignId)
     → getConfig (fromEmail, fromName, branding)
     → resolveAudience → count
     → checkBalance → debit credits atomically
     → renderTemplate(templateType, contentJson, config)
     → resend.emails.send() batch
     → update campaign status + sentAt + sentCount
     → write sent events to campaign_events

   - sendTest(companyId, campaignId, toEmail)
     → no credit debit
     → renders same template
     → sends single email via Resend

   - scheduleAt(companyId, campaignId, scheduledAt)
     → sets status = 'scheduled', scheduledAt
     → cron job picks it up and calls sendNow

6. CampaignWebhookService
   - handleResendWebhook(payload)
     → matches resendMessageId → campaign_events
     → increments openCount / clickCount / unsubscribeCount on campaign
     → on unsubscribe → marks recipient in subscribers table

7. CampaignStatsService ← could just be part of CampaignService
   - getStats(companyId, campaignId)
     → sentCount, openRate, clickRate, unsubscribeCount

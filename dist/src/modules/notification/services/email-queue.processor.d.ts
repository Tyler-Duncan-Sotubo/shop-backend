import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmployeeInvitationService } from './employee-invitation.service';
import { ContactNotificationService } from './contact-notification.service';
export declare class EmailQueueProcessor extends WorkerHost {
    private readonly employeeInvitationService;
    private readonly contactNotificationService;
    constructor(employeeInvitationService: EmployeeInvitationService, contactNotificationService: ContactNotificationService);
    process(job: Job): Promise<void>;
    private handleEmployeeInvitationEmail;
}

import { BaseController } from 'src/infrastructure/interceptor/base.controller';
import { PresignPaymentEvidenceDto } from '../dto/presign.dto';
import { PaymentService } from 'src/domains/billing/payment/services/payment.service';
export declare class PaymentController extends BaseController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentService);
    presignEvidence(companyId: string, paymentId: string, dto: PresignPaymentEvidenceDto): Promise<{
        upload: {
            key: string;
            fileName: string;
            mimeType: string;
            uploadUrl: string;
            url: string;
        };
    }>;
    finalizeEvidence(companyId: string, paymentId: string, dto: {
        key: string;
        url?: string;
        fileName?: string;
        mimeType?: string;
        note?: string;
    }): Promise<{
        data: {
            id: string;
            createdAt: Date;
            companyId: string;
            fileName: string;
            mimeType: string;
            url: string;
            note: string | null;
            kind: string;
            paymentId: string;
            sizeBytes: number | null;
            uploadedByUserId: string | null;
        };
    }>;
}

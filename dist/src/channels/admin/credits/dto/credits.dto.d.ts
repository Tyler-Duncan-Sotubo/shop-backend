export declare class TopUpDto {
    amount: number;
    channel: 'email' | 'sms';
    note?: string;
}
export declare class AdjustDto {
    amount: number;
    channel: 'email' | 'sms';
    note: string;
}
export declare class GetTransactionsDto {
    channel?: 'email' | 'sms';
    limit?: number;
    offset?: number;
}

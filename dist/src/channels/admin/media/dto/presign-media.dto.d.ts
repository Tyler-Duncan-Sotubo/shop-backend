export declare class PresignFileDto {
    fileName: string;
    mimeType: string;
}
export declare class PresignMediaUploadsDto {
    files: PresignFileDto[];
    storeId?: string;
    folder?: string;
    expiresInSeconds?: number;
    publicRead?: boolean;
}

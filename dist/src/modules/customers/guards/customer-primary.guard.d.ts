import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { db } from 'src/drizzle/types/drizzle';
export declare class CustomerPrimaryGuard implements CanActivate {
    private readonly jwtService;
    private readonly configService;
    private readonly db;
    constructor(jwtService: JwtService, configService: ConfigService, db: db);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractTokenFromHeader;
    private validate;
}

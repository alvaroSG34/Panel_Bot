import { SetMetadata } from '@nestjs/common';

export const AUDIT_TABLE_KEY = 'auditTable';
export const AuditTable = (tableName: string) => SetMetadata(AUDIT_TABLE_KEY, tableName);

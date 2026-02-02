import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum CsvType {
  STUDENTS = 'students',
  GROUPS = 'groups',
  GROUP_MAPPINGS = 'group_mappings',
}

export class UploadCsvDto {
  @IsEnum(CsvType)
  type: CsvType;

  @IsOptional()
  @IsString()
  dryRun?: string | boolean; // FormData envía strings

  @IsOptional()
  @IsString()
  tolerantMode?: string | boolean; // FormData envía strings
}

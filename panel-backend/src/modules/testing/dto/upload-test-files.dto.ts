import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ProcessMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  BATCH = 'batch',
}

export class UploadTestFilesDto {
  @IsOptional()
  @IsEnum(ProcessMode)
  mode?: ProcessMode = ProcessMode.PARALLEL;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  skipDatabase?: boolean = true; // Por defecto no guardar en DB durante pruebas

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  detailedMetrics?: boolean = true;
}

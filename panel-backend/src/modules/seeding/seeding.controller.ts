import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SeedingService } from './seeding.service';
import { UploadCsvDto } from './dto/upload-csv.dto';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('seeding')
export class SeedingController {
  constructor(private readonly seedingService: SeedingService) {}

  /**
   * Upload CSV para importación masiva
   * Solo admins pueden ejecutar seeding
   * 
   * POST /api/seeding/upload
   * Body (multipart/form-data):
   *   - file: archivo CSV
   *   - type: 'students' | 'groups' | 'group_mappings'
   *   - dryRun: true/false (solo validar)
   *   - tolerantMode: true/false (continuar con errores)
   */
  @Post('upload')
  @Roles('admin')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCSV(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB max
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadCsvDto,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    // Convertir string a boolean si viene como string desde form-data
    const dryRun = dto.dryRun === true || dto.dryRun === 'true' as any;
    const tolerantMode = dto.tolerantMode === true || dto.tolerantMode === 'true' as any;

    const result = await this.seedingService.processCSV(
      file.buffer,
      dto.type,
      dryRun,
      tolerantMode,
    );

    return {
      message: dryRun
        ? 'Validation completed (dry run - no data inserted)'
        : 'Seeding completed',
      ...result,
    };
  }
}

import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { TestingService, StressTestReport } from './testing.service';
import { UploadTestFilesDto, ProcessMode } from './dto';
import { Public } from '../../common/decorators';

@Controller('testing')
export class TestingController {
  constructor(private testingService: TestingService) {}

  /**
   * POST /api/testing/prueba
   * Endpoint para pruebas de estrés con múltiples archivos
   * 
   * @example
   * curl -X POST http://localhost:3000/api/testing/prueba \
   *   -F "files=@boleta1.jpg" \
   *   -F "files=@boleta2.jpg" \
   *   -F "files=@boleta3.pdf" \
   *   -F "mode=parallel" \
   *   -F "skipDatabase=true" \
   *   -F "detailedMetrics=true"
   */
  @Public() // Sin autenticación para facilitar pruebas
  @Post('prueba')
  @UseInterceptors(FilesInterceptor('files', 100)) // Máximo 100 archivos
  async stressTest(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadTestDto: UploadTestFilesDto,
  ): Promise<StressTestReport> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    // Validar que sean imágenes o PDFs
    const validMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
    ];

    const invalidFiles = files.filter(
      (file) => !validMimeTypes.includes(file.mimetype),
    );

    if (invalidFiles.length > 0) {
      throw new BadRequestException(
        `Invalid file types: ${invalidFiles.map((f) => f.originalname).join(', ')}. ` +
          `Only images (JPEG, PNG, WebP) and PDFs are allowed.`,
      );
    }

    const mode = uploadTestDto.mode || ProcessMode.PARALLEL;
    const skipDatabase = uploadTestDto.skipDatabase ?? true;
    const detailedMetrics = uploadTestDto.detailedMetrics ?? true;

    return this.testingService.processStressTest(
      files,
      mode,
      skipDatabase,
      detailedMetrics,
    );
  }

  /**
   * GET /api/testing/system-stats
   * Obtener estadísticas del sistema
   */
  @Public()
  @Get('system-stats')
  async getSystemStats() {
    return this.testingService.getSystemStats();
  }

  /**
   * GET /api/testing/health
   * Health check simple
   */
  @Public()
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Testing Module',
    };
  }
}

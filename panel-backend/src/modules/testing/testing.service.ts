import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ProcessMode } from './dto';
import * as crypto from 'crypto';
import { performOCR } from './utils/ocr.util';
import {
  parseEnrollmentDocument,
  calculateDocumentHash,
} from './utils/parser.util';

interface SubjectComparison {
  newSubjects: Array<{ sigla: string; grupo: string }>;
  duplicateSubjects: Array<{ sigla: string; grupo: string }>;
}

interface MappedSubject {
  sigla: string;
  grupo: string;
  materia?: string;
  grupoMateriaId?: number;
  jid_grupo?: string;
  canAdd: boolean;
  reason?: string;
}

export interface ProcessingResult {
  fileName: string;
  fileSize: number;
  mimeType: string;
  success: boolean;
  duration: number; // en ms
  ocrDuration?: number;
  parseDuration?: number;
  dbDuration?: number;
  validationDuration?: number;
  extractedData?: {
    registrationNumber: string;
    studentName: string;
    totalSubjects: number;
    newSubjects: number;
    duplicateSubjects: number;
    unmappedSubjects: number;
    currentEnrollmentCount: number;
    wouldExceedLimit: boolean;
    validSubjects: number;
    isDuplicateDocument?: boolean;
    hasPendingDocument?: boolean;
    registrationMismatch?: boolean;
  };
  validationErrors: string[]; // Obligatorio, siempre inicializado como []
  error?: string;
}

export interface StressTestReport {
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalDuration: number; // en ms
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  throughput: number; // archivos por segundo
  mode: string;
  results: ProcessingResult[];
  systemMetrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuTime: number;
  };
}

@Injectable()
export class TestingService {
  private readonly logger = new Logger(TestingService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Procesa múltiples archivos para pruebas de estrés
   */
  async processStressTest(
    files: Express.Multer.File[],
    mode: ProcessMode,
    skipDatabase: boolean,
    detailedMetrics: boolean,
  ): Promise<StressTestReport> {
    this.logger.log(
      `Starting stress test: ${files.length} files, mode: ${mode}, skipDB: ${skipDatabase}`,
    );

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const startCpuTime = process.cpuUsage();

    let results: ProcessingResult[] = [];

    // Procesar según el modo seleccionado
    switch (mode) {
      case ProcessMode.PARALLEL:
        results = await this.processParallel(files, skipDatabase, detailedMetrics);
        break;
      case ProcessMode.SEQUENTIAL:
        results = await this.processSequential(files, skipDatabase, detailedMetrics);
        break;
      case ProcessMode.BATCH:
        results = await this.processBatch(files, skipDatabase, detailedMetrics, 10);
        break;
    }

    const totalDuration = Date.now() - startTime;
    const endMemory = process.memoryUsage();
    const endCpuTime = process.cpuUsage(startCpuTime);

    // Calcular estadísticas
    const successfulFiles = results.filter((r) => r.success).length;
    const durations = results.map((r) => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const throughput = (files.length / totalDuration) * 1000; // archivos/segundo

    const report: StressTestReport = {
      totalFiles: files.length,
      processedFiles: results.length,
      successfulFiles,
      failedFiles: results.length - successfulFiles,
      totalDuration,
      averageDuration: Math.round(avgDuration),
      minDuration,
      maxDuration,
      throughput: parseFloat(throughput.toFixed(2)),
      mode,
      results: detailedMetrics ? results : [],
      systemMetrics: {
        memoryUsage: {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        },
        cpuTime: endCpuTime.user + endCpuTime.system,
      },
    };

    this.logger.log(
      `Stress test completed: ${successfulFiles}/${files.length} successful, ` +
        `${throughput.toFixed(2)} files/sec, ${totalDuration}ms total`,
    );

    return report;
  }

  /**
   * Procesar archivos en paralelo (máximo rendimiento)
   */
  private async processParallel(
    files: Express.Multer.File[],
    skipDatabase: boolean,
    detailedMetrics: boolean,
  ): Promise<ProcessingResult[]> {
    this.logger.debug(`Processing ${files.length} files in parallel`);

    const promises = files.map((file) =>
      this.processFile(file, skipDatabase, detailedMetrics),
    );

    return Promise.all(promises);
  }

  /**
   * Procesar archivos secuencialmente (uno tras otro)
   */
  private async processSequential(
    files: Express.Multer.File[],
    skipDatabase: boolean,
    detailedMetrics: boolean,
  ): Promise<ProcessingResult[]> {
    this.logger.debug(`Processing ${files.length} files sequentially`);

    const results: ProcessingResult[] = [];

    for (const file of files) {
      const result = await this.processFile(file, skipDatabase, detailedMetrics);
      results.push(result);
    }

    return results;
  }

  /**
   * Procesar archivos en lotes (batch processing)
   */
  private async processBatch(
    files: Express.Multer.File[],
    skipDatabase: boolean,
    detailedMetrics: boolean,
    batchSize: number,
  ): Promise<ProcessingResult[]> {
    this.logger.debug(
      `Processing ${files.length} files in batches of ${batchSize}`,
    );

    const results: ProcessingResult[] = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((file) => this.processFile(file, skipDatabase, detailedMetrics)),
      );
      results.push(...batchResults);

      this.logger.debug(
        `Batch ${Math.floor(i / batchSize) + 1} completed: ${batchResults.length} files`,
      );
    }

    return results;
  }

  /**
   * Procesar un archivo individual con TODAS las validaciones del bot real
   */
  private async processFile(
    file: Express.Multer.File,
    skipDatabase: boolean,
    detailedMetrics: boolean,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      success: false,
      duration: 0,
      validationErrors: [],
    };

    let ocrDuration = 0;
    let parseDuration = 0;
    let validationDuration = 0;
    let dbDuration = 0;

    try {
      // 1. Detección de documento duplicado (por hash)
      const docHash = calculateDocumentHash(file.buffer);
      const duplicateDoc = await this.findDocumentByHash(docHash);
      
      if (duplicateDoc && !skipDatabase) {
        result.validationErrors.push(`Documento duplicado detectado (subido: ${new Date(duplicateDoc.fecha_subida).toLocaleDateString()})`);
        result.extractedData = {
          registrationNumber: '',
          studentName: '',
          totalSubjects: 0,
          newSubjects: 0,
          duplicateSubjects: 0,
          unmappedSubjects: 0,
          currentEnrollmentCount: 0,
          wouldExceedLimit: false,
          validSubjects: 0,
          isDuplicateDocument: true,
        };
        throw new Error('Duplicate document detected');
      }

      // 2. OCR
      const ocrStart = Date.now();
      const ocrText = await performOCR(
        file.buffer,
        file.mimetype,
        this.configService,
      );
      ocrDuration = Date.now() - ocrStart;

      // 3. Parsing
      const parseStart = Date.now();
      const parsed = parseEnrollmentDocument(ocrText);
      parseDuration = Date.now() - parseStart;

      if (!parsed.isValid) {
        result.validationErrors.push('Documento inválido: no se pudo extraer datos básicos');
        throw new Error('Invalid document format');
      }

      // 4. VALIDACIONES (simula flujo del bot)
      const validationStart = Date.now();
      const whatsappId = `test_${parsed.registrationNumber}@c.us`;

      // 4a. Validar consistencia de número de registro
      const registrationCheck = await this.validateRegistrationConsistency(
        whatsappId,
        parsed.registrationNumber,
      );

      if (!registrationCheck.isValid && registrationCheck.existingRegistration) {
        result.validationErrors.push(
          `Número de registro no coincide: esperado ${registrationCheck.existingRegistration}, recibido ${parsed.registrationNumber}`,
        );
        result.extractedData = {
          registrationNumber: parsed.registrationNumber,
          studentName: parsed.studentName,
          totalSubjects: parsed.subjects.length,
          newSubjects: 0,
          duplicateSubjects: 0,
          unmappedSubjects: 0,
          currentEnrollmentCount: 0,
          wouldExceedLimit: false,
          validSubjects: 0,
          registrationMismatch: true,
        };
        throw new Error('Registration number mismatch');
      }

      // 4b. Verificar documentos pendientes
      const pendingDoc = await this.checkPendingDocuments(whatsappId);
      if (pendingDoc && !skipDatabase) {
        result.validationErrors.push(
          `Ya existe un documento pendiente (estado: ${pendingDoc.estado})`,
        );
        result.extractedData = {
          registrationNumber: parsed.registrationNumber,
          studentName: parsed.studentName,
          totalSubjects: parsed.subjects.length,
          newSubjects: 0,
          duplicateSubjects: 0,
          unmappedSubjects: 0,
          currentEnrollmentCount: 0,
          wouldExceedLimit: false,
          validSubjects: 0,
          hasPendingDocument: true,
        };
        throw new Error('Pending document exists');
      }

      // 4c. Obtener materias ya agregadas
      const addedSubjects = await this.getStudentAddedSubjects(whatsappId);
      const currentCount = addedSubjects.length;

      // 4d. Comparar materias para detectar duplicados
      const comparison = this.compareSubjects(parsed.subjects, addedSubjects);
      const newSubjectsCount = comparison.newSubjects.length;

      // 4e. Validar límite de 8 materias
      const totalAfterAdd = currentCount + newSubjectsCount;
      if (totalAfterAdd > 8) {
        const remainingSlots = 8 - currentCount;
        result.validationErrors.push(
          `Límite excedido: ${currentCount} actuales + ${newSubjectsCount} nuevas = ${totalAfterAdd} > 8 (slots disponibles: ${remainingSlots})`,
        );
        result.extractedData = {
          registrationNumber: parsed.registrationNumber,
          studentName: parsed.studentName,
          totalSubjects: parsed.subjects.length,
          newSubjects: newSubjectsCount,
          duplicateSubjects: comparison.duplicateSubjects.length,
          unmappedSubjects: 0,
          currentEnrollmentCount: currentCount,
          wouldExceedLimit: true,
          validSubjects: 0,
        };
        throw new Error('Subject limit exceeded');
      }

      // 4f. Mapear materias a grupos de WhatsApp
      const mappedSubjects = await this.mapSubjectsToGroups(
        comparison.newSubjects,
      );
      const unmappedCount = mappedSubjects.filter((s) => !s.canAdd).length;
      const validSubjectsCount = mappedSubjects.filter((s) => s.canAdd).length;

      // 4g. Verificar si todas las materias ya están agregadas
      if (
        comparison.newSubjects.length === 0 &&
        comparison.duplicateSubjects.length > 0
      ) {
        result.validationErrors.push(
          'Todas las materias de la boleta ya están inscritas',
        );
      }

      if (unmappedCount > 0) {
        result.validationErrors.push(
          `${unmappedCount} materia(s) no tienen grupo de WhatsApp configurado`,
        );
      }

      validationDuration = Date.now() - validationStart;

      // 5. Database operations (opcional)
      if (!skipDatabase) {
        const dbStart = Date.now();
        await this.saveToDatabase(parsed, file, mappedSubjects);
        dbDuration = Date.now() - dbStart;
      }

      // Resultado exitoso
      result.success = true;
      result.extractedData = {
        registrationNumber: parsed.registrationNumber,
        studentName: parsed.studentName,
        totalSubjects: parsed.subjects.length,
        newSubjects: newSubjectsCount,
        duplicateSubjects: comparison.duplicateSubjects.length,
        unmappedSubjects: unmappedCount,
        currentEnrollmentCount: currentCount,
        wouldExceedLimit: false,
        validSubjects: validSubjectsCount,
      };

      if (detailedMetrics) {
        result.ocrDuration = ocrDuration;
        result.parseDuration = parseDuration;
        result.validationDuration = validationDuration;
        result.dbDuration = dbDuration;
      }
    } catch (error) {
      result.success = false;
      result.error = error.message;
      this.logger.error(`Error processing file ${file.originalname}`, {
        error: error.message,
        validationErrors: result.validationErrors,
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Guardar datos en base de datos (para pruebas con DB)
   */
  private async saveToDatabase(
    parsed: any,
    file: Express.Multer.File,
    mappedSubjects: MappedSubject[],
  ): Promise<void> {
    // Calcular hash del documento
    const hash = calculateDocumentHash(file.buffer);

    // Buscar o crear estudiante
    const student = await this.prisma.estudiantes.upsert({
      where: { id_whatsapp: `test_${parsed.registrationNumber}@c.us` },
      update: {
        nombre_estudiante: parsed.studentName,
        numero_registro: parsed.registrationNumber,
      },
      create: {
        numero_registro: parsed.registrationNumber,
        nombre_estudiante: parsed.studentName,
        id_whatsapp: `test_${parsed.registrationNumber}@c.us`,
      },
    });

    // Obtener semestre activo
    const semester = await this.prisma.semestres.findFirst({
      where: { activo: true },
    });

    if (!semester) {
      throw new Error('No active semester found');
    }

    // Insertar boleta (o actualizar si ya existe con ese hash)
    const boleta = await this.prisma.boletas_inscripciones.upsert({
      where: {
        documento_hash: hash,
      },
      update: {
        id_estudiante: student.id,
        id_semestre: semester.id,
        datos_parseados: parsed as any,
        estado: 'completado',
        procesado_en: new Date(),
      },
      create: {
        id_estudiante: student.id,
        id_semestre: semester.id,
        documento_hash: hash,
        texto_raw: 'Test document',
        datos_parseados: parsed as any,
        estado: 'completado',
      },
    });

    // Insertar boleta_grupo entries para materias mapeadas
    // Primero eliminar entradas existentes para esta boleta (si es update)
    await this.prisma.boleta_grupo.deleteMany({
      where: { id_boleta: boleta.id },
    });

    for (const subject of mappedSubjects) {
      if (subject.grupoMateriaId && subject.canAdd) {
        await this.prisma.boleta_grupo.create({
          data: {
            id_boleta: boleta.id,
            id_grupo_materia: subject.grupoMateriaId,
            estado_agregado: 'pendiente',
          },
        });
      }
    }

    // Actualizar contador de materias del estudiante
    const validSubjectsCount = mappedSubjects.filter((s) => s.canAdd).length;
    if (validSubjectsCount > 0) {
      await this.prisma.estudiantes.update({
        where: { id: student.id },
        data: {
          total_materias_registradas: {
            increment: validSubjectsCount,
          },
        },
      });
    }
  }

  /**
   * Validar consistencia del número de registro del estudiante
   */
  private async validateRegistrationConsistency(
    whatsappId: string,
    newRegistrationNumber: string,
  ): Promise<{ isValid: boolean; existingRegistration: string | null }> {
    const existing = await this.prisma.estudiantes.findUnique({
      where: { id_whatsapp: whatsappId },
      select: { numero_registro: true },
    });

    if (!existing) {
      return { isValid: true, existingRegistration: null };
    }

    const isValid = existing.numero_registro === newRegistrationNumber;
    return {
      isValid,
      existingRegistration: existing.numero_registro,
    };
  }

  /**
   * Verificar si existe un documento pendiente para el estudiante
   */
  private async checkPendingDocuments(whatsappId: string) {
    const student = await this.prisma.estudiantes.findUnique({
      where: { id_whatsapp: whatsappId },
      select: { id: true },
    });

    if (!student) return null;

    return this.prisma.boletas_inscripciones.findFirst({
      where: {
        id_estudiante: student.id,
        estado: { in: ['pendiente', 'confirmado', 'procesando'] },
      },
      orderBy: { fecha_subida: 'desc' },
    });
  }

  /**
   * Buscar documento por hash
   */
  private async findDocumentByHash(hash: string) {
    return this.prisma.boletas_inscripciones.findUnique({
      where: { documento_hash: hash },
    });
  }

  /**
   * Obtener materias ya agregadas de un estudiante
   */
  private async getStudentAddedSubjects(
    whatsappId: string,
  ): Promise<Array<{ sigla: string; grupo: string }>> {
    const result = await this.prisma.$queryRaw<
      Array<{ sigla: string; grupo: string }>
    >`
      SELECT DISTINCT 
        m.codigo_materia as sigla,
        g.codigo_grupo as grupo
      FROM boleta_grupo bg
      JOIN boletas_inscripciones bi ON bg.id_boleta = bi.id
      JOIN estudiantes e ON bi.id_estudiante = e.id
      JOIN grupo_materia gm ON bg.id_grupo_materia = gm.id
      JOIN materias m ON gm.id_materia = m.id
      JOIN grupos g ON gm.id_grupo = g.id
      WHERE e.id_whatsapp = ${whatsappId}
        AND bg.estado_agregado = 'agregado'
      ORDER BY m.codigo_materia, g.codigo_grupo
    `;

    return result || [];
  }

  /**
   * Comparar materias nuevas con ya agregadas
   */
  private compareSubjects(
    newSubjects: Array<{ sigla: string; grupo: string }>,
    addedSubjects: Array<{ sigla: string; grupo: string }>,
  ): SubjectComparison {
    const addedSet = new Set(
      addedSubjects.map((s) => `${s.sigla}-${s.grupo}`),
    );

    const newOnes = [];
    const duplicates = [];

    for (const subject of newSubjects) {
      const key = `${subject.sigla}-${subject.grupo}`;
      if (addedSet.has(key)) {
        duplicates.push(subject);
      } else {
        newOnes.push(subject);
      }
    }

    return {
      newSubjects: newOnes,
      duplicateSubjects: duplicates,
    };
  }

  /**
   * Mapear materias a grupos de WhatsApp
   */
  private async mapSubjectsToGroups(
    subjects: Array<{ sigla: string; grupo: string; materia?: string }>,
  ): Promise<MappedSubject[]> {
    const mapped: MappedSubject[] = [];

    // Obtener semestre activo
    const semester = await this.prisma.semestres.findFirst({
      where: { activo: true },
    });

    if (!semester) {
      // Si no hay semestre, marcar todas como no mapeadas
      return subjects.map((s) => ({
        ...s,
        canAdd: false,
        reason: 'No active semester',
      }));
    }

    for (const subject of subjects) {
      // Buscar materia
      const materia = await this.prisma.materias.findUnique({
        where: { codigo_materia: subject.sigla },
      });

      if (!materia) {
        mapped.push({
          ...subject,
          canAdd: false,
          reason: 'Subject not found in database',
        });
        continue;
      }

      // Buscar grupo
      const grupo = await this.prisma.grupos.findUnique({
        where: { codigo_grupo: subject.grupo },
      });

      if (!grupo) {
        mapped.push({
          ...subject,
          canAdd: false,
          reason: 'Group not found in database',
        });
        continue;
      }

      // Buscar grupo_materia (mapping)
      const grupoMateria = await this.prisma.grupo_materia.findFirst({
        where: {
          id_semestre: semester.id,
          id_materia: materia.id,
          id_grupo: grupo.id,
          activo: true,
        },
      });

      if (!grupoMateria || !grupoMateria.jid_grupo_whatsapp) {
        mapped.push({
          ...subject,
          canAdd: false,
          reason: 'WhatsApp group not configured',
        });
        continue;
      }

      // Mapeado exitosamente
      mapped.push({
        ...subject,
        materia: materia.nombre,
        grupoMateriaId: grupoMateria.id,
        jid_grupo: grupoMateria.jid_grupo_whatsapp,
        canAdd: true,
      });
    }

    return mapped;
  }

  /**
   * Obtener estadísticas del sistema
   */
  async getSystemStats() {
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    return {
      memory: {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
      },
      uptime: `${Math.floor(uptime / 60)} minutes`,
      platform: process.platform,
      nodeVersion: process.version,
    };
  }
}

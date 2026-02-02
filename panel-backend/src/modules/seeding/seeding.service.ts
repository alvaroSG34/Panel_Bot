import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CsvType } from './dto/upload-csv.dto';
import {
  ValidationResult,
  ValidationError,
  SeedingResult,
} from './dto/validation-result.dto';
import * as csv from 'csv-parse/sync';

@Injectable()
export class SeedingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Procesa archivo CSV según el tipo
   */
  async processCSV(
    fileBuffer: Buffer,
    type: CsvType,
    dryRun: boolean = false,
    tolerantMode: boolean = false,
  ): Promise<SeedingResult> {
    // Parsear CSV
    const records = this.parseCSV(fileBuffer);

    // Validar según tipo
    let validation: ValidationResult;
    let result: SeedingResult;

    switch (type) {
      case CsvType.STUDENTS:
        validation = this.validateStudents(records);
        if (dryRun) {
          return { ...validation, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0 };
        }
        result = await this.seedStudents(records, validation, tolerantMode);
        break;

      case CsvType.GROUPS:
        validation = this.validateGroups(records);
        if (dryRun) {
          return { ...validation, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0 };
        }
        result = await this.seedGroups(records, validation, tolerantMode);
        break;

      case CsvType.GROUP_MAPPINGS:
        validation = this.validateGroupMappings(records);
        if (dryRun) {
          return { ...validation, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0 };
        }
        result = await this.seedGroupMappings(records, validation, tolerantMode);
        break;

      default:
        throw new BadRequestException(`Unsupported CSV type: ${type}`);
    }

    return result;
  }

  /**
   * Parsea CSV a array de objetos
   */
  private parseCSV(fileBuffer: Buffer): any[] {
    try {
      const records = csv.parse(fileBuffer, {
        columns: true, // Primera fila como headers
        skip_empty_lines: true,
        trim: true,
        bom: true, // Manejar UTF-8 BOM
      });

      if (!records || records.length === 0) {
        throw new BadRequestException('CSV file is empty');
      }

      return records;
    } catch (error) {
      throw new BadRequestException(`CSV parsing error: ${error.message}`);
    }
  }

  /**
   * Valida registros de estudiantes
   * Formato esperado: numero_registro,nombre_estudiante,id_whatsapp
   */
  private validateStudents(records: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    let validCount = 0;

    records.forEach((record, index) => {
      const row = index + 2; // +2 porque index es 0-based y hay header

      // Validar numero_registro (8-9 dígitos)
      if (!record.numero_registro || !/^\d{8,9}$/.test(record.numero_registro)) {
        errors.push({
          row,
          field: 'numero_registro',
          value: record.numero_registro,
          message: 'Registration number must be 8-9 digits',
        });
      }

      // Validar nombre_estudiante
      if (!record.nombre_estudiante || record.nombre_estudiante.trim().length < 3) {
        errors.push({
          row,
          field: 'nombre_estudiante',
          value: record.nombre_estudiante,
          message: 'Full name is required (min 3 characters)',
        });
      }

      // Validar WhatsApp ID (opcional, pero si existe debe ser válido)
      if (record.id_whatsapp && !/^\d{10,15}@c\.us$/.test(record.id_whatsapp)) {
        errors.push({
          row,
          field: 'id_whatsapp',
          value: record.id_whatsapp,
          message: 'Invalid WhatsApp ID format (should be phone@c.us)',
        });
      }

      if (errors.filter((e) => e.row === row).length === 0) {
        validCount++;
      }
    });

    return {
      valid: errors.length === 0,
      totalRows: records.length,
      validRows: validCount,
      invalidRows: records.length - validCount,
      errors,
    };
  }

  /**
   * Valida registros de grupos
   * Formato esperado: codigo_grupo
   */
  private validateGroups(records: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    let validCount = 0;

    records.forEach((record, index) => {
      const row = index + 2;

      // Validar código grupo (2-5 caracteres alfanuméricos)
      if (!record.codigo_grupo || !/^[A-Z0-9]{2,5}$/i.test(record.codigo_grupo)) {
        errors.push({
          row,
          field: 'codigo_grupo',
          value: record.codigo_grupo,
          message: 'Group code must be 2-5 alphanumeric characters',
        });
      }

      if (errors.filter((e) => e.row === row).length === 0) {
        validCount++;
      }
    });

    return {
      valid: errors.length === 0,
      totalRows: records.length,
      validRows: validCount,
      invalidRows: records.length - validCount,
      errors,
    };
  }

  /**
   * Valida registros de grupo_materia
   * Formato esperado: codigo_materia,codigo_grupo,jid_grupo_whatsapp,codigo_semestre
   */
  private validateGroupMappings(records: any[]): ValidationResult {
    const errors: ValidationError[] = [];
    let validCount = 0;

    records.forEach((record, index) => {
      const row = index + 2;

      // Validar codigo_materia (3-6 caracteres alfanuméricos)
      if (!record.codigo_materia || !/^[A-Z]{3}\d{3}$/i.test(record.codigo_materia)) {
        errors.push({
          row,
          field: 'codigo_materia',
          value: record.codigo_materia,
          message: 'Subject code must be format XXX999 (e.g., INF412)',
        });
      }

      // Validar codigo_grupo
      if (!record.codigo_grupo || !/^[A-Z0-9]{2,5}$/i.test(record.codigo_grupo)) {
        errors.push({
          row,
          field: 'codigo_grupo',
          value: record.codigo_grupo,
          message: 'Group code must be 2-5 alphanumeric characters',
        });
      }

      // Validar jid_grupo_whatsapp
      if (!record.jid_grupo_whatsapp || !/^\d{17,19}@g\.us$/.test(record.jid_grupo_whatsapp)) {
        errors.push({
          row,
          field: 'jid_grupo_whatsapp',
          value: record.jid_grupo_whatsapp,
          message: 'Invalid WhatsApp group JID (should be 17-19 digits@g.us)',
        });
      }

      // Validar codigo_semestre (formato YYYY-N)
      if (!record.codigo_semestre || !/^\d{4}-[12]$/.test(record.codigo_semestre)) {
        errors.push({
          row,
          field: 'codigo_semestre',
          value: record.codigo_semestre,
          message: 'Semester code must be format YYYY-N (e.g., 2026-1)',
        });
      }

      if (errors.filter((e) => e.row === row).length === 0) {
        validCount++;
      }
    });

    return {
      valid: errors.length === 0,
      totalRows: records.length,
      validRows: validCount,
      invalidRows: records.length - validCount,
      errors,
    };
  }

  /**
   * Inserta estudiantes con transacción
   */
  private async seedStudents(
    records: any[],
    validation: ValidationResult,
    tolerantMode: boolean,
  ): Promise<SeedingResult> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const invalidRows = new Set(validation.errors.map((e) => e.row - 2)); // Convertir a 0-based

    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
          // Saltar filas inválidas
          if (invalidRows.has(i)) {
            skipped++;
            continue;
          }

          const record = records[i];

          try {
            const result = await tx.estudiantes.upsert({
              where: { numero_registro: record.numero_registro },
              update: {
                nombre_estudiante: record.nombre_estudiante,
                id_whatsapp: record.id_whatsapp || null,
              },
              create: {
                numero_registro: record.numero_registro,
                nombre_estudiante: record.nombre_estudiante,
                id_whatsapp: record.id_whatsapp || null,
                total_materias_registradas: 0,
              },
            });

            // Determinar si fue insert o update comparando creado_en
            const isNew = new Date(result.creado_en).getTime() === new Date(result.actualizado_en).getTime();
            if (isNew) {
              inserted++;
            } else {
              updated++;
            }
          } catch (error) {
            failed++;
            if (!tolerantMode) {
              throw error; // Rollback en modo estricto
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(
        `Seeding failed: ${error.message}. Use tolerantMode=true to skip errors.`,
      );
    }

    return {
      ...validation,
      insertedCount: inserted,
      updatedCount: updated,
      skippedCount: skipped,
      failedCount: failed,
    };
  }

  /**
   * Inserta grupos con transacción
   */
  private async seedGroups(
    records: any[],
    validation: ValidationResult,
    tolerantMode: boolean,
  ): Promise<SeedingResult> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const invalidRows = new Set(validation.errors.map((e) => e.row - 2));

    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
          if (invalidRows.has(i)) {
            skipped++;
            continue;
          }

          const record = records[i];

          try {
            const result = await tx.grupos.upsert({
              where: { codigo_grupo: record.codigo_grupo.toUpperCase() },
              update: {},
              create: {
                codigo_grupo: record.codigo_grupo.toUpperCase(),
              },
            });

            const isNew = new Date(result.creado_en).getTime() === new Date(result.actualizado_en).getTime();
            if (isNew) {
              inserted++;
            } else {
              updated++;
            }
          } catch (error) {
            failed++;
            if (!tolerantMode) {
              throw error;
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(
        `Seeding failed: ${error.message}. Use tolerantMode=true to skip errors.`,
      );
    }

    return {
      ...validation,
      insertedCount: inserted,
      updatedCount: updated,
      skippedCount: skipped,
      failedCount: failed,
    };
  }

  /**
   * Inserta grupo_materia con transacción
   */
  private async seedGroupMappings(
    records: any[],
    validation: ValidationResult,
    tolerantMode: boolean,
  ): Promise<SeedingResult> {
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    const invalidRows = new Set(validation.errors.map((e) => e.row - 2));

    try {
      await this.prisma.$transaction(async (tx) => {
        for (let i = 0; i < records.length; i++) {
          if (invalidRows.has(i)) {
            skipped++;
            continue;
          }

          const record = records[i];

          try {
            // 1. Verificar que existe el semestre
            const semestre = await tx.semestres.findUnique({
              where: { codigo: record.codigo_semestre },
            });

            if (!semestre) {
              throw new Error(`Semester ${record.codigo_semestre} not found`);
            }

            // 2. Obtener o crear materia
            const materia = await tx.materias.upsert({
              where: { codigo_materia: record.codigo_materia.toUpperCase() },
              update: {},
              create: {
                codigo_materia: record.codigo_materia.toUpperCase(),
                nombre: record.nombre_materia || record.codigo_materia.toUpperCase(),
              },
            });

            // 3. Obtener o crear grupo
            const grupo = await tx.grupos.upsert({
              where: { codigo_grupo: record.codigo_grupo.toUpperCase() },
              update: {},
              create: {
                codigo_grupo: record.codigo_grupo.toUpperCase(),
              },
            });

            // 4. Crear o actualizar grupo_materia
            const result = await tx.grupo_materia.upsert({
              where: {
                id_semestre_id_materia_id_grupo: {
                  id_semestre: semestre.id,
                  id_materia: materia.id,
                  id_grupo: grupo.id,
                },
              },
              update: {
                jid_grupo_whatsapp: record.jid_grupo_whatsapp,
                version: { increment: 1 },
              },
              create: {
                id_materia: materia.id,
                id_grupo: grupo.id,
                id_semestre: semestre.id,
                jid_grupo_whatsapp: record.jid_grupo_whatsapp,
                version: 1,
              },
            });

            if (result.version === 1) {
              inserted++;
            } else {
              updated++;
            }
          } catch (error) {
            failed++;
            if (!tolerantMode) {
              throw error;
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(
        `Seeding failed: ${error.message}. Use tolerantMode=true to skip errors.`,
      );
    }

    return {
      ...validation,
      insertedCount: inserted,
      updatedCount: updated,
      skippedCount: skipped,
      failedCount: failed,
    };
  }
}

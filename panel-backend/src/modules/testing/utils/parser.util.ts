import * as crypto from 'crypto';

export interface SubjectData {
  sigla: string;
  grupo: string;
  materia: string;
  modalidad?: string | null;
  nivel?: string | null;
  horario?: string | null;
}

export interface ParsedDocument {
  isValid: boolean;
  registrationNumber: string;
  studentName: string;
  subjects: SubjectData[];
}

/**
 * Normalize text for comparison (remove accents, lowercase)
 */
export function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
}

/**
 * Extract registration number from OCR text
 * Format: 8-9 digits
 */
export function extractRegistrationNumber(text: string): string | null {
  // Handle common OCR errors
  const cleanedText = text
    .replace(/[Oo](?=\d)/g, '0') // O -> 0 before digits
    .replace(/[Il](?=\d)/g, '1'); // I/l -> 1 before digits

  // Multiple patterns to try
  const patterns = [
    /\b(\d{9})\b/, // Standalone 9-digit number
    /\b(222\d{6})\b/, // Specific pattern (222009969)
    /\b(\d{8})\b/, // Fallback: 8-digit number
    /(?:REGISTRO|MATRICULA|MATRÍCULA|REG\.?|MAT\.?)[:\s]*(\d{8,9})/i, // With label
  ];

  for (const pattern of patterns) {
    const match = cleanedText.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract student name from OCR text
 */
export function extractStudentName(text: string): string | null {
  // Pattern 1: digits followed by name (uppercase OR mixed case), before career keywords
  const pattern =
    /\d{8,9}\s+([A-ZÑÁÉÍÓÚa-zñáéíóú\s]{10,})(?:\s+(?:CARRERA|INGENIERIA|INGENIERÍA|ING\.|LICENCIATURA|ORIGEN|\d{7}-[A-Z]{3}))/i;
  const match = text.match(pattern);

  if (match) {
    const name = match[1].trim();
    // Skip if it looks like a header or period name
    if (!name.match(/PERIODO|NORMAL|MODALIDAD|LOCALIDAD/i)) {
      return name;
    }
  }

  // Pattern 2: Name in table row AFTER registration (Markdown table format)
  // Example: | 248112233 |\n| Vargas Cruz Camila 5192837-SCZ |
  const tableNamePattern =
    /\|\s*\d{8,9}\s*\|[\s\n]*\|\s*([A-ZÑÁÉÍÓÚa-zñáéíóú\s]+?)\s+\d{5,}-[A-Z]{2,4}\s*\|/;
  const tableMatch = text.match(tableNamePattern);
  if (tableMatch) {
    const name = tableMatch[1].trim();
    return name;
  }

  // Pattern 3: Name with CI in same line (mixed case)
  // Example: "Vargas Cruz Camila 5192837-SCZ"
  const nameWithCiPattern =
    /([A-ZÑÁÉÍÓÚa-zñáéíóú]{3,}(?:\s+[A-ZÑÁÉÍÓÚa-zñáéíóú]{3,}){1,4})\s+\d{5,}-[A-Z]{2,4}/;
  const nameWithCi = text.match(nameWithCiPattern);
  if (nameWithCi) {
    const name = nameWithCi[1].trim();
    // Skip if it looks like a header or period name
    if (
      !name.match(/PERIODO|NORMAL|MODALIDAD|LOCALIDAD|ORIGEN|INGENIERIA|INFORMATICA/i)
    ) {
      return name;
    }
  }

  // Fallback: look for line after registration number (allow mixed case)
  const lines = text.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    if (/\d{8,9}/.test(lines[i])) {
      const nextLine = lines[i + 1].trim();
      // Allow both uppercase and mixed case names, exclude numbers and common keywords
      if (
        /^[A-ZÑÁÉÍÓÚa-zñáéíóú\s]{10,}$/.test(nextLine) &&
        !/\d/.test(nextLine) &&
        !nextLine.match(/PERIODO|NORMAL|MODALIDAD|LOCALIDAD|ORIGEN/i)
      ) {
        return nextLine;
      }
    }
  }

  // Last resort: two or more capitalized words
  const namePattern =
    /\b([A-ZÑÁÉÍÓÚ]{3,}\s+[A-ZÑÁÉÍÓÚ]{3,}(?:\s+[A-ZÑÁÉÍÓÚ]{3,})?)\b/;
  const nameMatch = text.match(namePattern);
  if (
    nameMatch &&
    !nameMatch[1].match(/PERIODO|NORMAL|MODALIDAD|LOCALIDAD/i)
  ) {
    return nameMatch[1];
  }

  return null;
}

/**
 * Extract subjects from OCR text
 * Handles multiple OCR formats: table pipes, plain text, relaxed
 */
export function extractSubjects(text: string): SubjectData[] {
  const subjects: SubjectData[] = [];

  // Normalize text: fix common OCR errors (preserve newlines for table parsing)
  const normalized = text
    .replace(/(?<=\d)[Oo](?=\d)/g, '0') // O->0 between digits
    .replace(/[Il](?=\d)/g, '1'); // I/l->1 before digits

  // Pattern 1: Table with pipes (Markdown-style from OCR.space)
  // Example: | MAT101 | Z1 | CALCULO I | PRESENCIAL | 1 | ...
  // SIGLA: exactly 3 letters + 3 digits (INF513, RSD421, MAT101)
  // GRUPO: letter + (letter or digit), never digit+digit (Z1, SA, SB)
  const tablePattern =
    /\|\s*([A-Z]{3}\d{3})\s*\|\s*([A-Z][A-Z0-9])\s*\|\s*([A-ZÑÁÉÍÓÚÜ\s.0-9&]{5,}?)\s*\|/gi;

  let match: RegExpExecArray | null;
  while ((match = tablePattern.exec(normalized)) !== null) {
    const [, sigla, grupo, materia] = match;
    const materiaClean = materia.trim().replace(/\s+/g, ' ');

    subjects.push({
      sigla: sigla.trim().toUpperCase(),
      grupo: grupo.trim().toUpperCase(),
      materia: materiaClean,
      modalidad: null,
      nivel: null,
      horario: null,
    });
  }

  // Pattern 2: Plain text format (fallback for Tesseract)
  // Examples: INF412 SA SISTEMAS OPERATIVOS
  // SIGLA: 3 letters + 3 digits, GRUPO: letter + (letter or digit)
  if (subjects.length === 0) {
    const textForPlain = normalized.replace(/\s+/g, ' ');
    const pattern =
      /\b([A-Z]{3}\d{3})\s+([A-Z][A-Z0-9])\s+([A-ZÑÁÉÍÓÚÜ\s.&]{5,})(?=\s+(?:PRESENCIAL|VIRTUAL|HIBRIDA|\d+|Ma|Lu|Mi|Ju|Vi|Sa|Do)|\s*$)/gi;

    while ((match = pattern.exec(textForPlain)) !== null) {
      const [, sigla, grupo, materia] = match;
      const materiaClean = materia.trim().replace(/\s+/g, ' ');

      const context = normalized.substring(match.index, match.index + 200);
      const modalidad =
        context.match(/\b(PRESENCIAL|VIRTUAL|HIBRIDA)\b/i)?.[1] || null;
      const nivel = context.match(/\b(\d+)\b/)?.[1] || null;
      const horarioMatch = context.match(/(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})/);
      const horario = horarioMatch ? horarioMatch[1] : null;

      subjects.push({
        sigla: sigla.trim().toUpperCase(),
        grupo: grupo.trim().toUpperCase(),
        materia: materiaClean,
        modalidad,
        nivel,
        horario,
      });
    }
  }

  // Pattern 3: Relaxed pattern for OCR errors
  // SIGLA: 3 letters + 3 digits (with optional space), GRUPO: letter + (letter or digit)
  if (subjects.length === 0) {
    const relaxedPattern = /\b([A-Z]{3})\s*(\d{3})\s+([A-Z][A-Z0-9])\b/gi;

    while ((match = relaxedPattern.exec(normalized)) !== null) {
      const [fullMatch, prefix, number, grupo] = match;
      const sigla = `${prefix}${number}`;

      // Try to find materia name in the next 80 chars
      const afterMatch = normalized.substring(
        match.index + fullMatch.length,
        match.index + fullMatch.length + 80,
      );
      const materiaMatch = afterMatch.match(
        /\s+([A-ZÑÁÉÍÓÚÜ\s.&]{10,}?)(?=\s+(?:PRESENCIAL|VIRTUAL|Ma|Lu|Mi|Ju|Vi|\||$))/,
      );
      const materia = materiaMatch
        ? materiaMatch[1].trim()
        : 'MATERIA DESCONOCIDA';

      subjects.push({
        sigla: sigla.toUpperCase(),
        grupo: grupo.toUpperCase(),
        materia: materia.replace(/\s+/g, ' '),
        modalidad: null,
        nivel: null,
        horario: null,
      });
    }
  }

  return subjects;
}

/**
 * Calculate document hash
 */
export function calculateDocumentHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Parse enrollment document
 */
export function parseEnrollmentDocument(ocrText: string): ParsedDocument {
  // Log for debugging
  console.log('=== PARSING DOCUMENT ===');
  console.log('OCR Text Length:', ocrText.length);
  console.log('OCR Text Preview:', ocrText.substring(0, 500));

  const registrationNumber = extractRegistrationNumber(ocrText);
  console.log('Extracted Registration:', registrationNumber);

  const studentName = extractStudentName(ocrText);
  console.log('Extracted Name:', studentName);

  const subjects = extractSubjects(ocrText);
  console.log('Extracted Subjects:', subjects.length, subjects);

  const isValid = !!(
    registrationNumber &&
    studentName &&
    subjects.length > 0
  );

  console.log('Document Valid:', isValid);
  console.log('======================');

  return {
    isValid,
    registrationNumber: registrationNumber || '',
    studentName: studentName || '',
    subjects,
  };
}


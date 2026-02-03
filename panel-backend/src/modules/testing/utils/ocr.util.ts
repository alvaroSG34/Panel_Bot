import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('OCR');

/**
 * Perform OCR using OCR.space API
 * Uses formdata-node (compatible with fetch) instead of form-data
 */
export async function performOCRSpace(
  buffer: Buffer,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  try {
    logger.log('Using OCR.space API for OCR');

    if (!apiKey) {
      throw new Error('OCR_SPACE_API_KEY not configured');
    }

    // Import formdata-node (compatible with fetch, same as BotWhatsapp)
    const { FormData } = await import('formdata-node');

    // Convert buffer to base64
    const base64String = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    // Create form data (same format as BotWhatsapp)
    const formData = new FormData();
    formData.append('base64Image', dataUrl); // Full data URL with prefix
    formData.append('apikey', apiKey);
    formData.append('filetype', 'JPG'); // REQUIRED: file type parameter
    formData.append('OCREngine', '3');

    // Call OCR.space API (no need for custom headers with formdata-node)
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData as any,
    });

    logger.debug('OCR.space response status:', response.status);

    const data = await response.json();

    // Debug: Log complete response
    logger.debug('OCR.space API response:', JSON.stringify(data).substring(0, 500));

    if (data.IsErroredOnProcessing) {
      logger.error('OCR.space processing failed', {
        errorMessage: data.ErrorMessage,
        errorDetails: data.ErrorDetails,
      });
      throw new Error(data.ErrorMessage?.[0] || 'OCR.space processing error');
    }

    const extractedText = data.ParsedResults?.[0]?.ParsedText;

    if (!extractedText) {
      logger.error('No text in OCR.space response', {
        hasResults: !!data.ParsedResults,
        resultCount: data.ParsedResults?.length,
        firstResult: data.ParsedResults?.[0],
      });
      throw new Error('No text extracted from OCR.space');
    }

    logger.log('OCR.space extraction successful', {
      textLength: extractedText.length,
    });
    return extractedText;
  } catch (error) {
    logger.error('OCR.space error', { error: error.message });
    throw error;
  }
}

/**
 * Perform OCR using OpenAI Vision API
 */
export async function performOpenAIVision(
  buffer: Buffer,
  apiKey: string,
): Promise<string> {
  try {
    logger.log('Using OpenAI Vision API for OCR');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Import OpenAI dynamically
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey });

    const base64Image = buffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract ALL text from this enrollment document (boleta de inscripción). Return ONLY the raw text, preserving line breaks and formatting. Include: registration number, student name, and complete table of subjects with SIGLA, GRUPO, and MATERIA columns.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1500,
    });

    const extractedText = response.choices[0]?.message?.content;

    if (!extractedText) {
      throw new Error('No text extracted from OpenAI Vision');
    }

    logger.log('OpenAI Vision extraction successful');
    return extractedText;
  } catch (error) {
    logger.error('OpenAI Vision error', { error: error.message });
    throw error;
  }
}

/**
 * Perform OCR using Tesseract.js (local fallback)
 */
export async function performTesseract(buffer: Buffer): Promise<string> {
  try {
    logger.log('Using Tesseract.js for OCR (local fallback)');

    // Import Tesseract dynamically
    const Tesseract = (await import('tesseract.js')).default;

    const result = await Tesseract.recognize(buffer, 'spa', {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          logger.debug(`Tesseract progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    const extractedText = result.data.text;

    if (!extractedText || extractedText.trim().length < 10) {
      throw new Error('Insufficient text extracted from Tesseract');
    }

    logger.log('Tesseract extraction successful');
    return extractedText;
  } catch (error) {
    logger.error('Tesseract error', { error: error.message });
    throw error;
  }
}

/**
 * Main OCR function with fallback chain
 * OpenAI Vision → OCR.space → Tesseract
 */
export async function performOCR(
  buffer: Buffer,
  mimeType: string,
  configService: ConfigService,
): Promise<string> {
  const openaiKey = configService.get<string>('OPENAI_API_KEY');
  const ocrSpaceKey = configService.get<string>('OCR_SPACE_API_KEY');

  // Try OpenAI Vision first (if configured)
  if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
    try {
      return await performOpenAIVision(buffer, openaiKey);
    } catch (error) {
      logger.warn('OpenAI Vision failed, trying OCR.space', {
        error: error.message,
      });
    }
  }

  // Try OCR.space (if configured)
  if (ocrSpaceKey && ocrSpaceKey !== 'your_ocr_space_api_key_here') {
    try {
      return await performOCRSpace(buffer, mimeType, ocrSpaceKey);
    } catch (error) {
      logger.warn('OCR.space failed, trying Tesseract', {
        error: error.message,
      });
    }
  }

  // Fallback to Tesseract (always available)
  return await performTesseract(buffer);
}

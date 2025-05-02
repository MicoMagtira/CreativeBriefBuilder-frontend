// This is a stub for the AI analysis logic
// Removed incorrect import. Use Express.Multer.File type directly.
import OpenAI from 'openai';
import * as fs from 'fs/promises';

import mammoth from 'mammoth';
import { extractReviewAndProductColumns } from './csvUtils.js';
import { chunkAndAggregateInsights } from './chunkAndAggregate.js';
import * as path from 'path';

let openai: OpenAI | undefined = undefined;
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
  console.error('[AI Review Analysis] ERROR: OpenAI API key is missing or not set correctly.');
} else {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function analyzeReviewsWithAI(file: Express.Multer.File): Promise<any> {
  // Debug: print file object and req.body if available
  console.log('[AI Review Analysis] DEBUG file object:', file);
  // Note: req.body is not available here, only in the route handler

  let content = '';
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.csv', '.txt', '.pdf', '.docx'];
    if (!allowedExts.includes(ext)) {
      const msg = `[AI Review Analysis] ERROR: Unsupported file type: ${ext}`;
      console.error(msg);
      throw new Error('Unsupported file type. Only CSV, TXT, PDF, and DOCX are allowed.');
    }
    let buffer: Buffer;
    if (file.buffer) {
      buffer = file.buffer;
    } else {
      const msg = '[AI Review Analysis] ERROR: Uploaded file is missing buffer (expected memoryStorage).';
      console.error(msg);
      throw new Error('Uploaded file is missing buffer (expected memoryStorage).');
    }
    console.log('[AI Review Analysis] DEBUG file.originalname:', file.originalname);
    console.log('[AI Review Analysis] DEBUG ext:', ext);
    console.log('[AI Review Analysis] DEBUG buffer type:', typeof buffer, 'length:', buffer?.length);

    if (ext === '.csv') {
      // Extract only review/product columns
      const csvString = buffer.toString('utf-8');
      const { headers, rows } = extractReviewAndProductColumns(csvString);
      console.log('[AI Review Analysis] CSV columns selected:', headers);
      if (headers.length && rows.length) {
        if (rows.length > 50) {
          console.log(`[AI Review Analysis] Chunking and aggregating ${rows.length} rows...`);
          // Use chunking/aggregation for large CSVs
          if (!openai) throw new Error('OpenAI API not initialized');
          content = await chunkAndAggregateInsights({ rows, headers, openai });
        } else {
          // If small, send all rows
          content = headers.join(',') + '\n' + rows.map(r => r.join(',')).join('\n');
          console.log(`[AI Review Analysis] Sending all ${rows.length} rows to OpenAI`);
        }
      } else {
        // Fallback: send all content
        content = csvString;
      }
    } else if (ext === '.pdf') {
      console.log('[AI Review Analysis] DEBUG entering PDF handler');
      // Use pdfjs-dist to extract text from PDF
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js');
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const contentObj = await page.getTextContent();
        text += contentObj.items.map((item: any) => item.str).join(' ') + '\n';
      }
      content = text;
    } else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else {
      content = buffer.toString('utf-8');
    }

    if (!content.trim()) {
      const msg = '[AI Review Analysis] ERROR: Uploaded file is empty or could not be parsed.';
      console.error(msg);
      throw new Error('Uploaded file is empty or could not be parsed.');
    }

    // Debug: log extracted content
    console.log('[AI Review Analysis] File content sent to OpenAI:', content.slice(0, 1000));

    if (!openai) {
      const msg = '[AI Review Analysis] ERROR: OpenAI API key is missing or not set correctly.';
      console.error(msg);
      throw new Error('OpenAI API key is missing or not set correctly.');
    }

    // Call OpenAI API (example prompt, adjust as needed)
    const prompt = `Analyze the following customer reviews and extract key insights that would help create a powerful creative brief for DTC Meta Ads.\n\n${content}`;
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert in DTC marketing and customer insights.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 600,
        temperature: 0.3,
      });
    } catch (err: any) {
      const msg = `[AI Review Analysis] ERROR: OpenAI API call failed: ${err?.message || err}`;
      console.error(msg);
      throw new Error('OpenAI API call failed. Please check your API key, quota, or network connection.');
    }
    const aiResult = completion.choices[0]?.message?.content || '';
    // Debug: log AI result
    console.log('[AI Review Analysis] AI insights result:', aiResult);
    return aiResult;
  } catch (err) {
    throw new Error('Failed to analyze reviews: ' + (err instanceof Error ? err.message : 'Unknown error'));
  }
}

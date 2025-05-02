import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import formidable from 'formidable';

import mammoth from 'mammoth';
// TODO: Re-enable after Brand Info testing
// import pdfParse from 'pdf-parse';
import xlsx from 'xlsx';
import csvParse from 'csv-parse/lib/sync';
import { addSummaryToBrief } from './briefInfo.js';
import { analyzeVisualAssets } from './visualStrategy.js';

// You should set your OpenAI API key in your environment variables
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeUploadHandler(req: Request, res: Response) {
  const form = formidable({ multiples: false });
  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) {
      res.status(500).json({ error: 'File upload error.' });
      return;
    }
    const briefId = fields.briefId as string;
    const file = files.file as any;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }
    let summary = '';
    try {
      if (file.mimetype?.startsWith('image/')) {
        // Analyze image using OpenAI Vision API
        const imageBuffer = fs.readFileSync(file.filepath);
        const base64Image = imageBuffer.toString('base64');
        const aiRes = await openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze and summarize the content and style of this image for a creative marketing brief.' },
                { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64Image}` } }
              ]
            }
          ],
          max_tokens: 300
        });
        summary = aiRes.choices[0]?.message?.content || '';
      // TODO: Re-enable PDF support after Brand Info testing
      /*
      } else if (file.mimetype === 'application/pdf') {
        const data = fs.readFileSync(file.filepath);
        const text = (await pdfParse(data)).text;
        summary = await summarizeTextWithOpenAI(text);
      */
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const data = fs.readFileSync(file.filepath);
        const { value: text } = await mammoth.extractRawText({ buffer: data });
        summary = await summarizeTextWithOpenAI(text);
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const data = fs.readFileSync(file.filepath);
        const workbook = xlsx.read(data, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = xlsx.utils.sheet_to_csv(sheet);
        summary = await summarizeTextWithOpenAI(csv);
      } else if (file.mimetype === 'text/csv') {
        const data = fs.readFileSync(file.filepath, 'utf8');
        summary = await summarizeTextWithOpenAI(data);
      } else {
        summary = 'Unsupported file type.';
      }
      // Save summary to the brief
      await addSummaryToBrief(briefId, summary);
      res.json({ summary });
    } catch (e: unknown) {
      let details = '';
      if (e && typeof e === 'object' && 'message' in e) {
        details = (e as any).message;
      } else {
        details = String(e);
      }
      res.status(500).json({ error: 'AI analysis failed', details });
    }
  });
}

// New handler for visual assets analysis
export async function analyzeVisualAssetsHandler(req: Request, res: Response) {
  const form = formidable({ multiples: true });
  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) {
      res.status(500).json({ error: 'File upload error.' });
      return;
    }
    try {
      // Extract files (arrays or single)
      const topAds = Array.isArray(files.topAds) ? files.topAds : files.topAds ? [files.topAds] : [];
      const moodboard = Array.isArray(files.moodboard) ? files.moodboard : files.moodboard ? [files.moodboard] : [];
      if (!topAds.length && !moodboard.length) {
        res.status(400).json({ error: 'No visual assets uploaded.' });
        return;
      }
      // Map to expected format
      const mapFile = (f: any) => ({ path: f.filepath, mimetype: f.mimetype, originalFilename: f.originalFilename });
      console.log('Calling analyzeVisualAssets with:', {
        topAds: topAds.map(mapFile),
        moodboard: moodboard.map(mapFile),
        briefId: fields.briefId
      });
      const result = await analyzeVisualAssets({
        topAds: topAds.map(mapFile),
        moodboard: moodboard.map(mapFile),
        briefId: fields.briefId as string,
      });
      console.log('analyzeVisualAssets result:', result);
      res.json(result);
    } catch (e: unknown) {
      let details = '';
      if (e && typeof e === 'object' && 'message' in e) {
        details = (e as any).message;
      } else {
        details = String(e);
      }
      console.error('Visual strategy analysis error:', e);
      res.status(500).json({ error: 'Visual strategy analysis failed', details });
    }
  });
}

async function summarizeTextWithOpenAI(text: string): Promise<string> {
  const prompt = `Summarize the following document for a creative marketing brief.\n\n${text.slice(0, 4000)}`;
  const aiRes = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300
  });
  return aiRes.choices[0]?.message?.content || '';
}

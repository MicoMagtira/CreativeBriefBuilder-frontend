import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

import { addSummaryToBrief } from './briefInfo.js';

export async function analyzeVisualAssets({ topAds, moodboard, briefId }: { topAds: { path: string, mimetype: string, originalFilename: string }[], moodboard: { path: string, mimetype: string, originalFilename: string }[], briefId?: string }) {
  console.log('analyzeVisualAssets called with:', { topAds, moodboard, briefId });
  // Helper: analyze one image
  async function analyzeImage(file: { path: string, mimetype: string, originalFilename: string }, assetPurpose: string) {
    const imageBuffer = fs.readFileSync(file.path);
    const base64Image = imageBuffer.toString('base64');
    const prompt = `Analyze this image as a visual strategist. The asset's purpose is: ${assetPurpose}. Describe its style, color, layout, and emotional tone.`;
    const aiRes = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64Image}` } }
          ]
        }
      ],
      max_tokens: 300
    });
    return { filename: file.originalFilename, analysis: aiRes.choices[0]?.message?.content || '' };
  }

  // Analyze all images
  const topAdsAnalyses = await Promise.all(topAds.map(file => analyzeImage(file, 'Top Performing Ad Reference')));
  const moodboardAnalyses = await Promise.all(moodboard.map(file => analyzeImage(file, 'Mood Board Reference')));

  // Compose a summary prompt
  const summaryPrompt = `Refer to the uploaded visual assets for tone and visual guidance. The assets include high-performing ad references and moodboard images. Suggest visual strategies that align with the file names and asset purpose.\n\nGenerate a Visual Strategy Summary:\n- Recommended color tones\n- Layout inspiration\n- Emotional tone (e.g., cozy, high energy, clean, sophisticated)\n- Creative do’s/don’ts based on uploaded inspiration\n\nHere are the individual analyses for each asset:\n\n${topAdsAnalyses.map(a => `[Top Ad] ${a.filename}: ${a.analysis}`).join('\n')}\n${moodboardAnalyses.map(a => `[Moodboard] ${a.filename}: ${a.analysis}`).join('\n')}`;

  const strategyRes = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'user', content: summaryPrompt }
    ],
    max_tokens: 400
  });

  const visualStrategySummary = strategyRes.choices[0]?.message?.content || '';

  // Optionally save to brief
  if (briefId) {
    await addSummaryToBrief(briefId, visualStrategySummary, 'Visual Strategy Summary');
  }

  // Helper to clean up markdown/asterisks and extra whitespace
  function cleanText(text: string) {
    return text
      .replace(/\*\*/g, '') // remove bold markdown
      .replace(/\*/g, '') // remove asterisks
      .replace(/#+/g, '') // remove markdown headings
      .replace(/\s{2,}/g, ' ') // collapse extra spaces
      .replace(/^- /gm, '') // remove list dashes
      .replace(/\n{2,}/g, '\n') // collapse extra newlines
      .trim();
  }

  return {
    topAdsAnalyses: topAdsAnalyses.map(a => ({ ...a, analysis: cleanText(a.analysis) })),
    moodboardAnalyses: moodboardAnalyses.map(a => ({ ...a, analysis: cleanText(a.analysis) })),
    visualStrategySummary: cleanText(visualStrategySummary)
  };

}

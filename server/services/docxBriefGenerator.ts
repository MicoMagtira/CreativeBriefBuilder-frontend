import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { getBrandInfo } from '../briefInfo.js';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to create blue section headings
function blueHeading(text: string, size = 28) {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, color: '2F5496', size }),
    ],
    spacing: { after: 120 },
  });
}

// Helper to create normal headings
function normalHeading(text: string, size = 32) {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, size }),
    ],
    spacing: { after: 120 },
  });
}

// Helper to extract a section from the AI brief with ultra-robust, flexible matching
function extractSection(section: string, text: string, alternates: string[] = []): string {
  // Accept Markdown headers (##, ###), bold (**Section**), colons, dashes, etc.
  const allNames = [section, ...alternates];
  const headerPattern = allNames
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // escape regex
    .join('|');
  // Regex: optional hashes/asterisks, section name, optional formatting, colon/dash/whitespace, then capture until next header or end
  const regex = new RegExp(
    `(?:^|\n)\\s*[#>*-]*\\s*(?:\\*\\*)?(${headerPattern})(?:\\*\\*)?\\s*[:\\-]?\\s*\\n?([\\s\\S]*?)(?=(?:\\n\\s*[#>*-]*\\s*(?:\\*\\*)?(?:${headerPattern})(?:\\*\\*)?\\s*[:\\-]?\\s*\\n?)|\\n\\s*[#>*-]*\\s*[A-Z][^\\n]{2,30}[:\\-]?|$)`,
    'i'
  );
  const match = text.match(regex);
  if (match) {
    console.log(`[extractSection] Matched for '${section}':`, match[2].trim().slice(0, 200));
    return match[2].trim();
  } else {
    console.log(`[extractSection] No match for '${section}'`);
    return '';
  }
}

// --- Parse Creative Version Block ---
function parseCreativeVersionBlock(text: string): any[] {
  // Extract fields: Title, Description, Hook/Angle, Headlines, Body Copy, Call to Action
  const versionTitle = (text.match(/^Version \d+: ?(.+)/) || [])[1] || '';
  const description = extractSection('Description', text);
  const hook = extractSection('Hook/Angle', text);
  const headlines = extractSection('Headlines', text).split(/\n[-*]\s*/).filter(Boolean);
  const bodyCopy = extractSection('Body Copy', text).split(/\n[-*]\s*/).filter(Boolean);
  const cta = extractSection('Call to Action', text);
  // Compose the version section
  const children = [
    new Paragraph({
      children: [new TextRun({ text: `Version: ${versionTitle}`, bold: true, color: '2F5496', size: 26 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Description', bold: true, size: 22, color: '222222' })],
    }),
    new Paragraph({ children: [new TextRun({ text: description, size: 20 })], spacing: { after: 40 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Hook/Angle', bold: true, size: 22, color: '222222' })],
    }),
    new Paragraph({ children: [new TextRun({ text: hook, size: 20 })], spacing: { after: 40 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Headlines', bold: true, size: 22, color: '222222' })],
    }),
    ...headlines.map(h => new Paragraph({ text: h, bullet: { level: 0 }, spacing: { after: 20 } })),
    new Paragraph({
      children: [new TextRun({ text: 'Body Copy', bold: true, size: 22, color: '222222' })],
    }),
    ...bodyCopy.map(b => new Paragraph({ text: b, bullet: { level: 0 }, spacing: { after: 20 } })),
  ];
  return children;
}

export async function generateBriefDocx(briefId: string): Promise<Buffer> {
  try {
    const brief = getBrandInfo(briefId);
    if (!brief) throw new Error('Brief not found');

    // Find the main creative brief summary
    const creativeBriefSummary = (brief.aiSummaries || []).find(
      s => s.fileName && s.fileName.toLowerCase().includes('creative brief')
    )?.summary || '';

    // Find the visual strategy summary
    const visualStrategySummary = (brief.aiSummaries || []).find(
      s => s.fileName && s.fileName.toLowerCase().includes('visual strategy')
    )?.summary || '';

    // Compose the AI prompt
    const prompt = `You are an expert creative strategist. Using the following AI Visual Strategy Summary and Structured AI Creative Brief Summary, synthesize them into a single, comprehensive creative brief in the format below. Fill in all relevant fields with the most appropriate information, and create 2-3 creative versions as shown in the template. Be concise, clear, and persuasive. If a field is missing, use your best judgment to infer from the summaries.

Format:
${`Creative Brief 1
Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' })}
Client Information
Client: ${brief.clientName || ''}
Brand: ${brief.productUrl || ''}
Industry: ${brief.industry || ''}
Ad Format: ${(brief.offers && brief.offers.selectedFormats && Object.keys(brief.offers.selectedFormats).filter(k => brief.offers && brief.offers.selectedFormats && brief.offers.selectedFormats[k]).join(', ')) || ''}
Product: ${brief.productList || ''}
Target Audience
Age Range: ${brief.audience?.ageRange || ''}
${brief.audience?.customerPainPoints || ''}
Unique Selling Proposition
${(Array.isArray(brief.offers?.usps) ? brief.offers.usps.join(', ') : (brief.offers?.usps || ''))}
Creative Versions
[The following sections should be filled for each creative version:]
Version X: [Title]
Description
[Description]
Hook/Angle
[Hook or angle]
Headlines
[Bulleted headlines]
Body Copy
[Bulleted body copy]
Call to Action
[Call to action]
`}

Brief Data:
- AI Visual Strategy Summary:
${visualStrategySummary}
- Structured AI Creative Brief Summary:
${creativeBriefSummary}

Brief Info:
- clientName: ${brief.clientName || ''}
- productUrl: ${brief.productUrl || ''}
- industry: ${brief.industry || ''}
- adFormat: ${(brief.offers && brief.offers.selectedFormats && Object.keys(brief.offers.selectedFormats).filter(k => brief.offers && brief.offers.selectedFormats && brief.offers.selectedFormats[k]).join(', ')) || ''}
- productList: ${brief.productList || ''}
- ageRange: ${brief.audience?.ageRange || ''}
- audienceDetails: ${brief.audience?.customerPainPoints || ''}
- usps: ${(Array.isArray(brief.offers?.usps) ? brief.offers.usps.join(', ') : (brief.offers?.usps || ''))}

Output the final brief in the above format, replacing placeholders with real content.`;

  let aiFinalBrief = '';
  try {
    console.log('[DOCX] OpenAI prompt:', prompt);
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3,
    });
    aiFinalBrief = completion.choices[0]?.message?.content || '';
    console.log('[DOCX] AI Final Brief:', aiFinalBrief);
  } catch (err: any) {
    console.error('[DOCX] OpenAI call failed:', err);
    aiFinalBrief = 'AI synthesis failed. Please try again later.';
  }

  // Main title and date
  const title = 'Creative Brief 1';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });

  // --- Client Info Table ---
  const clientInfoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Client:', bold: true })] })] }),
          new TableCell({ children: [new Paragraph(brief.clientName || '')] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Brand:', bold: true })] })] }),
          new TableCell({ children: [new Paragraph(brief.productUrl || '')] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Industry:', bold: true })] })] }),
          new TableCell({ children: [new Paragraph(brief.industry || '')] }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Ad Format:', bold: true })] })] }),
          new TableCell({ children: [
            new Paragraph(
              (() => {
                if (brief.offers && brief.offers.selectedFormats) {
                  const selected = Object.entries(brief.offers.selectedFormats)
                    .filter(([k, v]) => v)
                    .map(([k]) => k)
                    .join(', ');
                  return selected || '[No ad format]';
                }
                return '[No ad format]';
              })()
            )
          ] }),
        ],
      }),
    ],
  });

  // --- Extracted Sections ---
  // Use heuristics to extract from the AI output
  // More robust extraction with alternates
  let product = extractSection('Product', aiFinalBrief, ['Product Description']) || extractSection('Product', creativeBriefSummary, ['Product Description']) || '';
  let targetAudience = extractSection('Target Audience', aiFinalBrief, ['Audience Profile', 'Audience', 'Target']) || '';
  let usps = extractSection('Unique Selling Proposition', aiFinalBrief, ['USP', 'Selling Proposition', 'Key Benefit']) || '';

  // Fallbacks if extraction fails
  if (!product || typeof product !== 'string') product = 'Not provided';
  if (!targetAudience || typeof targetAudience !== 'string') targetAudience = 'Not provided';
  if (!usps || typeof usps !== 'string') usps = 'Not provided';

  // Debug logging for extracted sections
  console.log('[DOCX] Extracted Product:', product.slice(0, 200));
  console.log('[DOCX] Extracted Target Audience:', targetAudience.slice(0, 200));
  console.log('[DOCX] Extracted USPs:', usps.slice(0, 200));

  // --- Creative Versions ---
  // Extract creative versions blocks
  const creativeVersions: string[] = [];
  const creativeVersionRegex = /Version \d+:.*?(?=\nVersion \d+:|$)/gs;
  let match;
  while ((match = creativeVersionRegex.exec(aiFinalBrief))) {
    if (typeof match[0] === 'string') {
      creativeVersions.push(match[0].trim());
    }
  }
  console.log('[DOCX] Extracted Creative Versions:', creativeVersions.length, creativeVersions.map(v => v.slice(0, 100)));

// --- Parse Creative Version Block ---
function parseCreativeVersionBlock(text: string): any[] {
  // Extract fields: Title, Description, Hook/Angle, Headlines, Body Copy, Call to Action
  const versionTitle = (text.match(/^Version \d+: ?(.+)/) || [])[1] || '';
  const description = extractSection('Description', text);
  const hook = extractSection('Hook/Angle', text);
  const headlines = extractSection('Headlines', text).split(/\n[-*]\s*/).filter(Boolean);
  const bodyCopy = extractSection('Body Copy', text).split(/\n[-*]\s*/).filter(Boolean);
  const cta = extractSection('Call to Action', text);
  // Compose the version section
  const children = [
    new Paragraph({
      children: [new TextRun({ text: `Version: ${versionTitle}`, bold: true, color: '2F5496', size: 26 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Description', bold: true, size: 22, color: '222222' })],
    }),
    new Paragraph({ children: [new TextRun({ text: description, size: 20 })], spacing: { after: 40 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Hook/Angle', bold: true, size: 22, color: '222222' })],
    }),
    new Paragraph({ children: [new TextRun({ text: hook, size: 20 })], spacing: { after: 40 } }),
    new Paragraph({
      children: [new TextRun({ text: 'Headlines', bold: true, size: 22, color: '222222' })],
    }),
    ...headlines.map(h => new Paragraph({ text: h, bullet: { level: 0 }, spacing: { after: 20 } })),
    new Paragraph({
      children: [new TextRun({ text: 'Body Copy', bold: true, size: 22, color: '222222' })],
    }),
    ...bodyCopy.map(b => new Paragraph({ text: b, bullet: { level: 0 }, spacing: { after: 20 } })),
    new Paragraph({
      children: [new TextRun({ text: 'Call to Action', bold: true, size: 22, color: '222222' })],
    }),
    new Paragraph({ children: [new TextRun({ text: cta, size: 20 })], spacing: { after: 60 } }),
  ];
  return children;
}

  const doc = new Document({
    sections: [
      {
        children: [
          normalHeading(title, 40),
          new Paragraph({ text: `Generated on ${dateStr}`, spacing: { after: 100 } }),
          blueHeading('Client Information'),
          clientInfoTable,
          blueHeading('Product'),
          new Paragraph({ text: product, spacing: { after: 60 } }),
          blueHeading('Target Audience'),
          new Paragraph({ text: targetAudience, spacing: { after: 60 } }),
          blueHeading('Unique Selling Proposition'),
          new Paragraph({ text: usps, spacing: { after: 60 } }),
          blueHeading('Creative Versions'),
          ...(
            creativeVersions.length > 0
              ? creativeVersions.flatMap(parseCreativeVersionBlock)
              : [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'No creative versions found.',
                        color: '2F5496',
                        bold: true,
                        size: 22,
                      }),
                    ],
                    spacing: { after: 80 },
                  })
                ]
          ),
        ],
      },
    ],
  });

  // --- Generate DOCX Buffer ---
  const buffer = await Packer.toBuffer(doc);
  return buffer;

  } catch (err) {
    console.error('[DOCX] Error generating brief DOCX:', err);
    throw err;
  }
}
import type { Application, Request, Response } from "express";
import * as http from "http";
import { saveBrandInfo, getBrandInfo, updateAudienceInfo, updateOffersInfo, updateVisualAssetsInfo, updateBrandReviewsInfo, updateBrandInfo, patchBrandInfo, type BrandInfo, type AudienceInfo, type OffersInfo, type VisualAssetsInfo, type BrandReviewsInfo } from "./briefInfo.js";
import { analyzeUploadHandler, analyzeVisualAssetsHandler } from './analyzeUpload.js';
import { generateBriefSummaryHandler } from './aiBriefSummary.js';
import reviewAnalysisRouter from './reviewAnalysis.js';
console.log('[Startup] reviewAnalysis router loaded');
import { generateBriefDocx } from './services/docxBriefGenerator.js';

export async function registerRoutes(app: Application): Promise<http.Server> {
  // Mount reviewAnalysis router for brand-reviews endpoints
  app.use('/api/brand-reviews', reviewAnalysisRouter);
  // Visual Strategy Analysis Endpoint
  app.post('/api/visual-assets/analyze', analyzeVisualAssetsHandler);
  // AI File/Image Analysis Endpoint
  app.post('/api/analyze-upload', analyzeUploadHandler);
  // POST /api/briefs/save-section
  app.post("/api/briefs/save-section", (req: Request, res: Response) => {
    const { section, briefId, ...fields } = req.body || {};

    if (section === "audience") {
      const audience: AudienceInfo = {
        ageRange: fields.ageRange,
        gender: fields.gender,
        customerPainPoints: fields.customerPainPoints,
        emotionsToAlignWith: fields.emotionsToAlignWith,
        audienceValuesAndBeliefs: fields.audienceValuesAndBeliefs,
        habitsAndDemographics: fields.habitsAndDemographics,
      };
      if (!audience.ageRange || !audience.customerPainPoints) {
        res.status(400).json({ error: "Missing required audience fields." });
        return;
      }
      if (!briefId || typeof briefId !== "string") {
        res.status(400).json({ error: "Missing or invalid briefId." });
        return;
      }
      const updated = updateAudienceInfo(briefId, audience);
      if (!updated) {
        res.status(404).json({ error: "Brief not found." });
        return;
      }
      res.json({ success: true, briefId });
      return;
    }

    if (section === "offers") {
      if (!briefId || typeof briefId !== "string") {
        res.status(400).json({ error: "Missing or invalid briefId." });
        return;
      }
      const { mainOffer, usps, selectedFormats, enableDiversityOverrides } = fields;
      if (!mainOffer || !Array.isArray(usps) || usps.length < 3) {
        res.status(400).json({ error: "Missing required fields for offers. 'mainOffer' required and 'usps' must be an array of at least 3." });
        return;
      }
      const offers: OffersInfo = { mainOffer, usps, selectedFormats, enableDiversityOverrides };
      const updated = updateOffersInfo(briefId, offers);
      if (!updated) {
        res.status(404).json({ error: "Brief not found or validation failed." });
        return;
      }
      res.json({ success: true, briefId });
      return;
    }

    if (section === "visualAssets") {
      if (!briefId || typeof briefId !== "string") {
        res.status(400).json({ error: "Missing or invalid briefId." });
        return;
      }
      const { images, videos } = fields;
      if (!images || !Array.isArray(images) || images.length === 0) {
        res.status(400).json({ error: "Missing required images array for visualAssets." });
        return;
      }
      const visualAssets: VisualAssetsInfo = { images, videos };
      const updated = updateVisualAssetsInfo(briefId, visualAssets);
      if (!updated) {
        res.status(404).json({ error: "Brief not found." });
        return;
      }
      res.json({ success: true, briefId });
      return;
    }

    if (section === "brandReviews") {
      console.log('[brandReviews] Incoming payload:', { briefId, reviews: fields.reviews });
      if (!briefId || typeof briefId !== "string") {
        console.error('[brandReviews] Missing or invalid briefId:', briefId);
        res.status(400).json({ error: "Missing or invalid briefId." });
        return;
      }
      const { reviews } = fields;
      if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
        console.error('[brandReviews] Missing or invalid reviews array:', reviews);
        res.status(400).json({ error: "Missing required reviews array for brandReviews." });
        return;
      }
      const brandReviews: BrandReviewsInfo = { reviews };
      const updated = updateBrandReviewsInfo(briefId, brandReviews);
      if (!updated) {
        console.error('[brandReviews] updateBrandReviewsInfo failed. Brief not found for id:', briefId);
        res.status(404).json({ error: "Brief not found." });
        return;
      }
      console.log('[brandReviews] Successfully updated brandReviews for briefId:', briefId);
      res.json({ success: true, briefId });
      return;
    }

    // Only require brand info fields if section is not audience
    const { clientName, industry, productUrl, productList, brandGuidelines } = fields;
    const missingFields: string[] = [];
    if (!clientName) missingFields.push("clientName");
    if (!industry) missingFields.push("industry");
    if (!productUrl) missingFields.push("productUrl");
    if (!productList) missingFields.push("productList");
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required field(s): ${missingFields.join(", ")}` });
    }
    const data: BrandInfo = {
      clientName,
      industry,
      productUrl,
      productList,
      brandGuidelines: brandGuidelines || ""
    };
    const newBriefId = saveBrandInfo(data);
    return res.json({ success: true, briefId: newBriefId });
  });

  // POST /api/briefs/:id/generate-summary
  app.post('/api/briefs/:id/generate-summary', generateBriefSummaryHandler);

  // PUT /api/briefs/:id (full update)
  app.put("/api/briefs/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const updated = updateBrandInfo(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Brand Info not found." });
      }
      return res.json({ success: true, briefId: id });
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || "Validation or update failed." });
    }
  });

  // PATCH /api/briefs/:id (partial update)
  app.patch("/api/briefs/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const updated = patchBrandInfo(id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Brand Info not found." });
      }
      return res.json({ success: true, briefId: id });
    } catch (e: any) {
      return res.status(400).json({ error: e?.message || "Validation or update failed." });
    }
  });

  // GET /api/briefs/:id
  app.get("/api/briefs/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const data = getBrandInfo(id);
    if (!data) {
      return res.status(404).json({ error: "Brand Info not found." });
    }
    return res.json(data);
  });

  // GET /api/briefs/:id/summary
  app.get("/api/briefs/:id/summary", (req: Request, res: Response) => {
    const { id } = req.params;
    const data = getBrandInfo(id);
    if (!data) {
      return res.status(404).json({ error: "Brief not found." });
    }
    return res.json({ summary: data });
  });

  // GET /api/briefs/:id/download-docx
  app.get('/api/briefs/:id/download-docx', async (req: Request, res: Response) => {
    const { id } = req.params;
    console.log('[DOCX] Download endpoint hit', id);
    try {
      const buffer = await generateBriefDocx(id);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=Creative_Brief_${id}.docx`);
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Failed to generate DOCX.' });
    }
  });

  const httpServer = http.createServer(app);
  return httpServer;
}

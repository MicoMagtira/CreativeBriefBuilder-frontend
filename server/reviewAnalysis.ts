import express, { Request, Response } from 'express';
import multer from 'multer';
import { analyzeReviewsWithAI } from './services/aiReviewAnalysis.js';
import { saveReviewInsights } from './services/generalStorage.js';

console.log('[Startup] reviewAnalysis router initializing');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB, memory storage

// POST /api/brand-reviews/analyze
router.post('/analyze', upload.single('reviews'), async (req: Request, res: Response) => {
  try {
    // Accept both 'reviews' and 'file' field names
    const file = (req as any).file;
    if (!file) {
      console.error('[AI Review Analysis] ERROR: No file uploaded (expected field name: "reviews" or "file")');
      console.error('[AI Review Analysis] DEBUG req.file:', (req as any).file);
      console.error('[AI Review Analysis] DEBUG req.body:', req.body);
      return res.status(400).json({
        error: 'No file uploaded. Please use field name "reviews" or "file".',
        debug: {
          file: (req as any).file,
          body: req.body
        }
      });
    }
    // Analyze the uploaded reviews file with AI
    const aiInsights = await analyzeReviewsWithAI(file);
    // Store the insights in general storage (e.g., DB)
    await saveReviewInsights(req.body.briefId, aiInsights);
    res.json({ insights: aiInsights });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Failed to analyze reviews' });
  }
});

export default router;

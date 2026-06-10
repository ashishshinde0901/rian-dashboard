import { Router, Request, Response } from 'express';
import { AIKnowledgeService } from '../services/aiKnowledge.js';

const router = Router();

// Initialize AI Knowledge Service
let aiService: AIKnowledgeService | null = null;

function getAIService(): AIKnowledgeService {
  if (!aiService) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured');
    }
    aiService = new AIKnowledgeService(apiKey);
  }
  return aiService;
}

// POST /api/master-ai/chat - Master AI chat endpoint
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const ai = getAIService();
    const result = await ai.answerQuery(query);

    res.json({
      success: true,
      answer: result.answer,
      insights: result.insights,
      chartData: result.chartData,
    });
  } catch (error: any) {
    console.error('Master AI chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/master-ai/sync - Force sync knowledge base
router.post('/sync', async (req: Request, res: Response) => {
  try {
    const accessToken = process.env.ASANA_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({ error: 'ASANA_ACCESS_TOKEN not configured' });
    }

    const ai = getAIService();
    await ai.syncKnowledgeBase(accessToken);

    const stats = ai.getStats();

    res.json({
      success: true,
      message: 'Knowledge base synced successfully',
      stats,
    });
  } catch (error: any) {
    console.error('Knowledge base sync error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/master-ai/stats - Get knowledge base stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    const stats = ai.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Stats error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

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

// POST /api/master-ai/chat - Master AI chat endpoint with conversation support
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { query, conversationId } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    const ai = getAIService();
    const asanaToken = process.env.ASANA_ACCESS_TOKEN;

    // Use conversation-based chat if conversationId provided
    if (conversationId) {
      const result = await ai.answerQueryInConversation(conversationId, query, asanaToken);
      return res.json({
        success: true,
        answer: result.answer,
        insights: result.insights,
        sources: result.sources,
      });
    }

    // Fallback to original answerQuery for backwards compatibility
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

// POST /api/master-ai/conversations - Create new conversation
router.post('/conversations', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    const ai = getAIService();
    const conversation = ai.createConversation(title);

    res.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error('Create conversation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/master-ai/conversations - Get all conversations
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const ai = getAIService();
    const conversations = ai.getConversations();

    res.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error('Get conversations error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/master-ai/conversations/:id - Get specific conversation
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ai = getAIService();
    const conversation = ai.getConversation(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation,
    });
  } catch (error: any) {
    console.error('Get conversation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/master-ai/conversations/:id - Delete conversation
router.delete('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ai = getAIService();
    const deleted = ai.deleteConversation(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      message: 'Conversation deleted',
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;

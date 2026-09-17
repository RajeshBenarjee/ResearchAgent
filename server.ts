import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import Groq from 'groq-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Helper to get Groq instance
function getGroqClient(apiKeyOverride?: string): Groq {
  const apiKey = (apiKeyOverride || process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Groq API Key is required. Please provide it in the UI or set GROQ_API_KEY in environment.');
  }
  return new Groq({ apiKey });
}

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Environment status check
app.get('/api/status', (req: Request, res: Response) => {
  const hasEnvKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
  res.json({
    hasServerKey: hasEnvKey,
    defaultModel: 'llama-3.3-70b-versatile',
  });
});

// Verify API key and return supported models
app.post('/api/verify-key', async (req: Request, res: Response) => {
  try {
    const key = (req.body?.apiKey || req.headers['x-groq-api-key'] || process.env.GROQ_API_KEY || '').toString().trim();
    if (!key) {
      res.status(400).json({ valid: false, error: 'No API key provided.' });
      return;
    }
    const groq = new Groq({ apiKey: key });
    const modelsList = await groq.models.list();
    const chatModels = modelsList.data
      .filter((m) => m.id.includes('llama') || m.id.includes('gemma') || m.id.includes('mixtral'))
      .map((m) => m.id);

    res.json({
      valid: true,
      models: chatModels.length > 0 ? chatModels : ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    });
  } catch (error: any) {
    res.status(401).json({
      valid: false,
      error: error?.message || 'Invalid Groq API key. Please check your credentials.',
    });
  }
});

// RAG Chat endpoint with streaming support
app.post('/api/chat', async (req: Request, res: Response) => {
  const apiKey = (req.headers['x-groq-api-key'] || req.body?.apiKey || process.env.GROQ_API_KEY || '').toString().trim();

  if (!apiKey) {
    res.status(400).json({
      error: 'Groq API Key is missing. Please enter your Groq API key in the settings.',
    });
    return;
  }

  const {
    messages = [],
    retrievedChunks = [],
    model = 'llama-3.3-70b-versatile',
    temperature = 0.2,
  } = req.body;

  try {
    const groq = new Groq({ apiKey });

    // Format retrieved chunks into citation context
    const contextText = retrievedChunks.length > 0
      ? retrievedChunks
          .map(
            (chunk: any, index: number) =>
              `[Source ${index + 1}: "${chunk.docName}", Page ${chunk.pageNumber}]\n${chunk.text.trim()}`
          )
          .join('\n\n---\n\n')
      : 'No research document chunks were retrieved for this query.';

    const systemPrompt = `You are an authoritative research assistant equipped with a Retrieval-Augmented Generation (RAG) system.
Your mission is to provide accurate, rigorous, and evidence-grounded answers to research questions strictly using the provided Document Sources.

CRITICAL CITATION RULES:
1. Every single factual statement, figure, definition, or claim MUST have an inline citation tag matching the source index: e.g. [1], [2], or [1, 3].
2. Place citations immediately following the claim or at the end of the sentence, like: "Self-attention mechanisms calculate dependencies between words directly [1]."
3. NEVER make unsupported assumptions. If the document sources do not contain enough facts to answer part of the question, clearly state: "The provided documents do not contain information regarding [topic]."
4. Keep citations accurate to the provided source numbers [1], [2], etc.
5. In addition to inline citations, conclude your answer with:
### Sources Cited
List each source cited with:
- [Source Index] **Doc Title** (Page X): Brief 1-line summary of how it supports the answer.

RESEARCH DOCUMENT SOURCES:
${contextText}
`;

    const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Set headers for Server-Sent Events (SSE) streaming
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send metadata event with the retrieved sources so client has real-time citation links immediately
    const metaEvent = JSON.stringify({
      type: 'meta',
      sources: retrievedChunks.map((c: any, i: number) => ({
        index: i + 1,
        id: c.id,
        docId: c.docId,
        docName: c.docName,
        pageNumber: c.pageNumber,
        preview: c.text.slice(0, 200),
        fullText: c.text,
        score: c.score,
      })),
    });
    res.write(`data: ${metaEvent}\n\n`);

    const stream = await groq.chat.completions.create({
      model,
      messages: chatMessages,
      temperature: Number(temperature) || 0.2,
      max_completion_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'token', token: content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Groq chat error:', error);
    const errorMsg = error?.message || 'An error occurred while generating the RAG response from Groq.';
    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      res.end();
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Research RAG server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

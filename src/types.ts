export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  pageCount: number;
  pages: DocumentPage[];
  chunksCount: number;
}

export interface TextChunk {
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  chunkIndex: number;
  text: string;
  tokenCount: number;
  score?: number;
}

export interface CitationSource {
  index: number;
  id: string;
  docId: string;
  docName: string;
  pageNumber: number;
  preview: string;
  fullText: string;
  score?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: CitationSource[];
  isStreaming?: boolean;
  modelUsed?: string;
}

export interface GroqSettings {
  apiKey: string;
  model: string;
  temperature: number;
  topK: number;
}

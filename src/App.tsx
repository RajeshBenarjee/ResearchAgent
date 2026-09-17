import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Header } from './components/Header';
import { DocumentManager } from './components/DocumentManager';
import { ChatView } from './components/ChatView';
import { CitationsPanel } from './components/CitationsPanel';
import { ApiKeyModal } from './components/ApiKeyModal';
import { DocumentReaderModal } from './components/DocumentReaderModal';
import { DocumentRecord, TextChunk, ChatMessage, CitationSource, GroqSettings } from './types';
import { chunkDocuments, retrieveChunks } from './utils/ragEngine';
import { getSampleResearchDocuments } from './utils/pdfParser';

const DEFAULT_SETTINGS: GroqSettings = {
  apiKey: '',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.2,
  topK: 5,
};

export default function App() {
  // Settings & Keys
  const [settings, setSettings] = useState<GroqSettings>(() => {
    const savedKey = localStorage.getItem('groq_api_key') || '';
    const savedModel = localStorage.getItem('groq_model') || 'llama-3.3-70b-versatile';
    const savedTopK = Number(localStorage.getItem('groq_top_k')) || 5;
    return {
      apiKey: savedKey,
      model: savedModel,
      temperature: 0.2,
      topK: savedTopK,
    };
  });
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Documents & RAG chunks
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => {
    // Start with pre-loaded benchmark research papers so user can try right away!
    return getSampleResearchDocuments();
  });

  // Chat & Streaming state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Citation inspection & Document Reader modals
  const [selectedCitationSource, setSelectedCitationSource] = useState<CitationSource | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentRecord | null>(null);
  const [readerPageNumber, setReaderPageNumber] = useState<number>(1);
  const [readerHighlightText, setReaderHighlightText] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCitationsPanelOpen, setIsCitationsPanelOpen] = useState(true);

  // Check server environment key on mount
  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => {
        if (data?.hasServerKey) {
          setHasServerKey(true);
        }
      })
      .catch((err) => console.log('Status check:', err));
  }, []);

  // Compute all chunks across all loaded documents
  const allChunks = useMemo<TextChunk[]>(() => {
    return chunkDocuments(documents);
  }, [documents]);

  // Update chunksCount on each document record
  const documentsWithChunkCounts = useMemo(() => {
    return documents.map((doc) => {
      const docChunks = allChunks.filter((c) => c.docId === doc.id);
      return {
        ...doc,
        chunksCount: docChunks.length,
      };
    });
  }, [documents, allChunks]);

  // Latest active assistant sources for the citations panel
  const latestSources = useMemo(() => {
    if (selectedCitationSource) {
      // Find the message that contains this source or find all sources in that message
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role === 'assistant' && m.sources?.some((s) => s.id === selectedCitationSource.id)) {
          return m.sources;
        }
      }
    }
    // Default to sources of the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant' && messages[i].sources && messages[i].sources.length > 0) {
        return messages[i].sources;
      }
    }
    return [];
  }, [messages, selectedCitationSource]);

  // Save settings handler
  const handleSaveSettings = (newSettings: GroqSettings) => {
    setSettings(newSettings);
    localStorage.setItem('groq_api_key', newSettings.apiKey);
    localStorage.setItem('groq_model', newSettings.model);
    localStorage.setItem('groq_top_k', newSettings.topK.toString());
  };

  // Add document handler
  const handleAddDocument = (newDoc: DocumentRecord) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  // Remove document handler
  const handleRemoveDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  // Open Document Reader
  const handleOpenDocumentView = (doc: DocumentRecord, pageNumber: number = 1, highlightText: string = '') => {
    setViewingDocument(doc);
    setReaderPageNumber(pageNumber);
    setReaderHighlightText(highlightText);
  };

  // Handle clicking an interactive citation badge [1]
  const handleOpenSourceCitation = (source: CitationSource) => {
    setSelectedCitationSource(source);
    setIsCitationsPanelOpen(true);
    // Find matching document
    const doc = documents.find((d) => d.id === source.docId || d.name === source.docName);
    if (doc) {
      handleOpenDocumentView(doc, source.pageNumber, source.fullText);
    }
  };

  // Stop streaming handler
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Execute RAG Query
  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim()) return;

    // 1. Add User Message to UI
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString(),
    };

    // 2. Perform BM25 semantic retrieval over all document chunks
    const retrievedChunks = retrieveChunks(queryText, allChunks, settings.topK);

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      modelUsed: settings.model,
      sources: retrievedChunks.map((c, i) => ({
        index: i + 1,
        id: c.id,
        docId: c.docId,
        docName: c.docName,
        pageNumber: c.pageNumber,
        preview: c.text.slice(0, 220),
        fullText: c.text,
        score: c.score,
      })),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': settings.apiKey,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          retrievedChunks,
          model: settings.model,
          temperature: settings.temperature,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.error || `Server responded with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.replace(/^data:\s*/, '');
              try {
                const eventData = JSON.parse(jsonStr);
                if (eventData.type === 'token') {
                  accumulatedContent += eventData.token;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMsgId
                        ? { ...msg, content: accumulatedContent }
                        : msg
                    )
                  );
                } else if (eventData.type === 'error') {
                  throw new Error(eventData.error);
                }
              } catch (e: any) {
                if (e.message !== 'Unexpected end of JSON input') {
                  console.warn('Error parsing SSE event', e);
                }
              }
            }
          }
        }
      }

      // Mark streaming as completed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('User cancelled RAG query.');
      } else {
        console.error('RAG Query error:', err);
        const errMsg = err?.message || 'Failed to generate answer. Please verify your Groq API key and settings.';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `⚠️ **Error Generating Response:**\n${errMsg}\n\n*Please ensure your Groq API key is valid and has available rate limits.*`,
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Top Application Header */}
      <Header
        settings={settings}
        hasServerKey={hasServerKey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        documentCount={documents.length}
        totalChunksCount={allChunks.length}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main 3-Column Studio Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Column: Knowledge Base / PDF Manager */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full'
          }`}
        >
          <DocumentManager
            documents={documentsWithChunkCounts}
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            onSelectDocumentForView={(doc) => handleOpenDocumentView(doc, 1)}
            totalChunksCount={allChunks.length}
          />
        </aside>

        {/* Backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Center Column: Interactive Chat & Real-Time Citations */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          <ChatView
            messages={messages}
            onSendMessage={handleSendMessage}
            isStreaming={isStreaming}
            onStopStreaming={handleStopStreaming}
            settings={settings}
            hasServerKey={hasServerKey}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenSource={handleOpenSourceCitation}
            documents={documents}
            totalChunksCount={allChunks.length}
          />
        </main>

        {/* Right Column: Real-Time Citations Panel (Desktop) */}
        {latestSources && latestSources.length > 0 && isCitationsPanelOpen && (
          <aside className="hidden xl:block w-80 shrink-0 bg-white">
            <CitationsPanel
              sources={latestSources}
              activeSourceIndex={selectedCitationSource?.index || null}
              onSelectSource={(source) => {
                setSelectedCitationSource(source);
                const doc = documents.find((d) => d.id === source.docId || d.name === source.docName);
                if (doc) {
                  handleOpenDocumentView(doc, source.pageNumber, source.fullText);
                }
              }}
              onInspectPage={(source) => {
                const doc = documents.find((d) => d.id === source.docId || d.name === source.docName);
                if (doc) {
                  handleOpenDocumentView(doc, source.pageNumber, source.fullText);
                }
              }}
              onClose={() => setIsCitationsPanelOpen(false)}
            />
          </aside>
        )}
      </div>

      {/* Groq API Key & Retrieval Configuration Modal */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        hasServerKey={hasServerKey}
      />

      {/* Full Document & Page Reader Modal with Highlight */}
      <DocumentReaderModal
        isOpen={Boolean(viewingDocument)}
        onClose={() => setViewingDocument(null)}
        document={viewingDocument}
        targetPageNumber={readerPageNumber}
        highlightText={readerHighlightText}
      />
    </div>
  );
}

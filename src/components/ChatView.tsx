import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Copy, Check, AlertTriangle, Layers, BookOpen, Bot, User, Bookmark } from 'lucide-react';
import { ChatMessage, CitationSource, DocumentRecord, GroqSettings } from '../types';
import { MarkdownWithCitations } from './MarkdownWithCitations';

interface ChatViewProps {
  messages: ChatMessage[];
  onSendMessage: (query: string) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  settings: GroqSettings;
  hasServerKey: boolean;
  onOpenSettings: () => void;
  onOpenSource: (source: CitationSource) => void;
  documents: DocumentRecord[];
  totalChunksCount: number;
}

export function ChatView({
  messages,
  onSendMessage,
  isStreaming,
  onStopStreaming,
  settings,
  hasServerKey,
  onOpenSettings,
  onOpenSource,
  documents,
  totalChunksCount,
}: ChatViewProps) {
  const [inputQuery, setInputQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isKeyConfigured = Boolean(settings.apiKey.trim() || hasServerKey);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || isStreaming) return;

    if (!isKeyConfigured) {
      onOpenSettings();
      return;
    }

    onSendMessage(inputQuery.trim());
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Dynamic suggestion questions based on indexed papers
  const samplePrompts = [
    {
      title: 'Attention Architecture',
      query: 'How does Scaled Dot-Product Attention work and why is the scaling factor 1/sqrt(dk) needed?',
    },
    {
      title: 'RAG Model Comparison',
      query: 'What is the exact mathematical difference between RAG-Sequence and RAG-Token models?',
    },
    {
      title: 'Positional Encodings',
      query: 'Why did the authors choose sinusoidal functions for Positional Encodings in the Transformer?',
    },
    {
      title: 'Dense Passage Retrieval',
      query: 'How does Dense Passage Retrieval (DPR) find relevant Wikipedia passages using MIPS?',
    },
  ];

  return (
    <div id="chat-view-container" className="flex flex-col h-full bg-white relative">
      {/* Missing Key Banner */}
      {!isKeyConfigured && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-between text-xs text-orange-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
            <span>
              Please provide your Groq API key to enable instant LLM reasoning over your PDFs.
            </span>
          </div>
          <button
            id="banner-config-key-btn"
            type="button"
            onClick={onOpenSettings}
            className="font-semibold text-white bg-orange-600 hover:bg-orange-700 px-3 py-1 rounded-lg transition-colors cursor-pointer"
          >
            Enter Key
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-xl mx-auto text-center space-y-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 border border-orange-100 text-orange-600 shadow-sm">
              <Sparkles className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Ask Questions With Real-Time Citations
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                Upload your research PDFs or explore the benchmark papers. Every response is
                synthesized by Groq with interactive citations linked to exact pages and passages.
              </p>
            </div>

            {/* Document status callout */}
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full">
              <BookOpen className="h-3.5 w-3.5 text-orange-600" />
              <span>{documents.length} document(s) loaded ({totalChunksCount} searchable chunks)</span>
            </div>

            {/* Quick Prompts */}
            <div className="w-full space-y-2 pt-2 text-left">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Suggested Research Questions
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {samplePrompts.map((item, idx) => (
                  <button
                    key={idx}
                    id={`prompt-suggestion-${idx}`}
                    type="button"
                    onClick={() => {
                      if (!isKeyConfigured) {
                        onOpenSettings();
                      } else {
                        onSendMessage(item.query);
                      }
                    }}
                    className="p-3 text-left rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all group bg-white cursor-pointer shadow-2xs"
                  >
                    <p className="text-xs font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                      {item.query}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                id={`message-bubble-${message.id}`}
                className={`flex gap-3 sm:gap-4 max-w-3xl ${isUser ? 'ml-auto' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                    isUser
                      ? 'bg-slate-900 text-white order-2'
                      : 'bg-orange-600 text-white shadow-2xs'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Body Card */}
                <div
                  className={`flex flex-col space-y-2 flex-1 rounded-2xl p-4 sm:p-5 border transition-all ${
                    isUser
                      ? 'bg-slate-900 text-white border-slate-800 order-1 rounded-tr-xs'
                      : 'bg-white text-slate-900 border-slate-200/90 shadow-xs rounded-tl-xs'
                  }`}
                >
                  {/* Top Metadata */}
                  <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-100/10">
                    <span className={`font-semibold ${isUser ? 'text-slate-300' : 'text-slate-600'}`}>
                      {isUser ? 'You' : 'Research Assistant'}
                    </span>
                    <div className="flex items-center gap-2">
                      {!isUser && message.modelUsed && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {message.modelUsed}
                        </span>
                      )}
                      {!isUser && message.content && (
                        <button
                          type="button"
                          onClick={() => handleCopy(message.id, message.content)}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Message Content */}
                  {isUser ? (
                    <p className="text-sm font-normal leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="pt-1">
                      {message.content ? (
                        <MarkdownWithCitations
                          content={message.content}
                          sources={message.sources || []}
                          onOpenSource={onOpenSource}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
                          <span className="h-2 w-2 rounded-full bg-orange-500 animate-ping"></span>
                          Searching documents and synthesizing answer...
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sources Bar at the bottom of Assistant message */}
                  {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <Bookmark className="h-3.5 w-3.5 text-orange-600" />
                          Retrieved Sources ({message.sources.length})
                        </span>
                        <span className="text-[10px] text-slate-400">Click to view in document</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {message.sources.map((s) => (
                          <button
                            key={`source-pill-${message.id}-${s.index}`}
                            id={`source-pill-${s.index}`}
                            type="button"
                            onClick={() => onOpenSource(s)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-xs text-slate-700 hover:text-orange-700 transition-all cursor-pointer"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-orange-600 text-white text-[10px] font-bold">
                              {s.index}
                            </span>
                            <span className="font-medium truncate max-w-[120px]">{s.docName}</span>
                            <span className="text-slate-400 text-[10px]">p.{s.pageNumber}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-2">
          <div className="relative flex items-end rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-200 transition-all shadow-2xs">
            <textarea
              id="rag-query-textarea"
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => {
                setInputQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                totalChunksCount === 0
                  ? 'Please upload a PDF or load sample benchmark papers first...'
                  : 'Ask a question grounded in your research documents (e.g. "What is Scaled Dot-Product Attention?")...'
              }
              className="w-full resize-none border-0 bg-transparent px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none max-h-36 overflow-y-auto"
            />

            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              {isStreaming ? (
                <button
                  id="stop-streaming-btn"
                  type="button"
                  onClick={onStopStreaming}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors cursor-pointer"
                >
                  Stop
                </button>
              ) : (
                <button
                  id="send-rag-query-btn"
                  type="submit"
                  disabled={!inputQuery.trim() || totalChunksCount === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs hover:bg-orange-700 disabled:opacity-40 transition-all cursor-pointer"
                  title="Send Query"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3 text-slate-400" />
                RAG Engine: Top {settings.topK} Chunks
              </span>
              <span>•</span>
              <span className="font-mono">{settings.model}</span>
            </div>
            <span>Press Enter to send, Shift+Enter for newline</span>
          </div>
        </form>
      </div>
    </div>
  );
}

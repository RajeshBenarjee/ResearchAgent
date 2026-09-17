import React from 'react';
import { KeyRound, Sparkles, SlidersHorizontal, BookOpen, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { GroqSettings } from '../types';

interface HeaderProps {
  settings: GroqSettings;
  hasServerKey: boolean;
  onOpenSettings: () => void;
  documentCount: number;
  totalChunksCount: number;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({
  settings,
  hasServerKey,
  onOpenSettings,
  documentCount,
  totalChunksCount,
  isSidebarOpen,
  onToggleSidebar,
}: HeaderProps) {
  const isKeyConfigured = Boolean(settings.apiKey.trim() || hasServerKey);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 py-3">
      {/* Left: Brand & Sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          id="toggle-sidebar-btn"
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          title="Toggle Document Library"
        >
          <BookOpen className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 leading-none">Research RAG</h1>
              <span className="hidden sm:inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 border border-orange-200">
                Groq LPU Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-none">
              Evidence-based PDF synthesis with real-time citations
            </p>
          </div>
        </div>
      </div>

      {/* Right: Status Badges & Key Config */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Knowledge Base Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 border border-slate-200 text-xs text-slate-600">
          <Layers className="h-3.5 w-3.5 text-orange-600" />
          <span className="font-semibold text-slate-800">{documentCount}</span> {documentCount === 1 ? 'doc' : 'docs'}
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">{totalChunksCount} chunks</span>
        </div>

        {/* Model Badge */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
          <span className="truncate max-w-[140px]">{settings.model}</span>
        </div>

        {/* Groq Key Status / Settings Trigger */}
        <button
          id="open-groq-key-btn"
          type="button"
          onClick={onOpenSettings}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
            isKeyConfigured
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80'
              : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm animate-pulse'
          }`}
        >
          {isKeyConfigured ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Groq Key Connected</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Enter Groq Key</span>
            </>
          )}
          <SlidersHorizontal className="h-3 w-3 ml-0.5 opacity-60" />
        </button>
      </div>
    </header>
  );
}

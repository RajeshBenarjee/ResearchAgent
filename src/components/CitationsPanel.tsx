import React from 'react';
import { FileText, ExternalLink, Bookmark, ShieldCheck, X } from 'lucide-react';
import { CitationSource } from '../types';

interface CitationsPanelProps {
  sources: CitationSource[];
  activeSourceIndex: number | null;
  onSelectSource: (source: CitationSource) => void;
  onInspectPage: (source: CitationSource) => void;
  onClose?: () => void;
}

export function CitationsPanel({
  sources,
  activeSourceIndex,
  onSelectSource,
  onInspectPage,
  onClose,
}: CitationsPanelProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div id="citations-panel-container" className="flex flex-col h-full bg-white border-l border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/70">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
            <Bookmark className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Real-Time Citations</h3>
            <p className="text-[11px] text-slate-500">
              {sources.length} retrieved {sources.length === 1 ? 'passage' : 'passages'}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sources List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sources.map((source) => {
          const isSelected = activeSourceIndex === source.index;
          return (
            <div
              key={`panel-source-${source.id || source.index}`}
              id={`citation-card-${source.index}`}
              onClick={() => onSelectSource(source)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'border-orange-500 bg-orange-50/50 shadow-xs ring-1 ring-orange-300'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-orange-600 text-white font-bold text-[10px]">
                    {source.index}
                  </span>
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[140px]" title={source.docName}>
                    {source.docName}
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Page {source.pageNumber}
                </span>
              </div>

              {/* Exact Excerpt */}
              <p className="mt-2.5 text-xs text-slate-600 font-serif leading-relaxed line-clamp-4 italic">
                "{source.fullText || source.preview}"
              </p>

              {/* Actions & Provenance */}
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-emerald-700 font-medium text-[10px]">
                  <ShieldCheck className="h-3 w-3" />
                  Grounded match
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInspectPage(source);
                  }}
                  className="text-orange-600 hover:text-orange-700 font-semibold inline-flex items-center gap-1 hover:underline cursor-pointer"
                >
                  Inspect in PDF <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

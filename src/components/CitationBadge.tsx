import React, { useState } from 'react';
import { CitationSource } from '../types';
import { FileText, ArrowUpRight } from 'lucide-react';

interface CitationBadgeProps {
  sourceIndex: number;
  source?: CitationSource;
  onOpenSource: (source: CitationSource) => void;
}

export function CitationBadge({ sourceIndex, source, onOpenSource }: CitationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!source) {
    return (
      <span className="inline-flex items-center text-xs font-semibold px-1.5 py-0.2 mx-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
        [{sourceIndex}]
      </span>
    );
  }

  return (
    <span
      className="relative inline-block mx-0.5 align-baseline"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        id={`citation-badge-${sourceIndex}`}
        type="button"
        onClick={() => onOpenSource(source)}
        className="inline-flex items-center justify-center text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-orange-100/90 text-orange-700 hover:bg-orange-600 hover:text-white border border-orange-200 shadow-2xs transition-all cursor-pointer"
        title={`Source [${sourceIndex}]: ${source.docName} (p. ${source.pageNumber})`}
      >
        [{sourceIndex}]
      </button>

      {/* Floating Hover Tooltip Card */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-white text-xs rounded-xl shadow-xl z-50 pointer-events-auto border border-slate-700 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between gap-1 text-[11px] text-orange-300 font-medium pb-1.5 border-b border-slate-800">
            <span className="flex items-center gap-1 truncate">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{source.docName}</span>
            </span>
            <span className="shrink-0 bg-slate-800 px-1.5 py-0.5 rounded text-[10px] text-slate-300">
              Page {source.pageNumber}
            </span>
          </div>
          <p className="mt-2 text-slate-300 text-[11px] leading-relaxed line-clamp-4 italic">
            "{source.preview || source.fullText.slice(0, 180)}..."
          </p>
          <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Match Score: {source.score || 'High'}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSource(source);
              }}
              className="text-orange-400 hover:text-orange-300 font-semibold inline-flex items-center gap-0.5"
            >
              Open Page <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </span>
  );
}

import React, { useState, useEffect } from 'react';
import { X, FileText, ChevronLeft, ChevronRight, Bookmark, Search } from 'lucide-react';
import { DocumentRecord } from '../types';

interface DocumentReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  targetPageNumber?: number;
  highlightText?: string;
}

export function DocumentReaderModal({
  isOpen,
  onClose,
  document,
  targetPageNumber,
  highlightText,
}: DocumentReaderModalProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (targetPageNumber && targetPageNumber > 0) {
      setCurrentPage(targetPageNumber);
    } else {
      setCurrentPage(1);
    }
  }, [targetPageNumber, document, isOpen]);

  if (!isOpen || !document) return null;

  const totalPages = document.pages.length;
  const pageObj = document.pages.find((p) => p.pageNumber === currentPage) || document.pages[0];
  const pageContent = pageObj ? pageObj.text : 'Page content not found.';

  // Highlight helper
  const renderHighlightedContent = (text: string) => {
    const termToHighlight = searchQuery.trim() || highlightText?.trim();
    if (!termToHighlight || termToHighlight.length < 3) {
      return <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm">{text}</div>;
    }

    // Try finding close matching segment or keywords
    const keywords = termToHighlight
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 8);

    if (!keywords.length) {
      return <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm">{text}</div>;
    }

    // Highlighting regex
    const pattern = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
      <div className="whitespace-pre-wrap font-serif text-slate-800 leading-relaxed text-sm">
        {parts.map((part, idx) => {
          const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <mark key={idx} className="bg-amber-200 text-amber-950 font-semibold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          );
        })}
      </div>
    );
  };

  return (
    <div
      id="document-reader-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6"
    >
      <div className="relative flex flex-col w-full max-w-3xl h-[85vh] rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">{document.name}</h2>
              <p className="text-xs text-slate-500">
                Page {currentPage} of {totalPages} • Full Document Inspector
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in page..."
                className="rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <button
              id="close-reader-btn"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {highlightText && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between text-xs text-amber-900">
            <span className="flex items-center gap-1.5 font-medium truncate">
              <Bookmark className="h-3.5 w-3.5 text-amber-700 shrink-0" />
              Cited passage highlighted on Page {currentPage}
            </span>
            <span className="text-[11px] text-amber-700">Verified Citation Provenance</span>
          </div>
        )}

        {/* Page Content View */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/40">
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-xs border border-slate-200/80 min-h-[500px]">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 text-xs text-slate-400">
              <span>{document.name}</span>
              <span>PAGE {currentPage}</span>
            </div>
            {renderHighlightedContent(pageContent)}
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-white">
          <div className="flex items-center gap-2">
            <button
              id="prev-page-btn"
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-xs font-medium text-slate-600 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              id="next-page-btn"
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Done Reading
          </button>
        </div>
      </div>
    </div>
  );
}

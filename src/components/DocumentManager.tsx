import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, BookOpen, AlertCircle, Loader2, Sparkles, Layers } from 'lucide-react';
import { DocumentRecord } from '../types';
import { extractTextFromPdf, getSampleResearchDocuments } from '../utils/pdfParser';

interface DocumentManagerProps {
  documents: DocumentRecord[];
  onAddDocument: (doc: DocumentRecord) => void;
  onRemoveDocument: (docId: string) => void;
  onSelectDocumentForView: (doc: DocumentRecord) => void;
  totalChunksCount: number;
}

export function DocumentManager({
  documents,
  onAddDocument,
  onRemoveDocument,
  onSelectDocumentForView,
  totalChunksCount,
}: DocumentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('Please upload a PDF document (.pdf).');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const pages = await extractTextFromPdf(file);
      if (!pages.length) {
        throw new Error('No readable text content could be extracted from this PDF.');
      }

      const newDoc: DocumentRecord = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        uploadDate: new Date().toISOString(),
        pageCount: pages.length,
        pages,
        chunksCount: 0, // Will be computed in parent state
      };

      onAddDocument(newDoc);
    } catch (err: any) {
      console.error('PDF extraction error:', err);
      setErrorMessage(err?.message || 'Failed to parse PDF document. Please try another PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');

    if (!pdfFiles.length) {
      setErrorMessage('No valid PDF files were dropped.');
      return;
    }

    for (const f of pdfFiles) {
      await processFile(f);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
      await processFile(files[i]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSamples = () => {
    const samples = getSampleResearchDocuments();
    for (const sample of samples) {
      if (!documents.some((d) => d.name === sample.name)) {
        onAddDocument(sample);
      }
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div id="document-manager-container" className="flex flex-col h-full bg-slate-50/70 border-r border-slate-200">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <h2 className="text-sm font-bold tracking-tight text-slate-900">Knowledge Base</h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            {documents.length} {documents.length === 1 ? 'doc' : 'docs'}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            {totalChunksCount} searchable chunks
          </span>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-4 space-y-3">
        <div
          id="pdf-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
            isDragging
              ? 'border-orange-500 bg-orange-50/80 scale-[1.01]'
              : 'border-slate-300 hover:border-orange-400 bg-white hover:bg-orange-50/20'
          }`}
        >
          <input
            id="pdf-file-input"
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          {isProcessing ? (
            <div className="flex flex-col items-center py-2 space-y-2 text-orange-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-xs font-medium">Extracting PDF pages & tokens...</p>
            </div>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-100 transition-colors mb-2">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Click or drag & drop research PDFs
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports multi-page research papers & reports
              </p>
            </>
          )}
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Load Sample Paper Quick Action */}
        <button
          id="load-sample-papers-btn"
          type="button"
          onClick={handleLoadSamples}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5 text-orange-600" />
          Load Benchmark Papers (Vaswani / Lewis)
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 px-1">
          Indexed Documents ({documents.length})
        </p>

        {documents.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 bg-white/60">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">No PDFs indexed yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Upload a PDF or click above to load benchmark papers.
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              id={`doc-card-${doc.id}`}
              className="group relative flex flex-col p-3 rounded-xl border border-slate-200 bg-white hover:border-orange-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex items-start gap-2 min-w-0 cursor-pointer flex-1"
                  onClick={() => onSelectDocumentForView(doc)}
                  title="Click to view full pages and text"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 mt-0.5">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-orange-600 transition-colors">
                      {doc.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <span>{doc.pageCount} {doc.pageCount === 1 ? 'page' : 'pages'}</span>
                      <span>•</span>
                      <span>{formatBytes(doc.size)}</span>
                      <span>•</span>
                      <span className="text-orange-600/80 font-medium">{doc.chunksCount} chunks</span>
                    </div>
                  </div>
                </div>

                <button
                  id={`remove-doc-${doc.id}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDocument(doc.id);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Remove document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => onSelectDocumentForView(doc)}
                  className="text-orange-600 hover:text-orange-700 font-medium hover:underline cursor-pointer"
                >
                  Inspect Text & Pages →
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

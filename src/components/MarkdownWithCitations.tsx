import React from 'react';
import ReactMarkdown from 'react-markdown';
import { CitationSource } from '../types';
import { CitationBadge } from './CitationBadge';

interface MarkdownWithCitationsProps {
  content: string;
  sources?: CitationSource[];
  onOpenSource: (source: CitationSource) => void;
}

export function MarkdownWithCitations({
  content,
  sources = [],
  onOpenSource,
}: MarkdownWithCitationsProps) {
  // Replace citation markers like [1], [2], [1, 2], [Source 1, Page 2]
  // with a token we can render as an interactive CitationBadge
  const citationRegex = /\[(?:Source\s+)?(\d+)(?::[^\]]*)?(?:,\s*(\d+))?\]/g;

  // Custom text processor
  const renderTextWithCitations = (text: string) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const regex = new RegExp(citationRegex.source, 'g');
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      // Group 1 is the first index, Group 2 may be a second index
      const idx1 = parseInt(match[1], 10);
      const idx2 = match[2] ? parseInt(match[2], 10) : null;

      const source1 = sources.find((s) => s.index === idx1);
      parts.push(
        <CitationBadge
          key={`cite-${idx1}-${matchIndex}`}
          sourceIndex={idx1}
          source={source1}
          onOpenSource={onOpenSource}
        />
      );

      if (idx2) {
        const source2 = sources.find((s) => s.index === idx2);
        parts.push(
          <CitationBadge
            key={`cite-${idx2}-${matchIndex}`}
            sourceIndex={idx2}
            source={source2}
            onOpenSource={onOpenSource}
          />
        );
      }

      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-800">
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            return (
              <p className="mb-3 leading-relaxed last:mb-0">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderTextWithCitations(child);
                  }
                  return child;
                })}
              </p>
            );
          },
          li: ({ children }) => {
            return (
              <li className="mb-1">
                {React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return renderTextWithCitations(child);
                  }
                  return child;
                })}
              </li>
            );
          },
          h1: ({ children }) => <h1 className="text-lg font-bold text-slate-900 mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-slate-900 mt-3 mb-1.5">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-slate-900 mt-3 mb-1">{children}</h3>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-orange-700">
              {children}
            </code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-orange-400 pl-3 italic text-slate-600 my-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

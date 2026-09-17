import { DocumentRecord, TextChunk } from '../types';

/**
 * Clean and tokenize text for BM25 retrieval
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((term) => term.length > 1);
}

/**
 * Split document pages into overlapping semantic chunks
 */
export function chunkDocuments(
  documents: DocumentRecord[],
  chunkSize: number = 650,
  chunkOverlap: number = 120
): TextChunk[] {
  const allChunks: TextChunk[] = [];

  for (const doc of documents) {
    let globalChunkIdx = 0;

    for (const page of doc.pages) {
      const pageText = page.text.trim();
      if (!pageText) continue;

      // Split into paragraphs / sentences
      const paragraphs = pageText.split(/\n\s*\n/);
      let currentBuffer = '';

      for (const para of paragraphs) {
        const cleanPara = para.replace(/\s+/g, ' ').trim();
        if (!cleanPara) continue;

        if (currentBuffer.length + cleanPara.length < chunkSize) {
          currentBuffer += (currentBuffer ? ' ' : '') + cleanPara;
        } else {
          // If paragraph alone is huge, split by sentences
          if (cleanPara.length > chunkSize) {
            const sentences = cleanPara.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [cleanPara];
            for (const sentence of sentences) {
              if (currentBuffer.length + sentence.length > chunkSize && currentBuffer.length > 100) {
                allChunks.push({
                  id: `${doc.id}-p${page.pageNumber}-c${globalChunkIdx++}`,
                  docId: doc.id,
                  docName: doc.name,
                  pageNumber: page.pageNumber,
                  chunkIndex: globalChunkIdx,
                  text: currentBuffer.trim(),
                  tokenCount: Math.ceil(currentBuffer.split(/\s+/).length * 1.3),
                });
                // Overlap: keep tail of buffer
                const words = currentBuffer.split(' ');
                currentBuffer = words.slice(-Math.floor(chunkOverlap / 6)).join(' ') + ' ' + sentence.trim();
              } else {
                currentBuffer += (currentBuffer ? ' ' : '') + sentence.trim();
              }
            }
          } else {
            allChunks.push({
              id: `${doc.id}-p${page.pageNumber}-c${globalChunkIdx++}`,
              docId: doc.id,
              docName: doc.name,
              pageNumber: page.pageNumber,
              chunkIndex: globalChunkIdx,
              text: currentBuffer.trim(),
              tokenCount: Math.ceil(currentBuffer.split(/\s+/).length * 1.3),
            });
            const words = currentBuffer.split(' ');
            currentBuffer = words.slice(-Math.floor(chunkOverlap / 6)).join(' ') + ' ' + cleanPara;
          }
        }
      }

      if (currentBuffer.trim().length > 60) {
        allChunks.push({
          id: `${doc.id}-p${page.pageNumber}-c${globalChunkIdx++}`,
          docId: doc.id,
          docName: doc.name,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIdx,
          text: currentBuffer.trim(),
          tokenCount: Math.ceil(currentBuffer.split(/\s+/).length * 1.3),
        });
      }
    }
  }

  return allChunks;
}

/**
 * Retrieve most relevant chunks using Okapi BM25 ranking with phrase boost
 */
export function retrieveChunks(
  query: string,
  chunks: TextChunk[],
  topK: number = 5
): TextChunk[] {
  if (!chunks.length || !query.trim()) return [];

  const queryTerms = tokenize(query);
  if (!queryTerms.length) return chunks.slice(0, topK);

  const N = chunks.length;
  // Tokenize all chunks
  const chunkTokens = chunks.map((c) => tokenize(c.text));
  const avgdl = chunkTokens.reduce((sum, tokens) => sum + tokens.length, 0) / (N || 1);

  // Calculate Document Frequencies (DF)
  const df: Record<string, number> = {};
  for (const tokens of chunkTokens) {
    const uniqueTokens = new Set(tokens);
    for (const token of uniqueTokens) {
      df[token] = (df[token] || 0) + 1;
    }
  }

  // Calculate IDF for query terms
  const idf: Record<string, number> = {};
  for (const term of queryTerms) {
    const docFreq = df[term] || 0;
    // Standard BM25 IDF formulation
    idf[term] = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
  }

  // BM25 parameters
  const k1 = 1.2;
  const b = 0.75;
  const lowerQuery = query.toLowerCase().trim();

  // Score each chunk
  const scoredChunks = chunks.map((chunk, idx) => {
    const tokens = chunkTokens[idx];
    const docLen = tokens.length;
    let score = 0;

    // Term Frequency (TF)
    const tf: Record<string, number> = {};
    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    for (const term of queryTerms) {
      if (!tf[term]) continue;
      const termTf = tf[term];
      const termIdf = idf[term] || 0;
      const numerator = termTf * (k1 + 1);
      const denominator = termTf + k1 * (1 - b + b * (docLen / (avgdl || 1)));
      score += termIdf * (numerator / denominator);
    }

    // Exact phrase bonus
    const lowerText = chunk.text.toLowerCase();
    if (lowerQuery.length > 5 && lowerText.includes(lowerQuery)) {
      score += 4.5;
    } else {
      // Check 2-word n-gram matches
      for (let i = 0; i < queryTerms.length - 1; i++) {
        const bigram = `${queryTerms[i]} ${queryTerms[i + 1]}`;
        if (lowerText.includes(bigram)) {
          score += 1.5;
        }
      }
    }

    return {
      ...chunk,
      score: Math.round(score * 100) / 100,
    };
  });

  // Sort descending by score
  const sorted = scoredChunks
    .filter((c) => (c.score || 0) > 0.05)
    .sort((a, b) => (b.score || 0) - (a.score || 0));

  // If matches found, return top K; otherwise return the first few as fallback
  return (sorted.length > 0 ? sorted : chunks).slice(0, topK);
}

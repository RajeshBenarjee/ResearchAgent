import * as pdfjsLib from 'pdfjs-dist';
import { DocumentPage, DocumentRecord } from '../types';

// Initialize PDF.js worker
if (typeof window !== 'undefined') {
  try {
    // Use worker from standard CDN matched to pdfjs-dist version
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set workerSrc via cdnjs, fallback to unpkg', e);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

/**
 * Extract pages and full text from an uploaded PDF File
 */
export async function extractTextFromPdf(file: File): Promise<DocumentPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const pages: DocumentPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items with appropriate spacing
    let lastY: number | null = null;
    let pageText = '';

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] };
        const currentY = textItem.transform[5];
        
        if (lastY !== null && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' ';
        }
        pageText += textItem.str;
        lastY = currentY;
      }
    }

    const cleanedText = pageText
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();

    pages.push({
      pageNumber: pageNum,
      text: cleanedText.length > 0 ? cleanedText : `[Page ${pageNum}: Image or Non-textual content]`,
    });
  }

  return pages;
}

/**
 * Pre-packaged seminal research papers for immediate out-of-the-box exploration
 */
export function getSampleResearchDocuments(): DocumentRecord[] {
  return [
    {
      id: 'doc-attention-2017',
      name: 'Attention_Is_All_You_Need_Vaswani2017.pdf',
      size: 512000,
      uploadDate: new Date().toISOString(),
      pageCount: 4,
      chunksCount: 0,
      pages: [
        {
          pageNumber: 1,
          text: `Attention Is All You Need
Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, Illia Polosukhin
Google Brain, Google Research, University of Toronto

Abstract:
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.

1. Introduction
Recurrent neural networks, long short-term memory (LSTM) and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states ht, as a function of the previous hidden state ht-1 and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.`
        },
        {
          pageNumber: 2,
          text: `3. Model Architecture
Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations (x1, ..., xn) to a sequence of continuous representations z = (z1, ..., zn). Given z, the decoder then generates an output sequence (y1, ..., ym) of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.

3.1 Encoder and Decoder Stacks
Encoder: The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)), where Sublayer(x) is the function implemented by the sub-layer itself. To facilitate these residual connections, all sub-layers in the model, as well as the embedding layers, produce outputs of dimension dmodel = 512.

Decoder: The decoder is also composed of a stack of N = 6 identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack. Similar to the encoder, we employ residual connections around each of the sub-layers, followed by layer normalization. We also modify the self-attention sub-layer in the decoder stack to prevent positions from attending to subsequent positions. This masking ensures that the predictions for position i can depend only on the known outputs at positions less than i.`
        },
        {
          pageNumber: 3,
          text: `3.2 Attention
An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.

3.2.1 Scaled Dot-Product Attention
We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension dk, and values of dimension dv. We compute the dot products of the query with all keys, divide each by sqrt(dk), and apply a softmax function to obtain the weights on the values. In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed into matrices K and V. We compute the matrix of outputs as:
Attention(Q, K, V) = softmax(Q * K^T / sqrt(dk)) * V

We compute the dot product attention with a scaling factor of 1 / sqrt(dk). For large values of dk, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients. To counteract this effect, we scale the dot products by 1 / sqrt(dk).

3.2.2 Multi-Head Attention
Instead of performing a single attention function with dmodel-dimensional queries, keys and values, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to dk, dk and dv dimensions, respectively. On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding dv-dimensional output values. These are concatenated and once again projected, resulting in the final values. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions:
MultiHead(Q, K, V) = Concat(head1, ..., headh) * W^O
where headi = Attention(Q * W_i^Q, K * W_i^K, V * W_i^V)`
        },
        {
          pageNumber: 4,
          text: `3.5 Positional Encoding
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add "positional encodings" to the input embeddings at the bottoms of the encoder and decoder stacks. The positional encodings have the same dimension dmodel as the embeddings, so that the two can be summed. There are many choices of positional encodings, learned and fixed.
In this work, we use sine and cosine functions of different frequencies:
PE(pos, 2i) = sin(pos / 10000^(2i / dmodel))
PE(pos, 2i+1) = cos(pos / 10000^(2i / dmodel))
where pos is the position and i is the dimension. That is, each dimension of the positional encoding corresponds to a sinusoid. The wavelengths form a geometric progression from 2*pi to 10000 * 2*pi. We chose this version because we hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset k, PE(pos+k) can be represented as a linear function of PE(pos).

5. Training & Results
We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. On the WMT 2014 English-to-German translation task, the big transformer model achieves BLEU 28.4, outperforming existing models by over 2 BLEU. On English-to-French, our big model achieves a BLEU score of 41.8, outperforming all previously published single models at 1/4 the training cost of the previous state-of-the-art models.`
        }
      ]
    },
    {
      id: 'doc-rag-2020',
      name: 'Retrieval_Augmented_Generation_Lewis2020.pdf',
      size: 480000,
      uploadDate: new Date().toISOString(),
      pageCount: 3,
      chunksCount: 0,
      pages: [
        {
          pageNumber: 1,
          text: `Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks
Patrick Lewis, Ethan Perez, Aleksandra Piktus, Fabio Petroni, Vladimir Karpukhin, Naman Goyal, Heinrich Küttler, Mike Lewis, Scott Yih, Tim Rocktäschel, Sebastian Riedel, Douwe Kiela
Facebook AI Research, University College London, New York University

Abstract:
Large pre-trained language models have been shown to store factual knowledge in their parameters, and achieve state-of-the-art results when fine-tuned on downstream NLP tasks. However, their ability to access and precisely manipulate knowledge is still limited, and on knowledge-intensive tasks, their performance falls behind task-specific architectures. Additionally, providing provenance for their decisions and updating their world knowledge remain open research problems. Pre-trained models with a differentiable access mechanism to explicit non-parametric memory (such as Wikipedia) can address this issue. We explore a general-purpose fine-tuning recipe for retrieval-augmented generation (RAG) — models which combine pre-trained parametric and non-parametric memory for language generation. We introduce RAG models where the parametric memory is a pre-trained seq2seq model and the non-parametric memory is a dense vector index of Wikipedia, accessed with a pre-trained neural retriever. We compare two formulations: one that conditions on the same retrieved passages across the whole generated sequence, and another that can use different passages per token. We evaluate our models on a wide range of knowledge-intensive tasks and achieve new state-of-the-art results on Open-Domain QA.`
        },
        {
          pageNumber: 2,
          text: `2. Methods and Architecture
RAG models utilize two primary components: a retriever p_eta(z|x) with parameters eta that returns top-K truncated distributions over text passages given a query x, and a generator p_theta(y_i|x, z, y_{1:i-1}) parametrized by theta that generates the current token based on a context of the previous 1:i-1 tokens, the original input x, and a retrieved passage z.

2.1 Non-Parametric Memory: Dense Passage Retriever (DPR)
The retrieval component p_eta(z|x) is based on Dense Passage Retrieval (DPR). DPR uses a bi-encoder architecture:
p_eta(z|x) proportional to exp(d(z)^T * q(x))
where d(z) = BERT_d(z) is a dense passage representation produced by a document encoder, and q(x) = BERT_q(x) is a query representation produced by a query encoder. Finding the top-k passages with highest prior probability p_eta(z|x) is a Maximum Inner Product Search (MIPS) problem, which can be solved in sub-linear time using Fast Approximate Nearest Neighbors (FAISS).

2.2 Parametric Generator: BART
The generator component is based on BART-large, a pre-trained sequence-to-sequence model with 400M parameters. To combine the input x with a retrieved passage z when generating from BART, we simply concatenate them: [x, z]. BART is fine-tuned to produce target tokens conditioned on both the query and the retrieved passage.`
        },
        {
          pageNumber: 3,
          text: `2.3 RAG-Sequence vs. RAG-Token Models
We propose two ways to marginalize over the retrieved documents to generate text:

1. RAG-Sequence Model:
In the RAG-Sequence model, the same document is used to predict each target token. The top-K documents are retrieved, and the generator produces an output sequence probability for each document, which are then marginalized:
p_RAG-Seq(y|x) = sum_{z in top-k} p_eta(z|x) * prod_i p_theta(y_i | x, z, y_{1:i-1})

2. RAG-Token Model:
In the RAG-Token model, the generator can draw content from different documents for each token:
p_RAG-Token(y|x) = prod_i sum_{z in top-k} p_eta(z|x) * p_theta(y_i | x, z, y_{1:i-1})
This allows the generator to synthesize information from multiple distinct documents when constructing an answer.

4. Empirical Results
On Open-Domain Question Answering benchmarks (Natural Questions, TriviaQA, and WebQuestions), RAG achieves top performance, outperforming previous parametric-only models like T5-11B while using significantly fewer parameters. In human evaluations, RAG generations were found to be more factual and specific than those of purely parametric baselines, and human evaluators favored RAG's provenance because inline citations and source documents could be verified in real time.`
        }
      ]
    }
  ];
}

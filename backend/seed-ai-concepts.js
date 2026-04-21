/**
 * Seed AI / RAG / embedding concepts into MongoDB so the chat RAG path can
 * retrieve them. Safe to re-run: upserts by topic.
 * Run: node seed-ai-concepts.js
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const { KnowledgeEntry, DirectAnswer } = require('./models/Knowledge');
const { embed } = require('./services/embeddings');

function buildEmbeddingText(entry) {
  return [entry.title, entry.topic, entry.summary, (entry.keywords || []).join(' ')]
    .filter(Boolean).join('\n');
}

const ENTRIES = [
  {
    topic: 'rag', category: 'AI & Machine Learning',
    keywords: ['rag', 'retrieval augmented generation', 'retrieval-augmented generation', 'explain rag', 'what is rag', 'rag pipeline', 'rag architecture', 'how rag works'],
    title: 'RAG — Retrieval-Augmented Generation',
    summary: 'RAG grounds an AI answer in documents retrieved at query time. The system searches a knowledge base for passages related to the question, then feeds them to the model (or composes directly) so the answer is accurate, up-to-date, and source-backed.',
    details: `## The pipeline (3 stages)

1. **Index** (one-time) — chunk your corpus, embed each chunk with a model like MiniLM or OpenAI ada, store vectors in a DB (MongoDB, Pinecone, pgvector, Weaviate).
2. **Retrieve** — embed the user's question with the same model, cosine-similarity against stored vectors, keep top-k (usually 3-10).
3. **Generate** — stuff retrieved chunks into the LLM prompt as context, ask the model to answer using only that context. Return with optional source citations.

## Why RAG beats fine-tuning for factual knowledge
- **Fresh**: add a doc → re-index that one doc → answerable. No training run.
- **Traceable**: each claim points back to specific source chunks.
- **Cheap**: no GPU training; per-query cost is similarity search + one LLM call.
- **Private**: corpus stays in your DB, never baked into model weights.

## Where this project uses RAG
- \`routes/knowledge.js\` → Q&A over the curated KnowledgeEntry collection
- \`services/defectRag.js\` → match runtime errors against DefectKnowledge bug/fix pairs
- \`routes/chat.js /search-vector\` → semantic memory over past chats, with recency + pin boosts`,
    examples: [
      `// Minimal RAG, MongoDB + MiniLM (this project's pattern)
const { embed, cosineSim } = require('./services/embeddings');

// 1. Index
const vec = await embed("Angular standalone components");
await KnowledgeEntry.create({ topic, text, embedding: vec });

// 2. Retrieve
const queryVec = await embed(userQuestion);
const entries = await KnowledgeEntry.find({ embedding: { $exists: true } });
const top = entries
  .map(e => ({ e, score: cosineSim(queryVec, e.embedding) }))
  .sort((a,b) => b.score - a.score)
  .slice(0, 3);

// 3. Compose
const context = top.map(t => t.e.text).join('\\n---\\n');
const answer = \`Based on:\\n\${context}\\n\\nAnswer: ...\`;`,
      `// Hybrid scoring: cosine + recency + pin boost (what /api/chat/search-vector does)
const finalScore =
    cosineSim(q, m.embedding)
  + 0.10 * Math.exp(-daysOld / 30)   // recency boost
  + (inPinnedConvo ? 0.15 : 0);       // pin boost`,
    ],
    related: ['embeddings', 'vector-search', 'cosine-similarity', 'llm', 'prompt-engineering'],
  },
  {
    topic: 'embeddings', category: 'AI & Machine Learning',
    keywords: ['embedding', 'embeddings', 'vector embedding', 'text embedding', 'what are embeddings', 'sentence embeddings', 'minilm', 'feature extraction'],
    title: 'Embeddings — Text as Vectors',
    summary: 'An embedding is a fixed-length numeric vector that represents the semantic meaning of text. Similar meaning → similar vectors. Foundation of semantic search, RAG, clustering.',
    details: `A model reads text and outputs a dense vector (typically 384, 768, or 1536 dims). Similar inputs cluster in similar regions of that space.

## Properties
- **Fixed length** — "hello" and a 1000-word essay both compress to the same vector size
- **Dense** — every dimension carries meaning
- **Normalized** (usually) — cosine and dot product become equivalent

## Common models
- **MiniLM (all-MiniLM-L6-v2)** — 384-dim, ~25 MB, fast, local. Used in this project via \`@xenova/transformers\`.
- **text-embedding-3-small** (OpenAI) — 1536-dim, API-based
- **BGE / E5 / GTE** — strong open-source options, 768-1024 dim

## Why "similar meaning → similar vector" works
- "port is in use" ≈ "EADDRINUSE error" → cosine ~0.7
- "MongoDB connection failed" ≈ "cannot connect to Atlas" → cosine ~0.8
- unrelated topics → cosine near 0

That's why RAG retrieves *meaning*, not keywords.`,
    examples: [
      `// @xenova/transformers — MiniLM runs locally, no API key
const { pipeline } = await import('@xenova/transformers');
const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

const out = await pipe("port already in use", { pooling: 'mean', normalize: true });
const vec = Array.from(out.data); // 384 floats, magnitude = 1`,
    ],
    related: ['rag', 'cosine-similarity', 'vector-search'],
  },
  {
    topic: 'cosine-similarity', category: 'AI & Machine Learning',
    keywords: ['cosine similarity', 'cosine sim', 'similarity score', 'vector distance', 'dot product similarity', 'how is cosine calculated'],
    title: 'Cosine Similarity',
    summary: 'Measures similarity of two vectors by the angle between them (ignores magnitude). Range [-1, 1]: 1 = same direction, 0 = perpendicular, -1 = opposite. Default similarity metric for embeddings.',
    details: `## Formula
\`\`\`
cos(A, B) = (A · B) / (|A| * |B|)
\`\`\`

When vectors are pre-normalized (as MiniLM outputs), this simplifies to the dot product — which is why \`backend/services/embeddings.js :: cosineSim\` is just a dot product loop, no division.

## Why angle and not distance?
Euclidean distance depends on magnitude; cosine doesn't. For text, magnitude is about "how much you said," not "what you meant." Two documents about the same topic with very different lengths should still match.

## Interpretation ranges for sentence embeddings
- \`> 0.8\` — near-duplicate
- \`0.5-0.8\` — clearly related
- \`0.3-0.5\` — loosely related
- \`< 0.3\` — probably unrelated

RAG systems typically filter at \`minScore = 0.3-0.4\`. This project uses 0.4 for chat recall, 0.3 for defect RAG.`,
    examples: [
      `// Minimal (assumes pre-normalized inputs — what this project does)
function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}`,
      `// Full version (no normalization assumption)
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}`,
    ],
    related: ['embeddings', 'rag', 'vector-search'],
  },
  {
    topic: 'vector-search', category: 'AI & Machine Learning',
    keywords: ['vector search', 'semantic search', 'vector database', 'knn search', 'nearest neighbor', 'approximate nearest neighbor', 'ann', 'hnsw', 'pgvector', 'pinecone'],
    title: 'Vector Search',
    summary: 'Find the k most similar items to a query by comparing embeddings. Matches meaning, not tokens — "crashed when starting" finds "EADDRINUSE on boot" even though they share zero words.',
    details: `## Brute force (what this project uses)
Load every vector, compute cosine with query, sort, take top-k. O(N * d) per query. Works great until N hits ~100k+.

## ANN — Approximate Nearest Neighbor (for scale)
- **HNSW** — graph-based, very fast (used by pgvector, Qdrant, Weaviate, Milvus)
- **IVF** — cluster vectors, only scan nearby clusters
- **LSH** — hash buckets where similar vectors collide

Trade: ~95% recall for O(log N) lookup speed.

## Vector stores you'll encounter
- **pgvector** — Postgres extension, easy when you already have Postgres
- **Pinecone** — SaaS, zero-ops
- **Weaviate / Qdrant / Milvus** — self-hostable, full-featured
- **MongoDB Atlas Vector Search** — native \`$vectorSearch\` aggregation stage
- **"floats in MongoDB"** — what this project does. Fine up to tens of thousands.

## Hybrid search
Combine BM25 (keyword) with cosine (semantic). Vector alone misses exact-term matches; keyword alone misses paraphrases.`,
    examples: [
      `// Brute-force top-k (what this project does everywhere)
async function topK(queryText, k = 3) {
  const queryVec = await embed(queryText);
  const docs = await Collection.find({ embedding: { $exists: true } });
  return docs
    .map(d => ({ doc: d, score: cosineSim(queryVec, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}`,
      `// MongoDB Atlas Vector Search
const pipeline = [{
  $vectorSearch: {
    index: "embedding_index",
    path: "embedding",
    queryVector: queryVec,
    numCandidates: 100,
    limit: 3,
  }
}];`,
    ],
    related: ['rag', 'embeddings', 'cosine-similarity'],
  },
  {
    topic: 'llm', category: 'AI & Machine Learning',
    keywords: ['llm', 'large language model', 'what is an llm', 'language models', 'gpt', 'claude', 'transformer', 'chat model', 'generative ai'],
    title: 'LLM — Large Language Model',
    summary: 'A neural network (decoder-only transformer) trained to predict the next token. At billions of parameters + trillions of tokens, this produces models that chat, code, translate, and reason. They produce statistically likely continuations — they don\'t "know" things.',
    details: `## Training stages
1. **Pretraining** — next-token prediction on trillions of tokens. Expensive (millions).
2. **Instruction tuning** — fine-tune on (prompt, good-response) pairs.
3. **RLHF / DPO** — align with human preferences.

## Key limits
- **Context window** — tokens the model can see at once (2k-200k+). RAG partly exists to work around this.
- **Hallucination** — confidently makes things up when uncertain. RAG + "answer only from context" mitigates.
- **Knowledge cutoff** — no info after training date. Another reason for RAG.

## Leveraging an LLM without training your own
- **Prompting** — write better inputs
- **RAG** — inject relevant context
- **Tool use / function calling** — let the model call APIs
- **Fine-tuning** — last resort, when prompting + RAG can't hit the quality bar

## Local / open-weight worth knowing
Llama 3, Mistral, Qwen, DeepSeek, Gemma — runnable via llama.cpp / Ollama / vLLM.`,
    examples: [
      `# Ollama: local LLM in 3 lines
import ollama
response = ollama.chat(model='llama3', messages=[
  {"role": "user", "content": "Explain RAG"}
])
print(response['message']['content'])`,
      `// Cloud LLM — Anthropic SDK
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
const msg = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write a haiku about RAG" }],
});`,
    ],
    related: ['rag', 'prompt-engineering', 'embeddings', 'ai-agents'],
  },
  {
    topic: 'prompt-engineering', category: 'AI & Machine Learning',
    keywords: ['prompt', 'prompt engineering', 'prompting', 'system prompt', 'few shot', 'chain of thought', 'cot', 'how to write prompts'],
    title: 'Prompt Engineering',
    summary: 'Designing the input to an LLM so it produces the output you want. Most "can\'t the AI do X?" problems are prompt problems. Good prompts are specific, give examples, define format, and constrain scope.',
    details: `## Anatomy of a solid prompt
1. **Role / system** — "You are a senior Node.js engineer..."
2. **Task** — single, concrete verb: classify, summarize, extract, rewrite
3. **Input** — the data, clearly delimited
4. **Examples** (few-shot) — 2-3 input/output pairs if non-obvious
5. **Format spec** — "Respond in JSON with keys: title, severity, fix"
6. **Constraints** — "Under 200 words. No markdown headers."

## Techniques that actually help
- **Few-shot** — show the pattern, don't describe it
- **Chain-of-thought** — "Think step by step" improves reasoning at latency cost
- **Self-consistency** — sample multiple times, take majority
- **Role / persona** — anchors style ("act as a copy editor")
- **Negative constraints** — "Do NOT include X" sometimes stronger than positive framing
- **Structured output** — ask for JSON with a schema, or XML tags like \`<answer>\` for easy parsing

## Anti-patterns
- Vague ("make it better")
- Conflicting ("thorough but brief")
- Key instruction hidden at the top of a wall of text — models weight recent tokens more

## For RAG specifically
System prompt: "Answer using ONLY the provided context. If the context doesn't contain the answer, say 'I don't know.' Cite as [1], [2]." This dramatically reduces hallucination.`,
    examples: [
      `# RAG system prompt template
You are a defect analyst. Answer using ONLY the KNOWLEDGE BASE passages.
If the answer is not there, say: "No matching entry."
Cite each claim as [#index]. Be concise.

KNOWLEDGE BASE:
[1] {passage_1}
[2] {passage_2}

QUESTION: {user_question}`,
    ],
    related: ['llm', 'rag', 'ai-agents'],
  },
  {
    topic: 'ai-agents', category: 'AI & Machine Learning',
    keywords: ['ai agent', 'agents', 'agent loop', 'tool use', 'function calling', 'react pattern', 'autonomous agent', 'langchain', 'agent sdk'],
    title: 'AI Agents',
    summary: 'An LLM running in a loop that can call tools (functions/APIs) and observe results, then decide next action. Turns "text generator" into "autonomous worker." Popular patterns: ReAct, function calling, multi-agent orchestration.',
    details: `## The basic loop (ReAct)
\`\`\`
while not done:
    thought = llm("what should I do next given <history>?")
    action  = parse_tool_call(thought)
    result  = execute(action)
    history.append((thought, action, result))
\`\`\`

## Ingredients
- **Tool definitions** — JSON schemas for what the agent can do
- **Tool/function calling** — LLM returns structured tool calls instead of free text
- **Observation feeding** — tool results go back into conversation
- **Termination** — "final_answer" tool, step budget, or heuristic

## Frameworks
- **LangChain / LangGraph** — Python/JS, most ecosystem
- **CrewAI / AutoGen** — multi-agent
- **Anthropic Agent SDK** — Claude-native
- **OpenAI Assistants API** — hosted agent runtime

## Failure modes
- Looping: deduplicate recent tool calls
- Over-calling tools: nudge in system prompt to try direct answer first
- Wrong tool picked: sharpen tool descriptions + give examples
- Context blowup: summarize old turns periodically

## When NOT to use an agent
If the task is a fixed pipeline (extract → translate → save), write a plain script. Agents shine when the path isn't knowable upfront.`,
    related: ['llm', 'prompt-engineering', 'rag'],
  },
  {
    topic: 'fine-tuning-vs-rag', category: 'AI & Machine Learning',
    keywords: ['fine tuning', 'fine-tuning', 'finetuning', 'fine tune vs rag', 'rag vs fine tuning', 'when to fine tune', 'should i fine tune', 'lora'],
    title: 'Fine-tuning vs. RAG',
    summary: 'Fine-tuning adjusts model weights on your data. RAG leaves the model alone and retrieves per query. For factual knowledge, RAG wins on cost, freshness, and provenance. Fine-tune only for style / format that RAG can\'t teach.',
    details: `## Default to RAG. Fine-tune only when you've proven RAG isn't enough.

## Use RAG when
- Answering from a corpus (docs, KB, tickets, chat history)
- Data updates often — new docs should be answerable immediately
- Need citations / traceability
- Cost-sensitive
- Corpus is private and shouldn't be baked into weights

## Use fine-tuning when
- You need a specific **format** consistently (e.g. always valid JSON of a complex schema)
- You want a specific **style / voice** across every response
- Narrow, stable task where prompting + RAG hit a ceiling
- Small adapters (LoRA) that are cheap to store and swap

## Hybrid is common
Lightly fine-tuned model for format/style + RAG for facts.

## Before you fine-tune, try
1. Better prompt (examples + format spec)
2. Better retrieval (more chunks, hybrid search, re-ranking)
3. A stronger base model
4. Few-shot prompting (3-5 examples inline)

Only after all four plateau is fine-tuning worth the cost.`,
    related: ['rag', 'llm', 'prompt-engineering'],
  },
];

const DIRECT_ANSWER_ENTRIES = [
  {
    patterns: ['^(what\\s+is|explain|define|describe)\\s+rag\\b', '^rag\\??$', 'how\\s+(does|do)\\s+rag\\s+work'],
    topic: 'rag', priority: 10,
    answer: `**RAG — Retrieval-Augmented Generation**

Instead of asking an LLM to answer from memory, RAG first *retrieves* relevant passages from your own knowledge base, then passes them to the model as context.

**The 3-stage pipeline:**
1. **Index** — chunk corpus, embed each chunk, store vectors in a DB (one-time).
2. **Retrieve** — embed query, cosine-similarity against stored vectors, take top-k.
3. **Generate** — feed retrieved chunks + question to LLM, or compose directly.

**Why it beats fine-tuning for facts:**
- Fresh: add a doc, re-index → answerable immediately
- Cheap: no GPU, just embedding + similarity
- Traceable: every answer cites source chunks
- Private: data stays in your DB

**This project uses RAG three ways:**
- \`routes/knowledge.js\` → Q&A over curated KB
- \`services/defectRag.js\` → match runtime errors to known fix patterns
- \`routes/chat.js /search-vector\` → semantic memory over past chats (with recency + pin boosts)

Ask "what are embeddings?" or "how does cosine similarity work?" for the pieces.`,
  },
  {
    patterns: ['^(what\\s+(is|are)|explain|define)\\s+embedding', '^embedding(s)?\\??$'],
    topic: 'embeddings', priority: 10,
    answer: `**Embedding — text as a vector**

A fixed-length array of numbers (typically 384, 768, or 1536 dims) that captures the semantic meaning of text. Similar meaning → similar vector.

This project uses **MiniLM-L6-v2** via \`@xenova/transformers\` — 384 dimensions, ~25 MB cached under \`backend/.models-cache/\`, runs fully offline.

\`\`\`javascript
const { embed } = require('./services/embeddings');
const vec = await embed("port already in use"); // → 384 floats
\`\`\`

Ask "what is RAG?" to see how embeddings power retrieval.`,
  },
  {
    patterns: ['cosine\\s+similarity', 'how.*similarity.*calculated'],
    topic: 'cosine-similarity', priority: 10,
    answer: `**Cosine similarity** — how similar two vectors are, by the angle between them.

\`\`\`
cos(A, B) = (A · B) / (|A| · |B|)
\`\`\`

Range [-1, 1]: **1** = identical direction, **0** = unrelated, **-1** = opposite.

For normalized vectors (what MiniLM outputs), it's just the dot product:

\`\`\`javascript
function cosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}
\`\`\`

**Typical cutoffs:** \`>0.8\` near-duplicate, \`0.5-0.8\` clearly related, \`<0.3\` noise.`,
  },
  {
    patterns: ['^(what\\s+is|explain)\\s+(an?\\s+)?llm', 'large\\s+language\\s+model'],
    topic: 'llm', priority: 10,
    answer: `**LLM — Large Language Model**

A decoder-only transformer trained to predict the next token. At billions of parameters + trillions of tokens, produces models that chat, code, translate, and reason.

**Key limits:**
- **Context window** — tokens seen at once (2k-200k+). RAG partly exists to work around this.
- **Hallucination** — confidently fabricates when uncertain. Mitigate with RAG + "answer only from context."
- **Knowledge cutoff** — no info after training date.

You rarely need to train one. Combinations of prompting, RAG, and tool use cover most use cases.`,
  },
  {
    patterns: ['fine.?tun.*vs.*rag', 'rag.*vs.*fine.?tun', 'should\\s+i\\s+fine.?tune', 'when.*fine.?tune'],
    topic: 'fine-tuning-vs-rag', priority: 10,
    answer: `**Fine-tuning vs RAG — default to RAG.**

| Need | Pick |
|------|------|
| Answer from your docs / KB / tickets | **RAG** |
| Always return JSON of a specific schema | Fine-tune |
| Match brand voice / tone consistently | Fine-tune |
| Data updates often | **RAG** |
| Need citations / provenance | **RAG** |
| Cost-sensitive | **RAG** |

**Before fine-tuning, try:** better prompt → better retrieval → stronger base model → few-shot. Only if all four plateau is fine-tuning worth the cost.`,
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  console.log(`Computing embeddings for ${ENTRIES.length} AI/ML entries...`);
  for (let i = 0; i < ENTRIES.length; i++) {
    ENTRIES[i].embedding = await embed(buildEmbeddingText(ENTRIES[i]));
    console.log(`  embedded ${i + 1}/${ENTRIES.length}: ${ENTRIES[i].topic}`);
  }

  let inserted = 0, updated = 0;
  for (const entry of ENTRIES) {
    const result = await KnowledgeEntry.findOneAndUpdate(
      { topic: entry.topic },
      entry,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
    else updated++;
  }
  console.log(`\nKnowledgeEntry: ${inserted} inserted, ${updated} updated`);

  let dInserted = 0, dUpdated = 0;
  for (const d of DIRECT_ANSWER_ENTRIES) {
    const result = await DirectAnswer.findOneAndUpdate(
      { topic: d.topic },
      d,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) dInserted++;
    else dUpdated++;
  }
  console.log(`DirectAnswer:    ${dInserted} inserted, ${dUpdated} updated`);

  const total = await KnowledgeEntry.countDocuments();
  console.log(`\nTotal KnowledgeEntry in DB: ${total}`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

// Local sentence embeddings via @xenova/transformers (MiniLM, 384-dim).
// No API key, no network after first model download (~25 MB cached under ./models).
// ESM-only package — loaded via dynamic import from this CommonJS module.

let pipelinePromise = null;

async function getPipeline() {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers');
      // Cache model weights so re-runs don't re-download the ~25 MB model.
      // On Render the filesystem is ephemeral, so set MODELS_CACHE_DIR to a
      // mounted persistent disk (e.g. /var/models-cache) to survive restarts.
      env.cacheDir = process.env.MODELS_CACHE_DIR || require('path').join(__dirname, '..', '.models-cache');
      env.allowLocalModels = true;
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    })();
  }
  return pipelinePromise;
}

async function embed(text) {
  const pipe = await getPipeline();
  const output = await pipe(text || '', { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosineSim(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

module.exports = { embed, cosineSim, getPipeline };

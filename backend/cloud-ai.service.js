const https = require('https');

const SYSTEM_PROMPT = `You are a helpful AI coding assistant inside an in-browser IDE.

How to answer:
- Answer the question that was actually asked, directly and concisely. Do not impose a fixed template.
- For a general or conceptual question, give a clear plain-language explanation. Do NOT invent test cases, system-architecture breakdowns, or QA tables unless the user explicitly asks for them.
- For a coding request, give complete, working code in fenced code blocks with the correct language tag.
- You can help with JavaScript/TypeScript, Angular, React, Node/Express, MongoDB, Python, HTML/CSS, Git, and general programming.
- Only generate test cases or QA artifacts when the user actually asks for tests, QA, or test cases. When you do, use this format: Test Name | Type | Priority | Steps | Expected Result.
- Think step by step. Be concise but thorough; match the depth of the answer to the question.`;

/**
 * Unified cloud LLM bridge. Supports two providers:
 *   - gemini   (Google Generative Language API) — preferred when GEMINI_API_KEY is set
 *   - deepseek (OpenAI-compatible chat completions) — fallback
 *
 * Keys are resolved lazily on every call so the service works regardless of when
 * dotenv loads relative to module require order. Offline-first still holds: with no
 * key configured, callers get a NO_API_KEY error / retrieval-only fallback.
 */
class CloudAIService {
  constructor() {
    // Provider/model are resolved lazily; constructor kept for back-compat.
  }

  // --- provider resolution -------------------------------------------------

  _geminiKey() { return process.env.GEMINI_API_KEY || ''; }
  _openrouterKey() { return process.env.OPENROUTER_API_KEY || ''; }
  _deepseekKey() { return process.env.DEEPSEEK_API_KEY || ''; }

  /** Active provider, in preference order: gemini, then openrouter, then deepseek. */
  get provider() {
    if (this._geminiKey()) return 'gemini';
    if (this._openrouterKey()) return 'openrouter';
    return 'deepseek';
  }

  /** Default model for the active provider. */
  get model() {
    if (this.provider === 'gemini') return process.env.GEMINI_MODEL || 'gemini-flash-latest';
    // OpenRouter free models end in ":free". Override with OPENROUTER_MODEL.
    if (this.provider === 'openrouter') return process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat-v3.1:free';
    return 'deepseek-coder';
  }

  /** True when the active provider has a usable key. */
  get apiKey() {
    if (this.provider === 'gemini') return this._geminiKey();
    if (this.provider === 'openrouter') return this._openrouterKey();
    return this._deepseekKey();
  }

  // --- key management ------------------------------------------------------

  /**
   * Persist an API key to backend/.env. Defaults to the active provider; pass
   * provider explicitly ('gemini' | 'deepseek') to target a specific one.
   */
  setApiKey(key, provider) {
    const target = provider || this.provider;
    const envVar = target === 'gemini' ? 'GEMINI_API_KEY'
      : target === 'openrouter' ? 'OPENROUTER_API_KEY'
      : 'DEEPSEEK_API_KEY';
    process.env[envVar] = key;
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}
    const re = new RegExp(`${envVar}=.*`);
    if (re.test(content)) {
      content = content.replace(re, `${envVar}=${key}`);
    } else {
      content += `\n${envVar}=${key}`;
    }
    fs.writeFileSync(envPath, content.trim() + '\n');
  }

  getStatus() {
    const provider = this.provider;
    return {
      provider,
      hasKey: !!this.apiKey,
      model: this.model,
      ready: !!this.apiKey,
      signupUrl: provider === 'gemini'
        ? 'https://aistudio.google.com/app/apikey'
        : provider === 'openrouter'
        ? 'https://openrouter.ai/keys'
        : 'https://platform.deepseek.com',
    };
  }

  // --- streaming chat ------------------------------------------------------

  async streamChat(messages, model, res) {
    if (!this.apiKey) {
      res.write(`data: ${JSON.stringify({ error: 'No LLM API key configured. Set GEMINI_API_KEY (https://aistudio.google.com/app/apikey), OPENROUTER_API_KEY (https://openrouter.ai/keys), or DEEPSEEK_API_KEY.' })}\n\n`);
      res.end();
      return;
    }
    return this.provider === 'gemini'
      ? this._streamGemini(messages, model, res)
      : this._streamDeepSeek(messages, model, res);
  }

  /**
   * Request options for OpenAI-compatible providers (deepseek, openrouter).
   * Both speak the same /chat/completions wire format, so the stream/complete
   * bodies are shared — only host, path and auth headers differ.
   */
  _openAiRequestOptions(body) {
    if (this.provider === 'openrouter') {
      return {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // Optional attribution headers OpenRouter uses for app ranking.
          'HTTP-Referer': 'https://github.com/chethan0045/Ai-Assistant',
          'X-Title': 'AI Assistant IDE',
          'Content-Length': Buffer.byteLength(body),
        },
      };
    }
    return {
      hostname: 'api.deepseek.com',
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };
  }

  _streamDeepSeek(messages, model, res) {
    const body = JSON.stringify({
      model: model || this.model,
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 4096,
    });
    const providerLabel = this.provider === 'openrouter' ? 'OpenRouter' : 'DeepSeek';

    return new Promise((resolve, reject) => {
      const req = https.request(this._openAiRequestOptions(body), (apiRes) => {
        let buffer = '';

        if (apiRes.statusCode !== 200) {
          let errData = '';
          apiRes.on('data', c => errData += c);
          apiRes.on('end', () => {
            let errMsg = `${providerLabel} API error ${apiRes.statusCode}`;
            try { errMsg = JSON.parse(errData).error?.message || errMsg; } catch {}
            res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
            res.end();
            resolve();
          });
          return;
        }

        apiRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
            } catch {}
          }
        });

        apiRes.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); resolve(); });
      });

      req.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  _streamGemini(messages, model, res) {
    const mdl = model || this.model;
    const { systemInstruction, contents } = this._toGemini(messages);
    const payload = {
      contents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    };
    if (systemInstruction) payload.systemInstruction = systemInstruction;
    const body = JSON.stringify(payload);

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${mdl}:streamGenerateContent?alt=sse`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (apiRes) => {
        let buffer = '';

        if (apiRes.statusCode !== 200) {
          let errData = '';
          apiRes.on('data', c => errData += c);
          apiRes.on('end', () => {
            let errMsg = `Gemini API error ${apiRes.statusCode}`;
            try { errMsg = JSON.parse(errData).error?.message || errMsg; } catch {}
            res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
            res.end();
            resolve();
          });
          return;
        }

        apiRes.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (!data) continue;
            try {
              const parsed = JSON.parse(data);
              const token = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
              if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
            } catch {}
          }
        });

        apiRes.on('end', () => { res.write('data: [DONE]\n\n'); res.end(); resolve(); });
      });

      req.on('error', (err) => {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  // --- non-streaming completion -------------------------------------------

  /**
   * Non-streaming chat completion. Returns the full assistant message as a string.
   * Used by JSON endpoints (e.g. RAG code generation) where we assemble one answer
   * rather than streaming tokens to the client.
   */
  async complete(messages, opts = {}) {
    if (!this.apiKey) {
      const err = new Error('No LLM API key configured');
      err.code = 'NO_API_KEY';
      throw err;
    }
    return this.provider === 'gemini'
      ? this._completeGemini(messages, opts)
      : this._completeDeepSeek(messages, opts);
  }

  _completeDeepSeek(messages, opts) {
    const body = JSON.stringify({
      model: opts.model || this.model,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
    });
    const providerLabel = this.provider === 'openrouter' ? 'OpenRouter' : 'DeepSeek';
    return new Promise((resolve, reject) => {
      const req = https.request(this._openAiRequestOptions(body), (apiRes) => {
        let raw = '';
        apiRes.on('data', c => raw += c);
        apiRes.on('end', () => {
          if (apiRes.statusCode !== 200) {
            let msg = `${providerLabel} API error ${apiRes.statusCode}`;
            try { msg = JSON.parse(raw).error?.message || msg; } catch {}
            return reject(new Error(msg));
          }
          try {
            const parsed = JSON.parse(raw);
            resolve(parsed.choices?.[0]?.message?.content || '');
          } catch (err) {
            reject(new Error('Invalid JSON from ' + providerLabel + ': ' + err.message));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  _completeGemini(messages, opts) {
    const mdl = opts.model || this.model;
    const { systemInstruction, contents } = this._toGemini(messages);
    const payload = {
      contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxTokens ?? 2048,
      },
    };
    if (systemInstruction) payload.systemInstruction = systemInstruction;
    const body = JSON.stringify(payload);
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${mdl}:generateContent`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.apiKey,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (apiRes) => {
        let raw = '';
        apiRes.on('data', c => raw += c);
        apiRes.on('end', () => {
          if (apiRes.statusCode !== 200) {
            let msg = `Gemini API error ${apiRes.statusCode}`;
            try { msg = JSON.parse(raw).error?.message || msg; } catch {}
            return reject(new Error(msg));
          }
          try {
            const parsed = JSON.parse(raw);
            const text = parsed.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
            resolve(text);
          } catch (err) {
            reject(new Error('Invalid JSON from Gemini: ' + err.message));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  /**
   * Convert OpenAI-style messages ({role: system|user|assistant}) to Gemini's
   * shape ({systemInstruction, contents:[{role: user|model, parts:[{text}]}]}).
   */
  _toGemini(messages) {
    const systemParts = [];
    const contents = [];
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push({ text: msg.content });
      } else {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }
    return {
      systemInstruction: systemParts.length ? { parts: systemParts } : null,
      contents,
    };
  }

  buildMessages(userInput, projectContext, conversationHistory, currentFile) {
    const messages = [];
    let sys = SYSTEM_PROMPT;
    if (projectContext) sys += `\n\nProject Context:\n${projectContext}`;
    if (currentFile?.name && currentFile?.content) {
      sys += `\n\nCurrent file (${currentFile.name}):\n\`\`\`\n${currentFile.content.slice(0, 12000)}\n\`\`\``;
    }
    messages.push({ role: 'system', content: sys });
    if (conversationHistory?.length) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.text.slice(0, 2000) });
      }
    }
    messages.push({ role: 'user', content: userInput });
    return messages;
  }
}

module.exports = { CloudAIService, SYSTEM_PROMPT };

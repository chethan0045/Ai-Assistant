const https = require('https');

const SYSTEM_PROMPT = `You are an expert AI QA assistant for a Test Management platform (like SimplifyQA).

Your capabilities:
- Analyze codebases and extract Epics, Features, User Stories
- Auto-generate test cases (unit, integration, API, E2E) from code
- Generate test automation code
- Debug and fix code with before/after diffs
- Understand Angular, Express, MongoDB, TypeScript projects

Rules:
- Always give COMPLETE working code in fenced code blocks
- When generating test cases, use this format: Test Name | Type | Priority | Steps | Expected Result
- Think step by step
- Be concise but thorough`;

class CloudAIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.model = 'deepseek-coder';
  }

  setApiKey(key) {
    this.apiKey = key;
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env');
    let content = '';
    try { content = fs.readFileSync(envPath, 'utf-8'); } catch {}
    if (content.includes('DEEPSEEK_API_KEY')) {
      content = content.replace(/DEEPSEEK_API_KEY=.*/, `DEEPSEEK_API_KEY=${key}`);
    } else {
      content += `\nDEEPSEEK_API_KEY=${key}`;
    }
    fs.writeFileSync(envPath, content.trim() + '\n');
  }

  getStatus() {
    return {
      provider: 'deepseek',
      hasKey: !!this.apiKey,
      model: this.model,
      ready: !!this.apiKey,
      signupUrl: 'https://platform.deepseek.com',
    };
  }

  async streamChat(messages, model, res) {
    if (!this.apiKey) {
      res.write(`data: ${JSON.stringify({ error: 'No DeepSeek API key. Get one free at https://platform.deepseek.com' })}\n\n`);
      res.end();
      return;
    }

    const body = JSON.stringify({
      model: model || this.model,
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 4096,
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }, (apiRes) => {
        let buffer = '';

        if (apiRes.statusCode !== 200) {
          let errData = '';
          apiRes.on('data', c => errData += c);
          apiRes.on('end', () => {
            let errMsg = `DeepSeek API error ${apiRes.statusCode}`;
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

  /**
   * Non-streaming chat completion. Returns the full assistant message as a string.
   * Used by JSON endpoints (e.g. RAG code generation) where we assemble one answer
   * rather than streaming tokens to the client.
   */
  async complete(messages, opts = {}) {
    if (!this.apiKey) {
      const err = new Error('No DeepSeek API key configured');
      err.code = 'NO_API_KEY';
      throw err;
    }
    const body = JSON.stringify({
      model: opts.model || this.model,
      messages,
      stream: false,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.maxTokens ?? 2048,
    });
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.deepseek.com',
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body),
        },
      }, (apiRes) => {
        let raw = '';
        apiRes.on('data', c => raw += c);
        apiRes.on('end', () => {
          if (apiRes.statusCode !== 200) {
            let msg = `DeepSeek API error ${apiRes.statusCode}`;
            try { msg = JSON.parse(raw).error?.message || msg; } catch {}
            return reject(new Error(msg));
          }
          try {
            const parsed = JSON.parse(raw);
            resolve(parsed.choices?.[0]?.message?.content || '');
          } catch (err) {
            reject(new Error('Invalid JSON from DeepSeek: ' + err.message));
          }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
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

// One-shot: upserts the "who are you" DirectAnswer with a real embedding so
// queries like "who r u", "whoami", "what can you do" all land on a helpful
// answer instead of the generic "I don't have information" fallback.

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const { DirectAnswer } = require('./models/Knowledge');
const { embed } = require('./services/embeddings');

const question = 'who are you / what are you / what can you do / your identity and capabilities';

const answer = `**I'm your offline AI programming assistant.**

I run locally — no API keys needed, no cloud in the critical path. Here's what I can do:

- **Answer programming questions** about JavaScript, TypeScript, Angular, React, Node, MongoDB, Python, Docker, Git, testing, security, and more — semantic + keyword search over 75+ curated entries.
- **Scaffold projects** — say "create angular todo", "create chess game", "create chatbot app", "create fullstack project". First install is cached and shared across scaffolds for near-instant setup.
- **Solve LeetCode problems** — 71 problems with curated solutions, complexity analysis, and full test cases.
- **Analyze defects** — runtime errors (Express or Angular), static-scan issues, or any error you paste. I'll classify it and suggest fixes via semantic RAG against my defect knowledge base.
- **"Fix with AI"** — click the button on any defect for a structured fix proposal with before/after code snippets and confidence score.
- **Run code inline** — paste JS/TS in chat to execute it.
- **Vector search** every MongoDB collection semantically at \`POST /api/search/vector\`.

Try: "what is RAG", "create angular chess", "fibonacci of 15", or paste a stack trace.`;

const doc = {
  patterns: [
    '\\bwho\\s+(are|r)\\s+(you|u)\\b',
    '\\bwhat\\s+(are|r)\\s+(you|u)\\b',
    '\\bwhat\\s+can\\s+you\\s+do\\b',
    '\\bwhat\\s+do\\s+you\\s+do\\b',
    '\\babout\\s+you\\b',
    '\\byour\\s+(name|capabilities|abilities)\\b',
    '\\bwhoami\\b',
    '\\btell\\s+me\\s+about\\s+yourself\\b',
    '\\bintroduce\\s+yourself\\b',
  ],
  answer,
  topic: 'identity',
  priority: 20,
  question,
};

(async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });

  console.log('Computing embedding...');
  doc.embedding = await embed([doc.question, doc.topic, doc.answer.slice(0, 400)].join('\n'));

  const r = await DirectAnswer.findOneAndUpdate(
    { topic: 'identity' },
    doc,
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const inserted = r.createdAt.getTime() === r.updatedAt.getTime();
  console.log(`identity DirectAnswer: ${inserted ? 'inserted' : 'updated'}`);

  const total = await DirectAnswer.countDocuments();
  console.log(`total DirectAnswers: ${total}`);

  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });

// Universal backfill for vector search: scans every collection that has (or
// should have) an embedding field, computes vectors for any doc missing one,
// saves in place. Safe to re-run — skips docs that already have a vector.
//
// Collections covered:
//   KnowledgeEntry        (backend/models/Knowledge.js)
//   DefectKnowledge       (backend/models/DefectKnowledge.js)
//   Defect                (backend/models/Defect.js)
//   ChatMessage           (backend/models/ChatMessage.js)
//   LeetProblem           (backend/models/LeetProblem.js)
//
// Run: node backfill-embeddings.js
// Run a subset:   BACKFILL_ONLY=knowledge,leetcode node backfill-embeddings.js

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const { KnowledgeEntry, DirectAnswer } = require('./models/Knowledge');
const DefectKnowledge = require('./models/DefectKnowledge');
const Defect = require('./models/Defect');
const ChatMessage = require('./models/ChatMessage');
const LeetProblem = require('./models/LeetProblem');
const ProjectBlueprint = require('./models/ProjectBlueprint');
const { embed } = require('./services/embeddings');

// Convert a stored regex pattern string into readable natural-language text.
// Strips escape sequences + metachars so the embedding model sees words, not
// regex syntax. For multi-pattern entries we run this on each and join them.
function patternToNaturalText(pattern) {
  if (!pattern) return '';
  return String(pattern)
    .replace(/\\s\+/g, ' ')                 // \s+ → space
    .replace(/\\b/g, ' ')                   // \b  → space
    .replace(/\\w\+?/g, ' ')                // \w, \w+ → space
    .replace(/\\d\+?/g, ' ')                // \d, \d+ → space
    .replace(/\.\*\??/g, ' ')               // .*, .*? → space
    .replace(/\.\+\??/g, ' ')               // .+, .+? → space
    .replace(/\\\./g, '.')                  // escaped dot → literal
    .replace(/\\\//g, '/')                  // escaped slash
    .replace(/\\[^\s]/g, ' ')               // other escapes → space
    .replace(/[\^\$\(\)\[\]\{\}\?\+\*]/g, ' ')
    .replace(/\|/g, ' or ')                 // | alternation → "or"
    .replace(/\./g, ' ')                    // remaining dots
    .replace(/\s+/g, ' ')
    .trim();
}

function directAnswerQuestion(doc) {
  if (doc.question && doc.question.trim()) return doc.question;
  const alternatives = (doc.patterns || []).map(patternToNaturalText).filter(Boolean);
  // Dedup identical alternatives; keep first 3 — that's plenty for a meaning signal.
  const uniq = Array.from(new Set(alternatives)).slice(0, 3);
  return uniq.length ? uniq.join(' / ') : (doc.topic || '');
}

// Per-collection: build the text that becomes the vector. Keep it focused —
// embedding the entire `details` field dilutes the signal.
const TARGETS = [
  {
    name: 'knowledge',
    label: 'KnowledgeEntry',
    Model: KnowledgeEntry,
    buildText: e => [e.title, e.topic, e.summary, (e.keywords || []).join(' ')].filter(Boolean).join('\n'),
    idLabel: e => e.topic,
  },
  {
    name: 'defect-knowledge',
    label: 'DefectKnowledge',
    Model: DefectKnowledge,
    buildText: e => `${e.problem}\n${(e.tags || []).join(' ')}\n${e.category || ''}`,
    idLabel: e => e.problem.slice(0, 50),
  },
  {
    name: 'defects',
    label: 'Defect',
    Model: Defect,
    // Runtime/static errors are best represented by message + stack head.
    buildText: e => [e.message, (e.stack || '').split('\n').slice(0, 3).join('\n')].filter(Boolean).join('\n').slice(0, 2000),
    idLabel: e => (e.message || '').slice(0, 50),
  },
  {
    name: 'chat',
    label: 'ChatMessage',
    Model: ChatMessage,
    buildText: e => e.text || '',
    idLabel: e => `[${e.role}] ${(e.text || '').slice(0, 40)}`,
  },
  {
    name: 'leetcode',
    label: 'LeetProblem',
    Model: LeetProblem,
    buildText: e => [
      `#${e.number} ${e.title}`,
      (e.topics || []).join(' '),
      (e.keywords || []).join(' '),
      (e.description || '').slice(0, 400),
    ].filter(Boolean).join('\n'),
    idLabel: e => `#${e.number} ${e.title}`,
  },
  {
    name: 'blueprints',
    label: 'ProjectBlueprint',
    Model: ProjectBlueprint,
    buildText: e => [
      e.title,
      e.description,
      (e.stack || []).join(' '),
      (e.keywords || []).join(' '),
    ].filter(Boolean).join('\n'),
    idLabel: e => e.slug,
  },
  {
    name: 'direct-answers',
    label: 'DirectAnswer',
    Model: DirectAnswer,
    // Embed the natural-language question + a snippet of the answer so both
    // contribute to the vector. Also persist the derived question back to
    // the doc so downstream code can display it.
    buildText: e => {
      const q = directAnswerQuestion(e);
      if (!e.question && q) e.question = q;
      return [q, e.topic, (e.answer || '').slice(0, 400)].filter(Boolean).join('\n');
    },
    idLabel: e => e.topic || directAnswerQuestion(e).slice(0, 50),
  },
];

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  const only = (process.env.BACKFILL_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
  const selected = only.length ? TARGETS.filter(t => only.includes(t.name)) : TARGETS;
  if (only.length) console.log(`BACKFILL_ONLY=${only.join(',')} — running: ${selected.map(s => s.name).join(', ')}\n`);

  const report = [];

  for (const target of selected) {
    const missing = await target.Model.find({
      $or: [{ embedding: { $exists: false } }, { embedding: { $size: 0 } }],
    });
    const total = await target.Model.countDocuments();
    console.log(`${target.label.padEnd(20)} total=${total}  missing=${missing.length}`);

    if (missing.length === 0) {
      report.push({ label: target.label, processed: 0, skipped: true });
      continue;
    }

    let done = 0, failed = 0;
    for (const doc of missing) {
      const text = target.buildText(doc);
      if (!text || !text.trim()) {
        failed++;
        continue;
      }
      try {
        doc.embedding = await embed(text);
        await doc.save();
        done++;
      } catch (err) {
        console.warn(`  ! failed on ${target.idLabel(doc)}: ${err.message}`);
        failed++;
      }
      if (done % 10 === 0 || done + failed === missing.length) {
        const last = target.idLabel(doc);
        console.log(`  [${target.label}] ${done + failed}/${missing.length}  last=${last}`);
      }
    }
    report.push({ label: target.label, processed: done, failed });
    console.log('');
  }

  console.log('=== Summary ===');
  for (const r of report) {
    if (r.skipped) {
      console.log(`  ${r.label.padEnd(20)} already complete`);
    } else {
      console.log(`  ${r.label.padEnd(20)} embedded=${r.processed}  failed=${r.failed || 0}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

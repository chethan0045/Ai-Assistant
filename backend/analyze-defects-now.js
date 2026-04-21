// One-shot: ensures defect KB is seeded, then runs RAG on every defect that lacks suggestions.
// Safe to re-run. Prints a report.

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const Defect = require('./models/Defect');
const DefectKnowledge = require('./models/DefectKnowledge');
const { analyze } = require('./services/defectRag');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });

  const kbCount = await DefectKnowledge.countDocuments();
  if (kbCount === 0) {
    console.error('\n  DefectKnowledge collection is empty. Run `node seed-defect-knowledge.js` first.\n');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`  DefectKnowledge ready (${kbCount} entries)`);

  const defects = await Defect.find({});
  console.log(`Total defects in DB: ${defects.length}`);

  let analyzed = 0;
  let matched = 0;
  for (const d of defects) {
    const existing = Array.isArray(d.aiSuggestions) ? d.aiSuggestions.length : 0;
    if (existing > 0 && d.aiAnalyzedAt) {
      console.log(`  skip ${d._id} (${existing} suggestions already)`);
      continue;
    }
    const result = await analyze(d.message, d.stack || '');
    d.embedding = result.embedding;
    d.aiSuggestions = result.suggestions;
    d.aiAnalyzedAt = new Date();
    await d.save();
    analyzed++;
    if (result.suggestions.length > 0) matched++;
    const top = result.suggestions[0];
    console.log(`  [${analyzed}] ${d.message.slice(0, 60)} -> ${result.suggestions.length} matches` +
      (top ? ` (top: "${top.problem.slice(0, 40)}" @ ${(top.score * 100).toFixed(0)}%)` : ''));
  }

  console.log(`\nDone. Analyzed ${analyzed} defects, ${matched} got at least one match.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Analysis failed:', err);
  process.exit(1);
});

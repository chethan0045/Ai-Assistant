// One-shot: deletes every document in the Defect collection.
// Leaves DefectKnowledge (the curated RAG seeds) untouched.

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';

const Defect = require('./models/Defect');

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });

  const before = await Defect.countDocuments();
  console.log(`Found ${before} defect(s). Deleting...`);

  const result = await Defect.deleteMany({});
  console.log(`Deleted ${result.deletedCount} defect(s).`);

  const after = await Defect.countDocuments();
  console.log(`Remaining: ${after}.`);

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Purge failed:', err);
  process.exit(1);
});

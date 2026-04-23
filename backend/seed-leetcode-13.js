/**
 * Seed LeetCode #13 — Roman to Integer.
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const P = {
  number: 13, title: 'Roman to Integer', difficulty: 'Easy',
  topics: ['hash-table', 'math', 'string'],
  description: 'Given a roman numeral, convert it to an integer. Symbols: I=1, V=5, X=10, L=50, C=100, D=500, M=1000. Subtractive pairs: IV=4, IX=9, XL=40, XC=90, CD=400, CM=900.',
  keywords: [
    'roman to integer',
    'roman numeral to integer',
    'convert roman to integer',
    'convert roman numeral',
    'roman number',
    'roman numerals',
  ],
  signatures: [
    'roman\\s+to\\s+integer',
    'convert.*roman.*integer',
    'roman\\s+numeral.*integer',
    'convert.*roman\\s+numeral',
  ],
  complexity: { time: 'O(n)', space: 'O(1)' },
  approach: 'Walk left→right. For each symbol, if the next symbol is larger, subtract the current (it is part of a subtractive pair like IV or IX); otherwise add it. Single pass, constant-size lookup map.',
  code: `/**
 * @param {string} s
 * @return {number}
 */
function romanToInt(s) {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const curr = map[s[i]];
    const next = map[s[i + 1]];
    total += (next && curr < next) ? -curr : curr;
  }
  return total;
}`,
  tests: `console.log(romanToInt('III'));     // 3
console.log(romanToInt('IV'));      // 4
console.log(romanToInt('IX'));      // 9
console.log(romanToInt('LVIII'));   // 58
console.log(romanToInt('MCMXCIV')); // 1994`,
  relatedNumbers: [12, 273],
};

(async () => {
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  const r = await LeetProblem.findOneAndUpdate(
    { number: P.number }, P,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const inserted = r.createdAt.getTime() === r.updatedAt.getTime();
  console.log(`#${P.number} "${P.title}": ${inserted ? 'inserted' : 'updated'}`);
  const total = await LeetProblem.countDocuments();
  console.log(`Total problems in DB: ${total}`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });

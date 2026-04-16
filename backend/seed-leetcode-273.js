/**
 * Seed LeetCode #273 — Integer to English Words.
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const P = {
  number: 273, title: 'Integer to English Words', difficulty: 'Hard',
  topics: ['math', 'string', 'recursion'],
  description: 'Convert a non-negative integer to its English words representation.',
  keywords: [
    'integer to english words',
    'english words representation',
    'number to words',
    'integer to words',
    'convert number english',
    'hundred',
    'thousand',
    'million',
    'billion',
  ],
  signatures: [
    'integer\\s+to\\s+english\\s+words',
    'english\\s+words\\s+representation',
    'convert.*integer.*english',
    'convert.*number.*english\\s+words',
    'non.?negative\\s+integer.*english',
    'one\\s+hundred\\s+twenty\\s+three',
    'twelve\\s+thousand\\s+three\\s+hundred\\s+forty\\s+five',
  ],
  complexity: { time: 'O(1) — bounded by 32-bit int', space: 'O(1)' },
  approach: 'Split number into groups of 3 digits (billion, million, thousand, units). Convert each group to words using three lookup tables: ones, teens, tens. Append the scale word. Trim trailing spaces.',
  code: `/**
 * @param {number} num
 * @return {string}
 */
function numberToWords(num) {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
                'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty',
                'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  // Convert a number < 1000 to words
  const threeDigits = (n) => {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + threeDigits(n % 10);
    return ones[Math.floor(n / 100)] + ' Hundred ' + threeDigits(n % 100);
  };

  let result = '';
  let scaleIdx = 0;
  while (num > 0) {
    const chunk = num % 1000;
    if (chunk !== 0) {
      const words = threeDigits(chunk).trim();
      result = words + (scales[scaleIdx] ? ' ' + scales[scaleIdx] : '') +
               (result ? ' ' + result : '');
    }
    num = Math.floor(num / 1000);
    scaleIdx++;
  }

  return result.trim();
}`,
  tests: `console.log(numberToWords(0));          // "Zero"
console.log(numberToWords(123));        // "One Hundred Twenty Three"
console.log(numberToWords(12345));      // "Twelve Thousand Three Hundred Forty Five"
console.log(numberToWords(1234567));    // "One Million Two Hundred Thirty Four Thousand Five Hundred Sixty Seven"
console.log(numberToWords(1000000000)); // "One Billion"
console.log(numberToWords(20));         // "Twenty"
console.log(numberToWords(100));        // "One Hundred"
console.log(numberToWords(1000));       // "One Thousand"
console.log(numberToWords(1000010));    // "One Million Ten"`,
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

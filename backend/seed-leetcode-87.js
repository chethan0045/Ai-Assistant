/**
 * Seed LeetCode #87 — Scramble String.
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const P = {
  number: 87, title: 'Scramble String', difficulty: 'Hard',
  topics: ['string', 'dynamic-programming', 'recursion', 'memoization'],
  description: 'A string can be scrambled by recursively splitting it into two non-empty substrings and optionally swapping them, then applying the same process to each part. Given two strings s1 and s2 of the same length, return true if s2 is a scrambled string of s1, otherwise return false.',
  keywords: [
    'scramble string',
    'scrambled string',
    'string scramble',
    's2 is a scrambled string of s1',
    'recursive split swap',
    'binary tree scramble',
    'divide and swap substrings',
  ],
  signatures: [
    'scramble(?:d)?\\s+string',
    'scrambled\\s+string\\s+of\\s+s1',
    's2\\s+is\\s+a\\s+scrambled\\s+string',
    'rsively\\s+on\\s+each.*substrings',     // matches the truncated "...rsively on each of the two substrings" in user prompt
    'recursively\\s+on\\s+each.*substrings',
    'apply.*algorithm\\s+recursively.*substrings',
    'two\\s+non.?empty\\s+substrings.*swap',
    'divide\\s+at\\s+random\\s+index',
  ],
  complexity: { time: 'O(n^4) with memoization — n split points × n² substring pairs', space: 'O(n^3) memo table (bounded; n ≤ 30 so this is trivial)' },
  approach: 'Recursion with memoization. Two strings match if: (a) they are equal, or (b) there exists a split index i such that either the non-swapped halves both match (s1[0..i]↔s2[0..i] and s1[i..]↔s2[i..]), or the swapped halves both match (s1[0..i]↔s2[n-i..] and s1[i..]↔s2[0..n-i]). Before recursing, prune any pair whose character frequencies differ — that short-circuit is what keeps the worst case tractable. Memoize by the concatenated `s1|s2` pair since the same subproblem recurs often.',
  code: `/**
 * @param {string} s1
 * @param {string} s2
 * @return {boolean}
 */
function isScramble(s1, s2) {
  const memo = new Map();

  function solve(a, b) {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    const key = a + '|' + b;
    if (memo.has(key)) return memo.get(key);

    // Prune: both halves must contain the same multiset of characters.
    // If they don't, no split/swap can ever reconcile them.
    if (!sameCharCounts(a, b)) {
      memo.set(key, false);
      return false;
    }

    const n = a.length;
    for (let i = 1; i < n; i++) {
      // Case 1 — no swap: a[0..i] maps to b[0..i], a[i..] maps to b[i..]
      if (solve(a.slice(0, i), b.slice(0, i)) &&
          solve(a.slice(i),    b.slice(i))) {
        memo.set(key, true);
        return true;
      }
      // Case 2 — swap: a[0..i] maps to the LAST i chars of b, a[i..] maps to b[0..n-i]
      if (solve(a.slice(0, i), b.slice(n - i)) &&
          solve(a.slice(i),    b.slice(0, n - i))) {
        memo.set(key, true);
        return true;
      }
    }

    memo.set(key, false);
    return false;
  }

  return solve(s1, s2);
}

// 26-bucket char-count compare — O(n), far faster than sort().
function sameCharCounts(a, b) {
  const counts = new Int32Array(26);
  for (let i = 0; i < a.length; i++) {
    counts[a.charCodeAt(i) - 97]++;
    counts[b.charCodeAt(i) - 97]--;
  }
  for (let i = 0; i < 26; i++) if (counts[i] !== 0) return false;
  return true;
}`,
  tests: `console.log(isScramble('great', 'rgeat'));   // true  — example 1
console.log(isScramble('abcde', 'caebd'));    // false — example 2
console.log(isScramble('a', 'a'));            // true  — example 3
console.log(isScramble('abc', 'bca'));        // true  — split "a|bc", swap → "bc|a"? actually: "ab|c" swap → "c|ab" → recurse "ab" ↔ "ab" true, "c" ↔ "c" true
console.log(isScramble('abcd', 'bdac'));      // false — char counts match but no valid split/swap sequence reaches it
console.log(isScramble('eebaacbcbcadaaedceaaacadccd', 'eadcaacabaddaceacbceaabeccd')); // false — stress test that forces deep recursion`,
  relatedNumbers: [10, 44, 72], // other recursion + DP string problems
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

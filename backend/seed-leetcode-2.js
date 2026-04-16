/**
 * Seed LeetCode problems — Batch 2: Trees, Graphs, Dynamic Programming.
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const PROBLEMS = [
  {
    number: 94, title: 'Binary Tree Inorder Traversal', difficulty: 'Easy',
    topics: ['tree', 'dfs', 'stack'],
    description: 'Return the inorder traversal of a binary tree.',
    keywords: ['binary tree inorder', 'inorder traversal'],
    signatures: ['binary\\s+tree\\s+inorder', 'inorder\\s+traversal'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recursive: left, root, right. Iterative: stack + current pointer.',
    code: `function inorderTraversal(root) {
  const result = [];
  const stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop();
    result.push(curr.val);
    curr = curr.right;
  }
  return result;
}`,
    tests: `// [1,null,2,3] → [1,3,2]`,
  },
  {
    number: 98, title: 'Validate Binary Search Tree', difficulty: 'Medium',
    topics: ['tree', 'dfs', 'bst'],
    description: 'Determine if a binary tree is a valid BST.',
    keywords: ['validate binary search tree', 'valid bst', 'is bst'],
    signatures: ['validate\\s+binary\\s+search\\s+tree', 'valid\\s+bst\\b'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'DFS with (min, max) bounds. Every left subtree must be < node.val, right > node.val.',
    code: `function isValidBST(root) {
  const dfs = (node, min, max) => {
    if (!node) return true;
    if ((min !== null && node.val <= min) || (max !== null && node.val >= max)) return false;
    return dfs(node.left, min, node.val) && dfs(node.right, node.val, max);
  };
  return dfs(root, null, null);
}`,
    tests: `// [2,1,3] → true; [5,1,4,null,null,3,6] → false`,
  },
  {
    number: 100, title: 'Same Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs'],
    description: 'Check if two binary trees are identical.',
    keywords: ['same tree', 'identical tree', 'trees equal'],
    signatures: ['same\\s+tree', 'identical\\s+tree', 'trees?\\s+identical'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recursive: both null? equal val + same left + same right?',
    code: `function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q) return false;
  if (p.val !== q.val) return false;
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
    tests: `// Both [1,2,3] → true; [1,2] vs [1,null,2] → false`,
  },
  {
    number: 102, title: 'Binary Tree Level Order Traversal', difficulty: 'Medium',
    topics: ['tree', 'bfs'],
    description: 'Return the level order traversal of a binary tree.',
    keywords: ['level order traversal', 'binary tree levels', 'bfs tree'],
    signatures: ['level\\s+order\\s+traversal', 'binary\\s+tree.*level'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'BFS with queue, process one level at a time.',
    code: `function levelOrder(root) {
  if (!root) return [];
  const result = [], queue = [root];
  while (queue.length) {
    const level = [], size = queue.length;
    for (let i = 0; i < size; i++) {
      const n = queue.shift();
      level.push(n.val);
      if (n.left) queue.push(n.left);
      if (n.right) queue.push(n.right);
    }
    result.push(level);
  }
  return result;
}`,
    tests: `// [3,9,20,null,null,15,7] → [[3],[9,20],[15,7]]`,
  },
  {
    number: 104, title: 'Maximum Depth of Binary Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs'],
    description: 'Find the maximum depth of a binary tree.',
    keywords: ['maximum depth binary tree', 'tree depth', 'height of tree'],
    signatures: ['max(imum)?\\s+depth.*binary\\s+tree', 'depth\\s+of.*tree', 'height\\s+of\\s+tree'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recursive: 1 + max(leftDepth, rightDepth).',
    code: `function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
    tests: `// [3,9,20,null,null,15,7] → 3`,
  },
  {
    number: 105, title: 'Construct Binary Tree from Preorder and Inorder', difficulty: 'Medium',
    topics: ['tree', 'array', 'hash-table'],
    description: 'Build a tree from preorder + inorder arrays.',
    keywords: ['construct binary tree preorder inorder', 'build tree preorder'],
    signatures: ['construct\\s+binary\\s+tree.*preorder.*inorder', 'build\\s+tree.*preorder'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'First preorder element = root. Find in inorder to split left/right. Use hash map for O(1) lookup.',
    code: `function buildTree(preorder, inorder) {
  const map = new Map();
  inorder.forEach((v, i) => map.set(v, i));
  let preIdx = 0;
  const build = (lo, hi) => {
    if (lo > hi) return null;
    const val = preorder[preIdx++];
    const node = { val, left: null, right: null };
    const mid = map.get(val);
    node.left = build(lo, mid - 1);
    node.right = build(mid + 1, hi);
    return node;
  };
  return build(0, inorder.length - 1);
}`,
    tests: `// preorder=[3,9,20,15,7], inorder=[9,3,15,20,7] → [3,9,20,null,null,15,7]`,
  },
  {
    number: 124, title: 'Binary Tree Maximum Path Sum', difficulty: 'Hard',
    topics: ['tree', 'dfs'],
    description: 'Find the maximum path sum in a binary tree (path need not pass through root).',
    keywords: ['binary tree maximum path sum', 'max path sum', 'path sum tree'],
    signatures: ['max(imum)?\\s+path\\s+sum', 'binary\\s+tree.*path\\s+sum'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'DFS. Gain from node = val + max(leftGain, rightGain). Update global max with val + leftGain + rightGain (only negative branches ignored).',
    code: `function maxPathSum(root) {
  let max = -Infinity;
  const gain = (node) => {
    if (!node) return 0;
    const L = Math.max(gain(node.left), 0);
    const R = Math.max(gain(node.right), 0);
    max = Math.max(max, node.val + L + R);
    return node.val + Math.max(L, R);
  };
  gain(root);
  return max;
}`,
    tests: `// [-10,9,20,null,null,15,7] → 42`,
  },
  {
    number: 133, title: 'Clone Graph', difficulty: 'Medium',
    topics: ['graph', 'dfs', 'bfs', 'hash-table'],
    description: 'Return a deep copy of a connected graph.',
    keywords: ['clone graph', 'deep copy graph'],
    signatures: ['clone\\s+graph', 'deep\\s+copy.*graph'],
    complexity: { time: 'O(V + E)', space: 'O(V)' },
    approach: 'DFS with map (original → clone) to avoid cycles.',
    code: `function cloneGraph(node) {
  if (!node) return null;
  const map = new Map();
  const dfs = (n) => {
    if (map.has(n)) return map.get(n);
    const copy = { val: n.val, neighbors: [] };
    map.set(n, copy);
    for (const nb of n.neighbors) copy.neighbors.push(dfs(nb));
    return copy;
  };
  return dfs(node);
}`,
    tests: `// Returns deep copy of input graph`,
  },
  {
    number: 139, title: 'Word Break', difficulty: 'Medium',
    topics: ['string', 'dp', 'trie'],
    description: 'Can string s be segmented into space-separated words from the dictionary?',
    keywords: ['word break', 'segment string words', 'string into words'],
    signatures: ['word\\s+break\\b', 'segment.*string.*words'],
    complexity: { time: 'O(n²)', space: 'O(n)' },
    approach: 'DP: dp[i] = true if some j < i has dp[j] && s[j..i) in dict.',
    code: `function wordBreak(s, wordDict) {
  const set = new Set(wordDict);
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && set.has(s.slice(j, i))) { dp[i] = true; break; }
    }
  }
  return dp[s.length];
}`,
    tests: `console.log(wordBreak("leetcode", ["leet","code"]));   // true\nconsole.log(wordBreak("applepenapple", ["apple","pen"])); // true\nconsole.log(wordBreak("catsandog", ["cats","dog","sand","and","cat"])); // false`,
  },
  {
    number: 190, title: 'Reverse Bits', difficulty: 'Easy',
    topics: ['bit-manipulation'],
    description: 'Reverse bits of a given 32 bits unsigned integer.',
    keywords: ['reverse bits', '32 bit reverse', 'bit reversal'],
    signatures: ['reverse\\s+bits\\b', '32.?bit.*reverse'],
    complexity: { time: 'O(1)', space: 'O(1)' },
    approach: 'Shift result left, OR with lowest bit of input, shift input right. Repeat 32 times.',
    code: `function reverseBits(n) {
  let result = 0;
  for (let i = 0; i < 32; i++) {
    result = (result << 1) | (n & 1);
    n >>>= 1;
  }
  return result >>> 0;  // unsigned
}`,
    tests: `console.log(reverseBits(0b00000010100101000001111010011100));  // 964176192`,
  },
  {
    number: 191, title: 'Number of 1 Bits', difficulty: 'Easy',
    topics: ['bit-manipulation'],
    description: 'Count number of 1 bits in an integer (Hamming weight).',
    keywords: ['number of 1 bits', 'hamming weight', 'count bits'],
    signatures: ['number\\s+of\\s+1\\s*bits', 'hamming\\s+weight'],
    complexity: { time: 'O(k)', space: 'O(1)' },
    approach: 'Brian Kernighan: n & (n-1) drops the lowest 1-bit. Count iterations.',
    code: `function hammingWeight(n) {
  let count = 0;
  while (n) { n &= n - 1; count++; }
  return count;
}`,
    tests: `console.log(hammingWeight(11));          // 3 (binary 1011)\nconsole.log(hammingWeight(128));         // 1`,
  },
  {
    number: 211, title: 'Design Add and Search Words Data Structure', difficulty: 'Medium',
    topics: ['trie', 'design', 'dfs'],
    description: 'Design a data structure that supports addWord and search with "." wildcard.',
    keywords: ['add and search words', 'word dictionary', 'wildcard search'],
    signatures: ['add\\s+and\\s+search\\s+words', 'word\\s+dictionary'],
    complexity: { time: 'O(26^L)', space: 'O(L)' },
    approach: 'Trie with DFS. On ".", try all children.',
    code: `class WordDictionary {
  constructor() { this.root = {}; }
  addWord(word) {
    let node = this.root;
    for (const c of word) { node[c] ||= {}; node = node[c]; }
    node.end = true;
  }
  search(word) {
    const dfs = (node, i) => {
      if (i === word.length) return !!node.end;
      const c = word[i];
      if (c === '.') {
        for (const k in node) if (k !== 'end' && dfs(node[k], i + 1)) return true;
        return false;
      }
      return node[c] ? dfs(node[c], i + 1) : false;
    };
    return dfs(this.root, 0);
  }
}`,
    tests: `const d = new WordDictionary();\nd.addWord("bad"); d.addWord("dad"); d.addWord("mad");\nconsole.log(d.search("pad"));  // false\nconsole.log(d.search(".ad"));  // true\nconsole.log(d.search("b.."));  // true`,
  },
  {
    number: 213, title: 'House Robber II', difficulty: 'Medium',
    topics: ['array', 'dp'],
    description: 'Same as House Robber, but houses are arranged in a circle.',
    keywords: ['house robber ii', 'house robber circle', 'circular house robber'],
    signatures: ['house\\s+robber\\s+(ii|2)\\b', 'house.*robber.*circle'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Run linear House Robber twice: [0..n-2] and [1..n-1]. Take max.',
    code: `function rob(nums) {
  if (nums.length === 1) return nums[0];
  const linear = (arr) => {
    let prev2 = 0, prev1 = 0;
    for (const n of arr) { const c = Math.max(prev1, prev2 + n); prev2 = prev1; prev1 = c; }
    return prev1;
  };
  return Math.max(linear(nums.slice(0, -1)), linear(nums.slice(1)));
}`,
    tests: `console.log(rob([2,3,2]));     // 3\nconsole.log(rob([1,2,3,1]));  // 4`,
  },
  {
    number: 230, title: 'Kth Smallest Element in a BST', difficulty: 'Medium',
    topics: ['tree', 'dfs', 'bst'],
    description: 'Find the kth smallest element in a BST.',
    keywords: ['kth smallest bst', 'kth smallest binary search tree'],
    signatures: ['kth\\s+smallest.*bst', 'kth\\s+smallest.*binary\\s+search\\s+tree'],
    complexity: { time: 'O(h + k)', space: 'O(h)' },
    approach: 'In-order traversal (iterative with stack). Stop at kth node.',
    code: `function kthSmallest(root, k) {
  const stack = [];
  let curr = root;
  while (curr || stack.length) {
    while (curr) { stack.push(curr); curr = curr.left; }
    curr = stack.pop();
    if (--k === 0) return curr.val;
    curr = curr.right;
  }
  return -1;
}`,
    tests: `// [3,1,4,null,2], k=1 → 1`,
  },
  {
    number: 235, title: 'Lowest Common Ancestor of a BST', difficulty: 'Medium',
    topics: ['tree', 'bst'],
    description: 'Find the lowest common ancestor of two nodes in a BST.',
    keywords: ['lowest common ancestor bst', 'lca bst'],
    signatures: ['lowest\\s+common\\s+ancestor.*bst', 'lca.*bst'],
    complexity: { time: 'O(h)', space: 'O(1)' },
    approach: 'Walk from root. If both p and q < root → go left. If both > root → go right. Else current is LCA.',
    code: `function lowestCommonAncestor(root, p, q) {
  let curr = root;
  while (curr) {
    if (p.val < curr.val && q.val < curr.val) curr = curr.left;
    else if (p.val > curr.val && q.val > curr.val) curr = curr.right;
    else return curr;
  }
  return null;
}`,
    tests: `// Works for any BST with nodes p and q`,
  },
  {
    number: 268, title: 'Missing Number', difficulty: 'Easy',
    topics: ['array', 'bit-manipulation', 'math'],
    description: 'Find the missing number in [0, n] with n distinct numbers.',
    keywords: ['missing number', 'find missing'],
    signatures: ['missing\\s+number', 'find\\s+missing.*\\[0.*n\\]'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'XOR all indices + all values. Missing number remains.',
    code: `function missingNumber(nums) {
  let xor = nums.length;
  for (let i = 0; i < nums.length; i++) xor ^= i ^ nums[i];
  return xor;
}`,
    tests: `console.log(missingNumber([3,0,1]));      // 2\nconsole.log(missingNumber([0,1]));        // 2\nconsole.log(missingNumber([9,6,4,2,3,5,7,0,1])); // 8`,
  },
  {
    number: 271, title: 'Encode and Decode Strings', difficulty: 'Medium',
    topics: ['string', 'design'],
    description: 'Design encode/decode for a list of strings so decode recovers exactly.',
    keywords: ['encode and decode strings', 'encode strings list'],
    signatures: ['encode\\s+and\\s+decode\\s+strings', 'encode.*decode.*strings'],
    complexity: { time: 'O(N)', space: 'O(N)' },
    approach: "Prefix each string with its length + delimiter (e.g. '5#hello').",
    code: `function encode(strs) {
  return strs.map(s => s.length + '#' + s).join('');
}
function decode(s) {
  const result = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (s[j] !== '#') j++;
    const len = Number(s.slice(i, j));
    result.push(s.slice(j + 1, j + 1 + len));
    i = j + 1 + len;
  }
  return result;
}`,
    tests: `console.log(decode(encode(["hello","world","","#split"])));  // ["hello","world","","#split"]`,
  },
  {
    number: 295, title: 'Find Median from Data Stream', difficulty: 'Hard',
    topics: ['heap', 'design', 'stream'],
    description: 'Design class to add nums and return median so far.',
    keywords: ['find median data stream', 'median stream', 'running median'],
    signatures: ['median.*data\\s+stream', 'running\\s+median'],
    complexity: { time: 'O(log n) add, O(1) get', space: 'O(n)' },
    approach: 'Two heaps: max-heap of lower half, min-heap of upper half. Balance sizes.',
    code: `class MedianFinder {
  constructor() {
    this.low = [];   // max-heap (store as negative for min-heap trick)
    this.high = [];  // min-heap
  }
  _pushLow(v) {
    this.low.push(-v);
    this.low.sort((a, b) => a - b);
  }
  _pushHigh(v) {
    this.high.push(v);
    this.high.sort((a, b) => a - b);
  }
  addNum(num) {
    if (this.low.length === 0 || num <= -this.low[0]) this._pushLow(num);
    else this._pushHigh(num);
    if (this.low.length > this.high.length + 1) this._pushHigh(-this.low.shift());
    else if (this.high.length > this.low.length) this._pushLow(this.high.shift());
  }
  findMedian() {
    if (this.low.length > this.high.length) return -this.low[0];
    return (-this.low[0] + this.high[0]) / 2;
  }
}`,
    tests: `const m = new MedianFinder();\nm.addNum(1); m.addNum(2);\nconsole.log(m.findMedian()); // 1.5\nm.addNum(3);\nconsole.log(m.findMedian()); // 2`,
  },
  {
    number: 297, title: 'Serialize and Deserialize Binary Tree', difficulty: 'Hard',
    topics: ['tree', 'design', 'bfs', 'dfs'],
    description: 'Design serialize/deserialize for a binary tree.',
    keywords: ['serialize deserialize binary tree', 'encode decode tree'],
    signatures: ['serialize.*deserialize.*binary\\s+tree', 'encode.*decode.*tree'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Preorder DFS with null markers.',
    code: `function serialize(root) {
  const parts = [];
  const dfs = (n) => {
    if (!n) { parts.push('null'); return; }
    parts.push(String(n.val));
    dfs(n.left);
    dfs(n.right);
  };
  dfs(root);
  return parts.join(',');
}
function deserialize(data) {
  const tokens = data.split(',');
  let i = 0;
  const build = () => {
    if (tokens[i] === 'null') { i++; return null; }
    const node = { val: Number(tokens[i++]), left: null, right: null };
    node.left = build();
    node.right = build();
    return node;
  };
  return build();
}`,
    tests: `const tree = deserialize(serialize({val:1,left:{val:2,left:null,right:null},right:{val:3,left:null,right:null}}));\nconsole.log(tree.val); // 1`,
  },
  {
    number: 417, title: 'Pacific Atlantic Water Flow', difficulty: 'Medium',
    topics: ['graph', 'dfs', 'bfs', 'matrix'],
    description: 'Return cells from which water can flow to both oceans.',
    keywords: ['pacific atlantic water flow', 'water flow oceans'],
    signatures: ['pacific\\s+atlantic', 'water\\s+flow.*ocean'],
    complexity: { time: 'O(m·n)', space: 'O(m·n)' },
    approach: 'Two DFS from each ocean. Mark cells reachable from each. Return intersection.',
    code: `function pacificAtlantic(heights) {
  if (!heights.length) return [];
  const m = heights.length, n = heights[0].length;
  const pac = Array.from({length: m}, () => new Array(n).fill(false));
  const atl = Array.from({length: m}, () => new Array(n).fill(false));
  const dfs = (i, j, visited, prev) => {
    if (i < 0 || i >= m || j < 0 || j >= n || visited[i][j] || heights[i][j] < prev) return;
    visited[i][j] = true;
    dfs(i+1,j,visited,heights[i][j]);
    dfs(i-1,j,visited,heights[i][j]);
    dfs(i,j+1,visited,heights[i][j]);
    dfs(i,j-1,visited,heights[i][j]);
  };
  for (let i = 0; i < m; i++) { dfs(i, 0, pac, -1); dfs(i, n-1, atl, -1); }
  for (let j = 0; j < n; j++) { dfs(0, j, pac, -1); dfs(m-1, j, atl, -1); }
  const result = [];
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++)
    if (pac[i][j] && atl[i][j]) result.push([i, j]);
  return result;
}`,
    tests: `// Example grid returns cells reachable to both oceans`,
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  let inserted = 0, updated = 0;
  for (const p of PROBLEMS) {
    const result = await LeetProblem.findOneAndUpdate(
      { number: p.number }, p,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
    else updated++;
  }
  console.log(`Batch 2: ${inserted} inserted, ${updated} updated`);
  const total = await LeetProblem.countDocuments();
  console.log(`Total: ${total}\n`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

/**
 * Seed LeetCode problems — Batch 3: Linked lists, Matrix, Sliding Window, Misc.
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const PROBLEMS = [
  {
    number: 2, title: 'Add Two Numbers', difficulty: 'Medium',
    topics: ['linked-list', 'math'],
    description: 'Add two non-negative integers represented as reversed linked lists.',
    keywords: ['add two numbers', 'sum linked lists', 'add linked lists'],
    signatures: ['add\\s+two\\s+numbers.*linked\\s+list', 'sum.*linked\\s+lists'],
    complexity: { time: 'O(max(m,n))', space: 'O(max(m,n))' },
    approach: 'Traverse both lists with carry. Create new nodes for each digit of sum.',
    code: `function addTwoNumbers(l1, l2) {
  const dummy = { val: 0, next: null };
  let tail = dummy, carry = 0;
  while (l1 || l2 || carry) {
    const sum = (l1?.val || 0) + (l2?.val || 0) + carry;
    carry = Math.floor(sum / 10);
    tail.next = { val: sum % 10, next: null };
    tail = tail.next;
    l1 = l1?.next; l2 = l2?.next;
  }
  return dummy.next;
}`,
    tests: `// 342 + 465 = 807 → [2,4,3] + [5,6,4] = [7,0,8]`,
  },
  {
    number: 48, title: 'Rotate Image', difficulty: 'Medium',
    topics: ['array', 'matrix'],
    description: 'Rotate an n×n 2D matrix 90° clockwise in-place.',
    keywords: ['rotate image', 'rotate matrix', 'rotate 90 degrees'],
    signatures: ['rotate\\s+image', 'rotate.*matrix\\s+90'],
    complexity: { time: 'O(n²)', space: 'O(1)' },
    approach: 'Transpose matrix, then reverse each row.',
    code: `function rotate(matrix) {
  const n = matrix.length;
  // Transpose
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
  // Reverse each row
  for (const row of matrix) row.reverse();
}`,
    tests: `const m = [[1,2,3],[4,5,6],[7,8,9]];\nrotate(m);\nconsole.log(m);  // [[7,4,1],[8,5,2],[9,6,3]]`,
  },
  {
    number: 76, title: 'Minimum Window Substring', difficulty: 'Hard',
    topics: ['string', 'sliding-window', 'hash-table'],
    description: 'Find the minimum substring of s that contains all chars of t.',
    keywords: ['minimum window substring', 'smallest window', 'contains all characters'],
    signatures: ['min(imum)?\\s+window\\s+substring', 'minimum\\s+window.*contain'],
    complexity: { time: 'O(n)', space: 'O(k)' },
    approach: 'Sliding window with char frequency map. Expand right until all of t is covered, then shrink from left.',
    code: `function minWindow(s, t) {
  if (t.length > s.length) return '';
  const need = new Map();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let left = 0, haveMatches = 0, required = need.size;
  const have = new Map();
  let bestLen = Infinity, bestL = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    have.set(c, (have.get(c) || 0) + 1);
    if (need.has(c) && have.get(c) === need.get(c)) haveMatches++;
    while (haveMatches === required) {
      if (right - left + 1 < bestLen) { bestLen = right - left + 1; bestL = left; }
      const lc = s[left];
      have.set(lc, have.get(lc) - 1);
      if (need.has(lc) && have.get(lc) < need.get(lc)) haveMatches--;
      left++;
    }
  }
  return bestLen === Infinity ? '' : s.slice(bestL, bestL + bestLen);
}`,
    tests: `console.log(minWindow("ADOBECODEBANC", "ABC"));  // "BANC"\nconsole.log(minWindow("a", "aa"));               // ""`,
  },
  {
    number: 143, title: 'Reorder List', difficulty: 'Medium',
    topics: ['linked-list', 'two-pointers', 'stack'],
    description: 'Reorder L0→L1→…→Ln → L0→Ln→L1→Ln-1→...',
    keywords: ['reorder list', 'reorder linked list'],
    signatures: ['reorder\\s+list', 'reorder.*linked\\s+list'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Find middle, reverse second half, merge two halves alternately.',
    code: `function reorderList(head) {
  if (!head?.next) return;
  let slow = head, fast = head;
  while (fast.next && fast.next.next) { slow = slow.next; fast = fast.next.next; }
  let prev = null, curr = slow.next;
  slow.next = null;
  while (curr) { const n = curr.next; curr.next = prev; prev = curr; curr = n; }
  let first = head, second = prev;
  while (second) {
    const t1 = first.next, t2 = second.next;
    first.next = second; second.next = t1;
    first = t1; second = t2;
  }
}`,
    tests: `// [1,2,3,4,5] → [1,5,2,4,3]`,
  },
  {
    number: 252, title: 'Meeting Rooms', difficulty: 'Easy',
    topics: ['array', 'sorting'],
    description: 'Can a person attend all meetings? (Already covered in batch 1 — duplicate guard)',
    keywords: ['meeting rooms easy'],
    signatures: ['meeting\\s+rooms?\\s+easy'],
    complexity: { time: 'O(n log n)', space: 'O(1)' },
    approach: 'Sort by start time, check adjacent overlaps.',
    code: `function canAttendMeetings(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i++)
    if (intervals[i][0] < intervals[i-1][1]) return false;
  return true;
}`,
    tests: `console.log(canAttendMeetings([[0,30],[5,10]]));  // false`,
  },
  {
    number: 238, title: 'Product of Array Except Self', difficulty: 'Medium',
    topics: ['array', 'prefix-sum'],
    description: '(Already covered in batch 1 — skipping)',
    keywords: ['_skip_'],
    signatures: ['_skip_this_number_only_'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Skip — already in batch 1.',
    code: '// Already in batch 1',
    tests: '',
  },
  {
    number: 3, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium',
    topics: ['string', 'sliding-window', 'hash-table'],
    description: '(Already covered in-memory — skipping)',
    keywords: ['_skip_lssnr_'],
    signatures: ['_skip_this_number_only_lssnr'],
    complexity: { time: 'O(n)', space: 'O(k)' },
    approach: 'Skip — already in-memory.',
    code: '// In-memory',
    tests: '',
  },
  {
    number: 560, title: 'Subarray Sum Equals K', difficulty: 'Medium',
    topics: ['array', 'hash-table', 'prefix-sum'],
    description: 'Count subarrays whose sum equals k.',
    keywords: ['subarray sum equals k', 'subarrays sum k', 'count subarrays sum'],
    signatures: ['subarray\\s+sum\\s+equals', 'count.*subarrays.*sum\\s+k'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Prefix sum + hash map. For each prefix, count how many earlier prefixes have (prefix - k).',
    code: `function subarraySum(nums, k) {
  const map = new Map([[0, 1]]);
  let sum = 0, count = 0;
  for (const n of nums) {
    sum += n;
    count += map.get(sum - k) || 0;
    map.set(sum, (map.get(sum) || 0) + 1);
  }
  return count;
}`,
    tests: `console.log(subarraySum([1,1,1], 2));       // 2\nconsole.log(subarraySum([1,2,3], 3));        // 2`,
  },
  {
    number: 739, title: 'Daily Temperatures', difficulty: 'Medium',
    topics: ['array', 'stack', 'monotonic-stack'],
    description: 'For each day, find number of days until a warmer temperature.',
    keywords: ['daily temperatures', 'next warmer day', 'warmer temperature'],
    signatures: ['daily\\s+temperatures', 'next\\s+warmer\\s+day'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Monotonic decreasing stack of indices. Pop when current > stack top.',
    code: `function dailyTemperatures(temps) {
  const result = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const idx = stack.pop();
      result[idx] = i - idx;
    }
    stack.push(i);
  }
  return result;
}`,
    tests: `console.log(dailyTemperatures([73,74,75,71,69,72,76,73]));  // [1,1,4,2,1,1,0,0]`,
  },
  {
    number: 1143, title: 'Longest Common Subsequence', difficulty: 'Medium',
    topics: ['string', 'dp'],
    description: 'Find the length of the longest common subsequence of two strings.',
    keywords: ['longest common subsequence', 'lcs'],
    signatures: ['longest\\s+common\\s+subsequence', '\\blcs\\b'],
    complexity: { time: 'O(m·n)', space: 'O(m·n)' },
    approach: 'DP: dp[i][j] = 1 + dp[i-1][j-1] if chars match, else max(dp[i-1][j], dp[i][j-1]).',
    code: `function longestCommonSubsequence(text1, text2) {
  const m = text1.length, n = text2.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (text1[i-1] === text2[j-1]) dp[i][j] = dp[i-1][j-1] + 1;
      else dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
    }
  }
  return dp[m][n];
}`,
    tests: `console.log(longestCommonSubsequence("abcde", "ace"));  // 3\nconsole.log(longestCommonSubsequence("abc", "abc"));    // 3`,
  },
  {
    number: 572, title: 'Subtree of Another Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs'],
    description: 'Check if subRoot appears as a subtree of root.',
    keywords: ['subtree of another tree', 'is subtree'],
    signatures: ['subtree\\s+of\\s+another\\s+tree', 'is\\s+subtree'],
    complexity: { time: 'O(m·n)', space: 'O(h)' },
    approach: 'For each node in root, check if tree rooted there is identical to subRoot.',
    code: `function isSubtree(root, subRoot) {
  const same = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b || a.val !== b.val) return false;
    return same(a.left, b.left) && same(a.right, b.right);
  };
  if (!root) return false;
  if (same(root, subRoot)) return true;
  return isSubtree(root.left, subRoot) || isSubtree(root.right, subRoot);
}`,
    tests: `// [3,4,5,1,2], [4,1,2] → true`,
  },
  {
    number: 287, title: 'Find the Duplicate Number', difficulty: 'Medium',
    topics: ['array', 'two-pointers', 'cycle-detection'],
    description: 'Find the duplicate number in [1..n] array with n+1 entries.',
    keywords: ['find duplicate number', 'duplicate number'],
    signatures: ['find\\s+(the\\s+)?duplicate\\s+number', 'find\\s+duplicate'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: "Floyd's cycle detection on the value-as-pointer sequence.",
    code: `function findDuplicate(nums) {
  let slow = nums[0], fast = nums[0];
  do { slow = nums[slow]; fast = nums[nums[fast]]; } while (slow !== fast);
  slow = nums[0];
  while (slow !== fast) { slow = nums[slow]; fast = nums[fast]; }
  return slow;
}`,
    tests: `console.log(findDuplicate([1,3,4,2,2]));   // 2\nconsole.log(findDuplicate([3,1,3,4,2]));  // 3`,
  },
  {
    number: 416, title: 'Partition Equal Subset Sum', difficulty: 'Medium',
    topics: ['array', 'dp'],
    description: 'Can array be partitioned into two subsets with equal sum?',
    keywords: ['partition equal subset sum', 'equal subset sum', 'partition subset'],
    signatures: ['partition\\s+equal\\s+subset', 'equal\\s+subset\\s+sum'],
    complexity: { time: 'O(n·s)', space: 'O(s)' },
    approach: '0/1 knapsack with target = totalSum/2. dp[i] = can reach sum i.',
    code: `function canPartition(nums) {
  const sum = nums.reduce((a, b) => a + b, 0);
  if (sum % 2) return false;
  const target = sum / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const n of nums) {
    for (let s = target; s >= n; s--) dp[s] = dp[s] || dp[s - n];
  }
  return dp[target];
}`,
    tests: `console.log(canPartition([1,5,11,5]));  // true\nconsole.log(canPartition([1,2,3,5]));    // false`,
  },
  {
    number: 540, title: 'Single Element in a Sorted Array', difficulty: 'Medium',
    topics: ['array', 'binary-search'],
    description: 'Find the only element appearing once in a sorted array. O(log n).',
    keywords: ['single element sorted array', 'single non-duplicate'],
    signatures: ['single\\s+element.*sorted', 'single\\s+non.?duplicate'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    approach: 'Binary search. At even index, pair should start: if matches right neighbor → single is to the right.',
    code: `function singleNonDuplicate(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    let mid = (lo + hi) >> 1;
    if (mid % 2 === 1) mid--;
    if (nums[mid] === nums[mid + 1]) lo = mid + 2;
    else hi = mid;
  }
  return nums[lo];
}`,
    tests: `console.log(singleNonDuplicate([1,1,2,3,3,4,4,8,8]));  // 2\nconsole.log(singleNonDuplicate([3,3,7,7,10,11,11]));  // 10`,
  },
  {
    number: 543, title: 'Diameter of Binary Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs'],
    description: 'Length of the longest path between any two nodes (edges).',
    keywords: ['diameter of binary tree', 'longest path tree', 'tree diameter'],
    signatures: ['diameter\\s+of\\s+binary\\s+tree', 'longest\\s+path.*tree'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'DFS returning depth. At each node, diameter = leftDepth + rightDepth. Track global max.',
    code: `function diameterOfBinaryTree(root) {
  let best = 0;
  const depth = (n) => {
    if (!n) return 0;
    const L = depth(n.left), R = depth(n.right);
    best = Math.max(best, L + R);
    return 1 + Math.max(L, R);
  };
  depth(root);
  return best;
}`,
    tests: `// [1,2,3,4,5] → 3`,
  },
  {
    number: 647, title: 'Palindromic Substrings', difficulty: 'Medium',
    topics: ['string', 'dp'],
    description: 'Count the number of palindromic substrings.',
    keywords: ['palindromic substrings', 'count palindromes'],
    signatures: ['palindromic\\s+substrings', 'count.*palindromes'],
    complexity: { time: 'O(n²)', space: 'O(1)' },
    approach: 'Expand around every center (n odd + n-1 even centers).',
    code: `function countSubstrings(s) {
  let count = 0;
  const expand = (l, r) => {
    while (l >= 0 && r < s.length && s[l] === s[r]) { count++; l--; r++; }
  };
  for (let i = 0; i < s.length; i++) { expand(i, i); expand(i, i + 1); }
  return count;
}`,
    tests: `console.log(countSubstrings("abc"));   // 3\nconsole.log(countSubstrings("aaa"));   // 6`,
  },
  {
    number: 703, title: 'Kth Largest Element in a Stream', difficulty: 'Easy',
    topics: ['heap', 'design', 'stream'],
    description: 'Design class to return the kth largest after each add().',
    keywords: ['kth largest stream', 'kth largest in stream'],
    signatures: ['kth\\s+largest.*stream', 'kth\\s+largest.*in\\s+a\\s+stream'],
    complexity: { time: 'O(log k) per add', space: 'O(k)' },
    approach: 'Maintain min-heap of size k. Top = kth largest.',
    code: `class KthLargest {
  constructor(k, nums) {
    this.k = k;
    this.heap = [];
    for (const n of nums) this.add(n);
  }
  add(val) {
    if (this.heap.length < this.k) { this._push(val); }
    else if (val > this.heap[0]) { this.heap[0] = val; this._sink(0); }
    return this.heap[0];
  }
  _push(v) { this.heap.push(v); this._up(this.heap.length - 1); }
  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p] <= this.heap[i]) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }
  _sink(i) {
    const n = this.heap.length;
    while (true) {
      const l = 2*i+1, r = 2*i+2;
      let s = i;
      if (l < n && this.heap[l] < this.heap[s]) s = l;
      if (r < n && this.heap[r] < this.heap[s]) s = r;
      if (s === i) break;
      [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]];
      i = s;
    }
  }
}`,
    tests: `const k = new KthLargest(3, [4,5,8,2]);\nconsole.log(k.add(3));  // 4\nconsole.log(k.add(10)); // 5`,
  },
  {
    number: 875, title: 'Koko Eating Bananas', difficulty: 'Medium',
    topics: ['array', 'binary-search'],
    description: "Find the minimum eating speed to finish bananas within h hours.",
    keywords: ['koko eating bananas', 'min eating speed', 'bananas hours'],
    signatures: ['koko.*bananas', 'min(imum)?\\s+eating\\s+speed'],
    complexity: { time: 'O(n log max)', space: 'O(1)' },
    approach: 'Binary search on speed. Can finish at speed k in ≤ h hours?',
    code: `function minEatingSpeed(piles, h) {
  const canFinish = (k) => piles.reduce((s, p) => s + Math.ceil(p / k), 0) <= h;
  let lo = 1, hi = Math.max(...piles);
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (canFinish(mid)) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}`,
    tests: `console.log(minEatingSpeed([3,6,7,11], 8));          // 4\nconsole.log(minEatingSpeed([30,11,23,4,20], 5));     // 30\nconsole.log(minEatingSpeed([30,11,23,4,20], 6));     // 23`,
  },
  {
    number: 981, title: 'Time Based Key-Value Store', difficulty: 'Medium',
    topics: ['hash-table', 'binary-search', 'design'],
    description: 'Design a time-based key-value store with set(k,v,t) and get(k,t).',
    keywords: ['time based key value store', 'timemap'],
    signatures: ['time.?based\\s+key.?value\\s+store', 'timemap'],
    complexity: { time: 'O(log n) get', space: 'O(n)' },
    approach: 'Map key → sorted list of [timestamp, value]. Binary search on get.',
    code: `class TimeMap {
  constructor() { this.store = new Map(); }
  set(key, value, timestamp) {
    if (!this.store.has(key)) this.store.set(key, []);
    this.store.get(key).push([timestamp, value]);
  }
  get(key, timestamp) {
    const arr = this.store.get(key) || [];
    let lo = 0, hi = arr.length - 1, result = '';
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid][0] <= timestamp) { result = arr[mid][1]; lo = mid + 1; }
      else hi = mid - 1;
    }
    return result;
  }
}`,
    tests: `const t = new TimeMap();\nt.set("foo", "bar", 1);\nconsole.log(t.get("foo", 1)); // "bar"\nconsole.log(t.get("foo", 3)); // "bar"\nt.set("foo", "bar2", 4);\nconsole.log(t.get("foo", 4)); // "bar2"`,
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  // Skip placeholder entries
  const real = PROBLEMS.filter(p => !p.keywords?.includes('_skip_') && !p.keywords?.includes('_skip_lssnr_') && !p.signatures?.[0]?.includes('_skip'));

  let inserted = 0, updated = 0;
  for (const p of real) {
    const result = await LeetProblem.findOneAndUpdate(
      { number: p.number }, p,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt.getTime() === result.updatedAt.getTime()) inserted++;
    else updated++;
  }
  console.log(`Batch 3: ${inserted} inserted, ${updated} updated`);
  const total = await LeetProblem.countDocuments();
  console.log(`Total: ${total}\n`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

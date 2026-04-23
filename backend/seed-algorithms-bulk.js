/**
 * Bulk-seed 30 core algorithms into LeetProblem.
 * After running, do: node backfill-embeddings.js  (to generate vectors)
 * Then queries like "reverse a linked list", "check palindrome", "find cycle",
 * "binary search", "climb stairs", "merge sort", "coin change", etc. will resolve
 * against these entries through /api/knowledge/generate-code-semantic.
 *
 * Run: node seed-algorithms-bulk.js
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const PROBLEMS = [
  {
    number: 9, title: 'Palindrome Number', difficulty: 'Easy',
    topics: ['math'],
    description: 'Given an integer x, return true if x is a palindrome.',
    keywords: ['palindrome number', 'integer palindrome', 'check palindrome number'],
    signatures: ['palindrome\\s+number', 'is.*palindrome.*integer'],
    complexity: { time: 'O(log₁₀ n)', space: 'O(1)' },
    approach: 'Reverse half the digits and compare to the other half. Negative numbers and multiples of 10 (except 0) are never palindromes.',
    code: `function isPalindrome(x) {
  if (x < 0 || (x % 10 === 0 && x !== 0)) return false;
  let rev = 0;
  while (x > rev) {
    rev = rev * 10 + x % 10;
    x = Math.floor(x / 10);
  }
  return x === rev || x === Math.floor(rev / 10);
}`,
    tests: `console.log(isPalindrome(121));   // true
console.log(isPalindrome(-121));  // false
console.log(isPalindrome(10));    // false`,
  },
  {
    number: 20, title: 'Valid Parentheses', difficulty: 'Easy',
    topics: ['string', 'stack'],
    description: 'Given a string of (){}[] brackets, return true if valid (open and close matched in order).',
    keywords: ['valid parentheses', 'balanced brackets', 'matching parens', 'bracket matching'],
    signatures: ['valid\\s+parenth', 'balanced\\s+brackets', 'matching\\s+paren'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Push openers onto a stack; on a closer, pop and verify it matches. String is valid iff stack is empty at end.',
    code: `function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const c of s) {
    if (c === '(' || c === '[' || c === '{') stack.push(c);
    else if (stack.pop() !== pairs[c]) return false;
  }
  return stack.length === 0;
}`,
    tests: `console.log(isValid('()[]{}')); // true
console.log(isValid('(]'));     // false
console.log(isValid('([)]'));   // false`,
  },
  {
    number: 21, title: 'Merge Two Sorted Lists', difficulty: 'Easy',
    topics: ['linked-list', 'recursion'],
    description: 'Merge two sorted linked lists into one sorted list.',
    keywords: ['merge sorted lists', 'combine linked lists', 'merge two linked lists'],
    signatures: ['merge\\s+two\\s+sorted', 'merge.*linked\\s+lists?'],
    complexity: { time: 'O(n+m)', space: 'O(1)' },
    approach: 'Use a dummy head and a tail pointer. Walk both lists, appending the smaller node; when one runs out, attach the rest of the other.',
    code: `function mergeTwoLists(l1, l2) {
  const dummy = { val: 0, next: null };
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  return dummy.next;
}`,
    tests: '',
  },
  {
    number: 26, title: 'Remove Duplicates from Sorted Array', difficulty: 'Easy',
    topics: ['array', 'two-pointers'],
    description: 'Remove duplicates in-place from a sorted array, return new length.',
    keywords: ['remove duplicates', 'dedupe sorted array', 'unique elements in place'],
    signatures: ['remove\\s+duplicates.*sorted', 'dedupe.*array'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Two pointers: slow writes the next unique element, fast scans. When fast sees something new, copy it to slow+1.',
    code: `function removeDuplicates(nums) {
  if (nums.length === 0) return 0;
  let slow = 0;
  for (let fast = 1; fast < nums.length; fast++) {
    if (nums[fast] !== nums[slow]) {
      slow++;
      nums[slow] = nums[fast];
    }
  }
  return slow + 1;
}`,
    tests: `console.log(removeDuplicates([1,1,2]));       // 2
console.log(removeDuplicates([0,0,1,1,1,2,2,3])); // 5`,
  },
  {
    number: 33, title: 'Search in Rotated Sorted Array', difficulty: 'Medium',
    topics: ['array', 'binary-search'],
    description: 'Array sorted then rotated at unknown pivot. Find target in O(log n).',
    keywords: ['search rotated array', 'rotated sorted array search', 'binary search rotated'],
    signatures: ['search.*rotated.*sorted', 'rotated.*sorted.*search'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    approach: 'Modified binary search. At each step, one half is sorted — decide which, then check if target lies in it.',
    code: `function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const m = (l + r) >> 1;
    if (nums[m] === target) return m;
    if (nums[l] <= nums[m]) {
      if (nums[l] <= target && target < nums[m]) r = m - 1;
      else l = m + 1;
    } else {
      if (nums[m] < target && target <= nums[r]) l = m + 1;
      else r = m - 1;
    }
  }
  return -1;
}`,
    tests: `console.log(search([4,5,6,7,0,1,2], 0)); // 4
console.log(search([4,5,6,7,0,1,2], 3)); // -1`,
  },
  {
    number: 46, title: 'Permutations', difficulty: 'Medium',
    topics: ['array', 'backtracking'],
    description: 'Return all possible permutations of a distinct-integer array.',
    keywords: ['permutations', 'all permutations', 'generate permutations'],
    signatures: ['permutations?', 'all\\s+permutations', 'generate\\s+permutations'],
    complexity: { time: 'O(n·n!)', space: 'O(n)' },
    approach: 'Backtracking. Track a used[] array; at each depth, try every unused number.',
    code: `function permute(nums) {
  const res = [], used = new Array(nums.length).fill(false), cur = [];
  const dfs = () => {
    if (cur.length === nums.length) { res.push([...cur]); return; }
    for (let i = 0; i < nums.length; i++) {
      if (used[i]) continue;
      used[i] = true; cur.push(nums[i]);
      dfs();
      cur.pop(); used[i] = false;
    }
  };
  dfs();
  return res;
}`,
    tests: 'console.log(permute([1,2,3])); // 6 perms',
  },
  {
    number: 48, title: 'Rotate Image', difficulty: 'Medium',
    topics: ['array', 'matrix'],
    description: 'Rotate an n×n matrix 90° clockwise in place.',
    keywords: ['rotate matrix', 'rotate image', '90 degrees matrix'],
    signatures: ['rotate\\s+(matrix|image)', '90\\s+degrees?.*matrix'],
    complexity: { time: 'O(n²)', space: 'O(1)' },
    approach: 'Transpose (swap across diagonal) then reverse each row. Equivalent to rotating 90° clockwise.',
    code: `function rotate(matrix) {
  const n = matrix.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      [matrix[i][j], matrix[j][i]] = [matrix[j][i], matrix[i][j]];
  for (const row of matrix) row.reverse();
}`,
    tests: '',
  },
  {
    number: 53, title: 'Maximum Subarray', difficulty: 'Medium',
    topics: ['array', 'dynamic-programming', 'kadane'],
    description: 'Find the contiguous subarray with the largest sum.',
    keywords: ['maximum subarray', 'max sum subarray', 'kadane', 'largest sum contiguous'],
    signatures: ['max(imum)?\\s+subarray', 'kadane', 'largest.*contiguous.*sum'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: "Kadane's algorithm. Track running sum; reset to current value whenever adding it beats continuing the previous sum.",
    code: `function maxSubArray(nums) {
  let best = nums[0], cur = nums[0];
  for (let i = 1; i < nums.length; i++) {
    cur = Math.max(nums[i], cur + nums[i]);
    best = Math.max(best, cur);
  }
  return best;
}`,
    tests: 'console.log(maxSubArray([-2,1,-3,4,-1,2,1,-5,4])); // 6',
  },
  {
    number: 70, title: 'Climbing Stairs', difficulty: 'Easy',
    topics: ['math', 'dynamic-programming', 'fibonacci'],
    description: 'You can climb 1 or 2 steps at a time. How many distinct ways to reach step n?',
    keywords: ['climbing stairs', 'stairs ways', 'fibonacci stairs', 'climb steps'],
    signatures: ['climbing\\s+stairs', 'climb.*steps?', 'stairs.*ways'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Fibonacci recurrence: f(n) = f(n-1) + f(n-2). Only need two previous values.',
    code: `function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}`,
    tests: `console.log(climbStairs(2)); // 2
console.log(climbStairs(5)); // 8`,
  },
  {
    number: 78, title: 'Subsets', difficulty: 'Medium',
    topics: ['array', 'backtracking', 'bit-manipulation'],
    description: 'Return all possible subsets (the power set) of a distinct-integer array.',
    keywords: ['subsets', 'power set', 'all subsets'],
    signatures: ['subsets?', 'power\\s+set', 'all\\s+subsets'],
    complexity: { time: 'O(n·2ⁿ)', space: 'O(n)' },
    approach: 'Backtracking. At each index, either include or skip the element; every leaf is a subset.',
    code: `function subsets(nums) {
  const res = [], cur = [];
  const dfs = (i) => {
    if (i === nums.length) { res.push([...cur]); return; }
    dfs(i + 1);
    cur.push(nums[i]);
    dfs(i + 1);
    cur.pop();
  };
  dfs(0);
  return res;
}`,
    tests: 'console.log(subsets([1,2,3])); // 8 subsets',
  },
  {
    number: 98, title: 'Validate Binary Search Tree', difficulty: 'Medium',
    topics: ['tree', 'dfs', 'bst'],
    description: 'Determine if a binary tree is a valid BST.',
    keywords: ['validate bst', 'is bst', 'valid binary search tree'],
    signatures: ['validate.*bst', 'valid.*binary\\s+search\\s+tree', 'is.*bst'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'DFS passing down (min, max) bounds. Every node must satisfy min < val < max; recurse with tightened bounds.',
    code: `function isValidBST(root, min = -Infinity, max = Infinity) {
  if (!root) return true;
  if (root.val <= min || root.val >= max) return false;
  return isValidBST(root.left, min, root.val) &&
         isValidBST(root.right, root.val, max);
}`,
    tests: '',
  },
  {
    number: 100, title: 'Same Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs'],
    description: 'Return true if two binary trees are structurally identical with equal node values.',
    keywords: ['same tree', 'identical trees', 'compare trees'],
    signatures: ['same\\s+tree', 'identical\\s+trees?', 'compare.*binary\\s+trees?'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recurse both in parallel. Both null → match. One null or values differ → mismatch.',
    code: `function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q || p.val !== q.val) return false;
  return isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
    tests: '',
  },
  {
    number: 102, title: 'Binary Tree Level Order Traversal', difficulty: 'Medium',
    topics: ['tree', 'bfs'],
    description: 'Return node values per level, top to bottom.',
    keywords: ['level order traversal', 'bfs tree', 'tree by levels'],
    signatures: ['level\\s+order', 'bfs.*tree', 'tree.*levels?'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'BFS with a queue; per iteration, drain exactly queue.length nodes so each pass corresponds to one level.',
    code: `function levelOrder(root) {
  if (!root) return [];
  const res = [], q = [root];
  while (q.length) {
    const level = [], n = q.length;
    for (let i = 0; i < n; i++) {
      const node = q.shift();
      level.push(node.val);
      if (node.left) q.push(node.left);
      if (node.right) q.push(node.right);
    }
    res.push(level);
  }
  return res;
}`,
    tests: '',
  },
  {
    number: 104, title: 'Maximum Depth of Binary Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs', 'bfs'],
    description: 'Return the maximum depth (longest path from root to leaf) of a binary tree.',
    keywords: ['max depth tree', 'tree height', 'maximum depth binary tree', 'depth of tree'],
    signatures: ['max(imum)?\\s+depth', 'tree\\s+height', 'depth.*tree'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recursive DFS: depth = 1 + max(left depth, right depth). Base case: null → 0.',
    code: `function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
    tests: '',
  },
  {
    number: 121, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy',
    topics: ['array', 'dynamic-programming'],
    description: 'Given daily prices, return the max profit from one buy + one later sell.',
    keywords: ['buy and sell stock', 'max profit', 'stock profit', 'best time stock'],
    signatures: ['buy\\s+and\\s+sell', 'max(imum)?\\s+profit', 'stock.*profit'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Track the minimum price so far; at each day, candidate profit = price - min. Keep the best.',
    code: `function maxProfit(prices) {
  let min = Infinity, profit = 0;
  for (const p of prices) {
    if (p < min) min = p;
    else if (p - min > profit) profit = p - min;
  }
  return profit;
}`,
    tests: `console.log(maxProfit([7,1,5,3,6,4])); // 5
console.log(maxProfit([7,6,4,3,1]));   // 0`,
  },
  {
    number: 125, title: 'Valid Palindrome', difficulty: 'Easy',
    topics: ['string', 'two-pointers'],
    description: 'Check if a string is a palindrome considering only alphanumerics and ignoring case.',
    keywords: ['valid palindrome', 'string palindrome', 'check palindrome', 'is palindrome string'],
    signatures: ['valid\\s+palindrome', 'is.*palindrome.*string', 'check.*palindrome'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Two pointers from both ends. Skip non-alphanumerics; compare lowercased characters.',
    code: `function isPalindrome(s) {
  const isAN = c => /[a-zA-Z0-9]/.test(c);
  let l = 0, r = s.length - 1;
  while (l < r) {
    while (l < r && !isAN(s[l])) l++;
    while (l < r && !isAN(s[r])) r--;
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    l++; r--;
  }
  return true;
}`,
    tests: `console.log(isPalindrome('A man, a plan, a canal: Panama')); // true
console.log(isPalindrome('race a car')); // false`,
  },
  {
    number: 141, title: 'Linked List Cycle', difficulty: 'Easy',
    topics: ['linked-list', 'two-pointers'],
    description: 'Detect if a linked list has a cycle.',
    keywords: ['linked list cycle', 'detect cycle', 'floyd cycle', 'tortoise hare'],
    signatures: ['linked\\s+list.*cycle', 'detect.*cycle.*list', 'floyd.*cycle', 'tortoise.*hare'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: "Floyd's tortoise-and-hare. Move slow by 1, fast by 2. If they meet, there's a cycle. If fast hits null, no cycle.",
    code: `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
    tests: '',
  },
  {
    number: 155, title: 'Min Stack', difficulty: 'Medium',
    topics: ['stack', 'design'],
    description: 'Stack supporting push, pop, top, and getMin — all in O(1).',
    keywords: ['min stack', 'stack with min', 'o(1) minimum stack'],
    signatures: ['min\\s+stack', 'stack.*min.*o\\(1\\)'],
    complexity: { time: 'O(1) per op', space: 'O(n)' },
    approach: 'Keep a parallel stack of running minimums. Push the smaller of current-top-min vs new value on every push.',
    code: `class MinStack {
  constructor() { this.s = []; this.m = []; }
  push(x) {
    this.s.push(x);
    this.m.push(this.m.length === 0 ? x : Math.min(x, this.m[this.m.length - 1]));
  }
  pop()    { this.s.pop(); this.m.pop(); }
  top()    { return this.s[this.s.length - 1]; }
  getMin() { return this.m[this.m.length - 1]; }
}`,
    tests: '',
  },
  {
    number: 198, title: 'House Robber', difficulty: 'Medium',
    topics: ['array', 'dynamic-programming'],
    description: 'Rob houses in a row without alerting police (no two adjacent). Maximize loot.',
    keywords: ['house robber', 'rob houses', 'non-adjacent max sum'],
    signatures: ['house\\s+robber', 'rob.*houses?', 'non.?adjacent.*sum'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'DP recurrence: rob(i) = max(rob(i-1), rob(i-2) + nums[i]). Rolling two variables suffice.',
    code: `function rob(nums) {
  let prev = 0, curr = 0;
  for (const n of nums) {
    [prev, curr] = [curr, Math.max(curr, prev + n)];
  }
  return curr;
}`,
    tests: `console.log(rob([1,2,3,1]));   // 4
console.log(rob([2,7,9,3,1])); // 12`,
  },
  {
    number: 200, title: 'Number of Islands', difficulty: 'Medium',
    topics: ['matrix', 'graph', 'dfs', 'bfs'],
    description: 'Given a 2D grid of "1"s (land) and "0"s (water), count distinct islands.',
    keywords: ['number of islands', 'count islands', 'flood fill grid', 'connected components grid'],
    signatures: ['number\\s+of\\s+islands', 'count.*islands', 'flood\\s+fill', 'connected.*components.*grid'],
    complexity: { time: 'O(mn)', space: 'O(mn)' },
    approach: 'Scan grid; on each unvisited land cell, DFS to sink the whole island (mutate to "0"), count that visit as one island.',
    code: `function numIslands(grid) {
  let count = 0;
  const m = grid.length, n = grid[0].length;
  const dfs = (r, c) => {
    if (r < 0 || c < 0 || r >= m || c >= n || grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);
  };
  for (let r = 0; r < m; r++)
    for (let c = 0; c < n; c++)
      if (grid[r][c] === '1') { dfs(r, c); count++; }
  return count;
}`,
    tests: '',
  },
  {
    number: 206, title: 'Reverse Linked List', difficulty: 'Easy',
    topics: ['linked-list'],
    description: 'Reverse a singly linked list.',
    keywords: ['reverse linked list', 'reverse list', 'invert linked list'],
    signatures: ['reverse\\s+linked\\s+list', 'reverse.*list', 'invert.*linked'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Iterate with three pointers (prev, curr, next). Flip curr.next to prev at each step.',
    code: `function reverseList(head) {
  let prev = null, curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
    tests: '',
  },
  {
    number: 217, title: 'Contains Duplicate', difficulty: 'Easy',
    topics: ['array', 'hash-table'],
    description: 'Return true if any value appears at least twice in the array.',
    keywords: ['contains duplicate', 'has duplicates', 'any duplicates', 'array duplicates'],
    signatures: ['contains\\s+duplicate', 'has\\s+duplicates?', 'any\\s+duplicates?'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Use a Set. Return true the moment we see a value that is already in the set.',
    code: `function containsDuplicate(nums) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) return true;
    seen.add(n);
  }
  return false;
}`,
    tests: `console.log(containsDuplicate([1,2,3,1])); // true
console.log(containsDuplicate([1,2,3,4])); // false`,
  },
  {
    number: 226, title: 'Invert Binary Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs'],
    description: 'Invert a binary tree (mirror image).',
    keywords: ['invert tree', 'mirror tree', 'flip binary tree'],
    signatures: ['invert.*tree', 'mirror.*tree', 'flip.*binary.*tree'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recursive DFS. Swap left and right children, recurse on both.',
    code: `function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}`,
    tests: '',
  },
  {
    number: 238, title: 'Product of Array Except Self', difficulty: 'Medium',
    topics: ['array', 'prefix-product'],
    description: 'Return array where each index i holds product of all other elements. No division.',
    keywords: ['product of array except self', 'prefix product', 'suffix product'],
    signatures: ['product.*array.*except', 'prefix\\s+product', 'suffix\\s+product'],
    complexity: { time: 'O(n)', space: 'O(1) extra' },
    approach: 'Two passes. First pass fills prefix products. Second pass multiplies by a running suffix product.',
    code: `function productExceptSelf(nums) {
  const n = nums.length, res = new Array(n);
  res[0] = 1;
  for (let i = 1; i < n; i++) res[i] = res[i-1] * nums[i-1];
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    res[i] *= suffix;
    suffix *= nums[i];
  }
  return res;
}`,
    tests: 'console.log(productExceptSelf([1,2,3,4])); // [24,12,8,6]',
  },
  {
    number: 300, title: 'Longest Increasing Subsequence', difficulty: 'Medium',
    topics: ['array', 'dynamic-programming', 'binary-search'],
    description: 'Length of the longest strictly increasing subsequence.',
    keywords: ['longest increasing subsequence', 'lis', 'increasing subsequence length'],
    signatures: ['longest\\s+increasing\\s+subsequence', '\\blis\\b', 'increasing.*subsequence.*length'],
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    approach: 'Patience sorting: maintain the lowest possible tail per LIS length. Binary-search to place each number.',
    code: `function lengthOfLIS(nums) {
  const tails = [];
  for (const n of nums) {
    let l = 0, r = tails.length;
    while (l < r) {
      const m = (l + r) >> 1;
      if (tails[m] < n) l = m + 1; else r = m;
    }
    tails[l] = n;
  }
  return tails.length;
}`,
    tests: 'console.log(lengthOfLIS([10,9,2,5,3,7,101,18])); // 4',
  },
  {
    number: 322, title: 'Coin Change', difficulty: 'Medium',
    topics: ['array', 'dynamic-programming'],
    description: 'Minimum number of coins to make up amount. Return -1 if impossible.',
    keywords: ['coin change', 'min coins', 'fewest coins amount'],
    signatures: ['coin\\s+change', 'min(imum)?\\s+coins?', 'fewest\\s+coins?'],
    complexity: { time: 'O(amount·coins)', space: 'O(amount)' },
    approach: 'Bottom-up DP. dp[x] = min coins to make x. dp[x] = min(dp[x - coin] + 1) over all coins.',
    code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const c of coins) {
      if (c <= i && dp[i - c] + 1 < dp[i]) dp[i] = dp[i - c] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    tests: `console.log(coinChange([1,2,5], 11)); // 3
console.log(coinChange([2], 3));      // -1`,
  },
  {
    number: 704, title: 'Binary Search', difficulty: 'Easy',
    topics: ['array', 'binary-search'],
    description: 'Find target in sorted array. Return index, or -1 if not present.',
    keywords: ['binary search', 'search sorted array', 'log n search'],
    signatures: ['binary\\s+search', 'search.*sorted\\s+array', 'log\\s*n\\s+search'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    approach: 'Classic binary search. Maintain [l, r] inclusive; narrow based on comparison with nums[mid].',
    code: `function search(nums, target) {
  let l = 0, r = nums.length - 1;
  while (l <= r) {
    const m = (l + r) >> 1;
    if (nums[m] === target) return m;
    if (nums[m] < target) l = m + 1; else r = m - 1;
  }
  return -1;
}`,
    tests: `console.log(search([-1,0,3,5,9,12], 9)); // 4
console.log(search([-1,0,3,5,9,12], 2)); // -1`,
  },
  {
    number: 739, title: 'Daily Temperatures', difficulty: 'Medium',
    topics: ['array', 'stack', 'monotonic-stack'],
    description: 'For each day, days until a warmer temperature. 0 if none.',
    keywords: ['daily temperatures', 'next greater element', 'monotonic stack temperatures'],
    signatures: ['daily\\s+temperatures?', 'next\\s+greater.*element', 'monotonic\\s+stack'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Monotonic decreasing stack of indices. When today is warmer than stack top, pop and record the gap.',
    code: `function dailyTemperatures(temps) {
  const res = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const j = stack.pop();
      res[j] = i - j;
    }
    stack.push(i);
  }
  return res;
}`,
    tests: 'console.log(dailyTemperatures([73,74,75,71,69,72,76,73])); // [1,1,4,2,1,1,0,0]',
  },
  {
    number: 912, title: 'Sort an Array', difficulty: 'Medium',
    topics: ['array', 'sorting', 'merge-sort', 'quick-sort'],
    description: 'Sort an integer array without using built-in sort. Classic merge sort.',
    keywords: ['sort array', 'merge sort', 'quick sort', 'sorting algorithm'],
    signatures: ['sort\\s+an?\\s+array', 'merge\\s+sort', 'quick\\s+sort', 'sorting\\s+algorithm'],
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    approach: 'Top-down merge sort. Split in half recursively, merge two sorted halves.',
    code: `function sortArray(nums) {
  if (nums.length <= 1) return nums;
  const mid = nums.length >> 1;
  const L = sortArray(nums.slice(0, mid));
  const R = sortArray(nums.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < L.length && j < R.length) {
    out.push(L[i] <= R[j] ? L[i++] : R[j++]);
  }
  return out.concat(L.slice(i), R.slice(j));
}`,
    tests: 'console.log(sortArray([5,2,3,1,4])); // [1,2,3,4,5]',
  },
  {
    number: 207, title: 'Course Schedule', difficulty: 'Medium',
    topics: ['graph', 'dfs', 'topological-sort', 'cycle-detection'],
    description: 'Given prerequisite pairs, decide if you can finish all courses (i.e. no cycle).',
    keywords: ['course schedule', 'topological sort', 'cycle detection directed graph', 'prerequisites'],
    signatures: ['course\\s+schedule', 'topological\\s+sort', 'cycle\\s+detection.*graph', 'prerequisite'],
    complexity: { time: 'O(V+E)', space: 'O(V+E)' },
    approach: "Kahn's BFS. Build in-degree; push all zero-in-degree nodes; when a node is processed, decrement neighbors. If all nodes processed, no cycle.",
    code: `function canFinish(num, prereq) {
  const graph = Array.from({ length: num }, () => []);
  const indeg = new Array(num).fill(0);
  for (const [a, b] of prereq) { graph[b].push(a); indeg[a]++; }
  const q = [];
  for (let i = 0; i < num; i++) if (indeg[i] === 0) q.push(i);
  let done = 0;
  while (q.length) {
    const n = q.shift(); done++;
    for (const nb of graph[n]) if (--indeg[nb] === 0) q.push(nb);
  }
  return done === num;
}`,
    tests: `console.log(canFinish(2, [[1,0]]));         // true
console.log(canFinish(2, [[1,0],[0,1]]));   // false`,
  },
];

(async () => {
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  let inserted = 0, updated = 0;
  for (const P of PROBLEMS) {
    const r = await LeetProblem.findOneAndUpdate(
      { number: P.number }, P,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (r.createdAt.getTime() === r.updatedAt.getTime()) inserted++; else updated++;
  }
  const total = await LeetProblem.countDocuments();
  console.log(`Bulk seed complete: ${inserted} inserted, ${updated} updated.`);
  console.log(`Total problems in DB: ${total}`);
  console.log(`Next: run "node backfill-embeddings.js" to generate vectors for new entries.`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });

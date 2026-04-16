/**
 * Seed LeetCode problems — Batch 1: Arrays, Strings, Two Pointers, Hashing.
 * Run: node seed-leetcode-1.js
 */

const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const PROBLEMS = [
  {
    number: 11, title: 'Container With Most Water', difficulty: 'Medium',
    topics: ['array', 'two-pointers', 'greedy'],
    description: 'Find two lines that together with the x-axis form the container holding the most water.',
    keywords: ['container with most water', 'most water', 'max area', 'two lines'],
    signatures: ['container\\s+with\\s+most\\s+water', 'max(imum)?\\s+amount\\s+of\\s+water', 'container.*water'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Two pointers from both ends. Move the shorter line inward — the shorter side is the bottleneck.',
    code: `function maxArea(height) {
  let left = 0, right = height.length - 1, max = 0;
  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left);
    max = Math.max(max, area);
    if (height[left] < height[right]) left++;
    else right--;
  }
  return max;
}`,
    tests: `console.log(maxArea([1,8,6,2,5,4,8,3,7]));  // 49\nconsole.log(maxArea([1,1]));                 // 1`,
  },
  {
    number: 15, title: '3Sum', difficulty: 'Medium',
    topics: ['array', 'two-pointers', 'sorting'],
    description: 'Find all unique triplets in the array which gives the sum of zero.',
    keywords: ['3sum', 'three sum', 'triplets', 'sum of zero'],
    signatures: ['\\b3\\s*sum\\b', 'triplets?.*sum.*zero', 'sum\\s+of\\s+zero'],
    complexity: { time: 'O(n²)', space: 'O(1)' },
    approach: 'Sort the array. Fix one element, use two pointers to find pairs summing to -element. Skip duplicates.',
    code: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left = i + 1, right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++; right--;
      } else if (sum < 0) left++;
      else right--;
    }
  }
  return result;
}`,
    tests: `console.log(threeSum([-1,0,1,2,-1,-4]));  // [[-1,-1,2],[-1,0,1]]\nconsole.log(threeSum([0,1,1]));            // []`,
  },
  {
    number: 19, title: 'Remove Nth Node From End of List', difficulty: 'Medium',
    topics: ['linked-list', 'two-pointers'],
    description: 'Remove the nth node from the end of a linked list and return its head.',
    keywords: ['remove nth node', 'nth from end', 'remove from end'],
    signatures: ['remove\\s+(the\\s+)?nth\\s+node', 'nth\\s+from\\s+(the\\s+)?end'],
    complexity: { time: 'O(L)', space: 'O(1)' },
    approach: 'Two pointers, gap of n. Advance fast n steps, then move both until fast reaches end. Slow is just before the node to remove.',
    code: `function removeNthFromEnd(head, n) {
  const dummy = { val: 0, next: head };
  let fast = dummy, slow = dummy;
  for (let i = 0; i <= n; i++) fast = fast.next;
  while (fast) { fast = fast.next; slow = slow.next; }
  slow.next = slow.next.next;
  return dummy.next;
}`,
    tests: `// Input:  1→2→3→4→5, n = 2\n// Output: 1→2→3→5`,
  },
  {
    number: 33, title: 'Search in Rotated Sorted Array', difficulty: 'Medium',
    topics: ['array', 'binary-search'],
    description: 'Search a target in a rotated sorted array. O(log n).',
    keywords: ['search rotated sorted array', 'rotated array search', 'rotated sorted'],
    signatures: ['search.*rotated\\s+sorted\\s+array', 'rotated\\s+sorted\\s+array'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    approach: 'Modified binary search. Determine which half is sorted, then check if target is in that sorted half.',
    code: `function search(nums, target) {
  let lo = 0, hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,
    tests: `console.log(search([4,5,6,7,0,1,2], 0));  // 4\nconsole.log(search([4,5,6,7,0,1,2], 3));  // -1`,
  },
  {
    number: 39, title: 'Combination Sum', difficulty: 'Medium',
    topics: ['array', 'backtracking'],
    description: 'Find all unique combinations where the candidates sum to target. Numbers may be reused.',
    keywords: ['combination sum', 'unique combinations', 'candidates sum'],
    signatures: ['combination\\s+sum', 'combinations?\\s+sum\\s+to\\s+target'],
    complexity: { time: 'O(2^target)', space: 'O(target)' },
    approach: 'Backtracking. For each candidate, either include (and recurse with same index — unlimited reuse) or skip.',
    code: `function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b);
  const result = [];
  const dfs = (start, remaining, path) => {
    if (remaining === 0) { result.push([...path]); return; }
    for (let i = start; i < candidates.length; i++) {
      if (candidates[i] > remaining) break;
      path.push(candidates[i]);
      dfs(i, remaining - candidates[i], path);
      path.pop();
    }
  };
  dfs(0, target, []);
  return result;
}`,
    tests: `console.log(combinationSum([2,3,6,7], 7));  // [[2,2,3],[7]]\nconsole.log(combinationSum([2,3,5], 8));    // [[2,2,2,2],[2,3,3],[3,5]]`,
  },
  {
    number: 49, title: 'Group Anagrams', difficulty: 'Medium',
    topics: ['array', 'hash-table', 'string'],
    description: 'Group strings that are anagrams of each other.',
    keywords: ['group anagrams', 'anagrams together', 'group strings'],
    signatures: ['group\\s+anagrams', 'anagrams\\s+together'],
    complexity: { time: 'O(n·k log k)', space: 'O(n·k)' },
    approach: 'Use sorted chars as the hash map key. All anagrams produce the same sorted string.',
    code: `function groupAnagrams(strs) {
  const map = new Map();
  for (const s of strs) {
    const key = s.split('').sort().join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  }
  return Array.from(map.values());
}`,
    tests: `console.log(groupAnagrams(["eat","tea","tan","ate","nat","bat"]));\n// [["eat","tea","ate"],["tan","nat"],["bat"]]`,
  },
  {
    number: 54, title: 'Spiral Matrix', difficulty: 'Medium',
    topics: ['array', 'matrix', 'simulation'],
    description: 'Return all elements of the matrix in spiral order.',
    keywords: ['spiral matrix', 'spiral order', 'matrix spiral'],
    signatures: ['spiral\\s+matrix', 'spiral\\s+order'],
    complexity: { time: 'O(m·n)', space: 'O(1)' },
    approach: 'Maintain 4 boundaries (top, bottom, left, right). Traverse each side, then shrink.',
    code: `function spiralOrder(matrix) {
  if (!matrix.length) return [];
  const result = [];
  let top = 0, bottom = matrix.length - 1;
  let left = 0, right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) result.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) result.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) result.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) result.push(matrix[r][left]);
      left++;
    }
  }
  return result;
}`,
    tests: `console.log(spiralOrder([[1,2,3],[4,5,6],[7,8,9]]));  // [1,2,3,6,9,8,7,4,5]`,
  },
  {
    number: 55, title: 'Jump Game', difficulty: 'Medium',
    topics: ['array', 'greedy'],
    description: 'Can you reach the last index starting from index 0? Each value is max jump length.',
    keywords: ['jump game', 'reach last index', 'max jump'],
    signatures: ['jump\\s+game', 'reach\\s+(the\\s+)?last\\s+index'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: "Greedy: track the furthest index reachable. If current index > furthest, impossible.",
    code: `function canJump(nums) {
  let maxReach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false;
    maxReach = Math.max(maxReach, i + nums[i]);
  }
  return true;
}`,
    tests: `console.log(canJump([2,3,1,1,4]));  // true\nconsole.log(canJump([3,2,1,0,4]));  // false`,
  },
  {
    number: 62, title: 'Unique Paths', difficulty: 'Medium',
    topics: ['dp', 'math', 'combinatorics'],
    description: 'Count unique paths from top-left to bottom-right moving only right or down.',
    keywords: ['unique paths', 'robot paths', 'grid paths'],
    signatures: ['unique\\s+paths', 'robot.*grid', 'paths\\s+in\\s+(a\\s+)?grid'],
    complexity: { time: 'O(m·n)', space: 'O(n)' },
    approach: 'DP: paths[i][j] = paths[i-1][j] + paths[i][j-1]. Use 1D array, iterate row by row.',
    code: `function uniquePaths(m, n) {
  const dp = new Array(n).fill(1);
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[j] += dp[j - 1];
    }
  }
  return dp[n - 1];
}`,
    tests: `console.log(uniquePaths(3, 7));   // 28\nconsole.log(uniquePaths(3, 2));   // 3`,
  },
  {
    number: 73, title: 'Set Matrix Zeroes', difficulty: 'Medium',
    topics: ['array', 'matrix'],
    description: 'If an element is 0, set its entire row and column to 0 in-place.',
    keywords: ['set matrix zeroes', 'zero out row column', 'matrix zeros'],
    signatures: ['set\\s+matrix\\s+zer', 'element\\s+is\\s+0.*row\\s+and\\s+column'],
    complexity: { time: 'O(m·n)', space: 'O(1)' },
    approach: 'Use first row/column as markers. Track their original state separately.',
    code: `function setZeroes(matrix) {
  const m = matrix.length, n = matrix[0].length;
  let firstRowZero = false, firstColZero = false;
  for (let j = 0; j < n; j++) if (matrix[0][j] === 0) firstRowZero = true;
  for (let i = 0; i < m; i++) if (matrix[i][0] === 0) firstColZero = true;
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      if (matrix[i][j] === 0) { matrix[i][0] = 0; matrix[0][j] = 0; }
    }
  }
  for (let i = 1; i < m; i++) for (let j = 1; j < n; j++)
    if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0;
  if (firstRowZero) for (let j = 0; j < n; j++) matrix[0][j] = 0;
  if (firstColZero) for (let i = 0; i < m; i++) matrix[i][0] = 0;
}`,
    tests: `const m = [[1,1,1],[1,0,1],[1,1,1]];\nsetZeroes(m);\nconsole.log(m);  // [[1,0,1],[0,0,0],[1,0,1]]`,
  },
  {
    number: 78, title: 'Subsets', difficulty: 'Medium',
    topics: ['array', 'backtracking', 'bit-manipulation'],
    description: 'Return all possible subsets (the power set).',
    keywords: ['subsets', 'power set', 'all subsets'],
    signatures: ['\\bsubsets\\b', 'power\\s+set'],
    complexity: { time: 'O(n · 2^n)', space: 'O(n)' },
    approach: 'Backtracking: for each element, include or exclude. Collect at every level.',
    code: `function subsets(nums) {
  const result = [];
  const dfs = (start, path) => {
    result.push([...path]);
    for (let i = start; i < nums.length; i++) {
      path.push(nums[i]);
      dfs(i + 1, path);
      path.pop();
    }
  };
  dfs(0, []);
  return result;
}`,
    tests: `console.log(subsets([1,2,3]));\n// [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]`,
  },
  {
    number: 79, title: 'Word Search', difficulty: 'Medium',
    topics: ['array', 'backtracking', 'matrix'],
    description: 'Return true if the word exists in the 2D grid by adjacent letters.',
    keywords: ['word search', 'word exists in grid', 'adjacent cells letter'],
    signatures: ['word\\s+search', 'word\\s+exists.*grid'],
    complexity: { time: 'O(m·n·4^L)', space: 'O(L)' },
    approach: 'DFS with visited marking (temporarily mutate grid). Restore on backtrack.',
    code: `function exist(board, word) {
  const m = board.length, n = board[0].length;
  const dfs = (i, j, k) => {
    if (k === word.length) return true;
    if (i < 0 || i >= m || j < 0 || j >= n || board[i][j] !== word[k]) return false;
    const tmp = board[i][j];
    board[i][j] = '#';
    const found = dfs(i+1,j,k+1) || dfs(i-1,j,k+1) || dfs(i,j+1,k+1) || dfs(i,j-1,k+1);
    board[i][j] = tmp;
    return found;
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++)
    if (dfs(i, j, 0)) return true;
  return false;
}`,
    tests: `console.log(exist([["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCCED"));  // true\nconsole.log(exist([["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], "ABCB"));    // false`,
  },
  {
    number: 91, title: 'Decode Ways', difficulty: 'Medium',
    topics: ['string', 'dp'],
    description: "Count ways to decode a digit string where 'A'=1 ... 'Z'=26.",
    keywords: ['decode ways', 'number of ways decode', 'digit string decode'],
    signatures: ['decode\\s+ways', 'number\\s+of\\s+ways.*decode'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'DP: dp[i] = dp[i-1] (if s[i] != 0) + dp[i-2] (if s[i-1..i] forms 10..26).',
    code: `function numDecodings(s) {
  if (!s || s[0] === '0') return 0;
  let prev2 = 1, prev1 = 1;
  for (let i = 1; i < s.length; i++) {
    let curr = 0;
    if (s[i] !== '0') curr += prev1;
    const two = Number(s.slice(i - 1, i + 1));
    if (two >= 10 && two <= 26) curr += prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}`,
    tests: `console.log(numDecodings("12"));    // 2 (AB or L)\nconsole.log(numDecodings("226"));  // 3 (BZ, VF, BBF)\nconsole.log(numDecodings("06"));   // 0`,
  },
  {
    number: 125, title: 'Valid Palindrome', difficulty: 'Easy',
    topics: ['string', 'two-pointers'],
    description: 'Check if a string is a palindrome, considering only alphanumerics, ignoring case.',
    keywords: ['valid palindrome', 'palindrome ignoring case', 'palindrome alphanumeric'],
    signatures: ['valid\\s+palindrome', 'palindrome.*alphanumeric|alphanumeric.*palindrome'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Two pointers, skip non-alphanumerics, compare lowercase.',
    code: `function isPalindrome(s) {
  let l = 0, r = s.length - 1;
  const isAN = c => /[a-z0-9]/i.test(c);
  while (l < r) {
    while (l < r && !isAN(s[l])) l++;
    while (l < r && !isAN(s[r])) r--;
    if (s[l].toLowerCase() !== s[r].toLowerCase()) return false;
    l++; r--;
  }
  return true;
}`,
    tests: `console.log(isPalindrome("A man, a plan, a canal: Panama"));  // true\nconsole.log(isPalindrome("race a car"));                       // false`,
  },
  {
    number: 128, title: 'Longest Consecutive Sequence', difficulty: 'Medium',
    topics: ['array', 'hash-table', 'union-find'],
    description: 'Find the length of the longest consecutive elements sequence. O(n).',
    keywords: ['longest consecutive', 'consecutive sequence', 'consecutive elements'],
    signatures: ['longest\\s+consecutive', 'consecutive\\s+sequence'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Set for O(1) lookup. For each num, only start counting if num-1 is not in the set (so each sequence is counted once).',
    code: `function longestConsecutive(nums) {
  const set = new Set(nums);
  let best = 0;
  for (const n of set) {
    if (set.has(n - 1)) continue;
    let curr = n, len = 1;
    while (set.has(curr + 1)) { curr++; len++; }
    best = Math.max(best, len);
  }
  return best;
}`,
    tests: `console.log(longestConsecutive([100,4,200,1,3,2]));       // 4 (1,2,3,4)\nconsole.log(longestConsecutive([0,3,7,2,5,8,4,6,0,1]));  // 9`,
  },
  {
    number: 141, title: 'Linked List Cycle', difficulty: 'Easy',
    topics: ['linked-list', 'two-pointers', 'hash-table'],
    description: 'Detect if a linked list has a cycle.',
    keywords: ['linked list cycle', 'detect cycle', 'floyd cycle'],
    signatures: ['linked\\s+list\\s+cycle', 'detect.*cycle.*linked'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: "Floyd's tortoise and hare. If they meet, there's a cycle.",
    code: `function hasCycle(head) {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
    tests: `// Given head of 3→2→0→-4 with tail pointing back to node "2"\n// hasCycle returns true`,
  },
  {
    number: 143, title: 'Reorder List', difficulty: 'Medium',
    topics: ['linked-list', 'two-pointers'],
    description: 'Reorder L0→L1→…→Ln−1→Ln to L0→Ln→L1→Ln−1→L2→…',
    keywords: ['reorder list', 'linked list reorder'],
    signatures: ['reorder\\s+list', 'reorder\\s+linked\\s+list'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Find middle, reverse second half, merge two halves.',
    code: `function reorderList(head) {
  if (!head || !head.next) return;
  // 1. find middle
  let slow = head, fast = head;
  while (fast.next && fast.next.next) { slow = slow.next; fast = fast.next.next; }
  // 2. reverse second half
  let prev = null, curr = slow.next;
  slow.next = null;
  while (curr) { const n = curr.next; curr.next = prev; prev = curr; curr = n; }
  // 3. merge
  let first = head, second = prev;
  while (second) {
    const t1 = first.next, t2 = second.next;
    first.next = second; second.next = t1;
    first = t1; second = t2;
  }
}`,
    tests: `// Input:  1→2→3→4\n// Output: 1→4→2→3`,
  },
  {
    number: 151, title: 'Reverse Words in a String', difficulty: 'Medium',
    topics: ['string', 'two-pointers'],
    description: 'Reverse the order of words in the string.',
    keywords: ['reverse words', 'reverse word order', 'reverse string words'],
    signatures: ['reverse\\s+words', 'reverse.*order.*words'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Split on whitespace, filter empty, reverse, join.',
    code: `function reverseWords(s) {
  return s.trim().split(/\\s+/).reverse().join(' ');
}`,
    tests: `console.log(reverseWords("the sky is blue"));       // "blue is sky the"\nconsole.log(reverseWords("  hello world  "));        // "world hello"`,
  },
  {
    number: 152, title: 'Maximum Product Subarray', difficulty: 'Medium',
    topics: ['array', 'dp'],
    description: 'Find the contiguous subarray with the largest product.',
    keywords: ['maximum product subarray', 'largest product', 'product subarray'],
    signatures: ['max(imum)?\\s+product\\s+subarray', 'largest\\s+product.*subarray'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Track min and max at each position (negatives flip signs). Swap when current number is negative.',
    code: `function maxProduct(nums) {
  let maxP = nums[0], minP = nums[0], result = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    if (n < 0) [maxP, minP] = [minP, maxP];
    maxP = Math.max(n, maxP * n);
    minP = Math.min(n, minP * n);
    result = Math.max(result, maxP);
  }
  return result;
}`,
    tests: `console.log(maxProduct([2,3,-2,4]));   // 6\nconsole.log(maxProduct([-2,0,-1]));   // 0`,
  },
  {
    number: 153, title: 'Find Minimum in Rotated Sorted Array', difficulty: 'Medium',
    topics: ['array', 'binary-search'],
    description: 'Find the minimum element in a rotated sorted array. O(log n).',
    keywords: ['minimum in rotated sorted array', 'min rotated array', 'rotated min'],
    signatures: ['minimum.*rotated\\s+sorted\\s+array', 'min.*rotated.*sorted'],
    complexity: { time: 'O(log n)', space: 'O(1)' },
    approach: 'Binary search. Compare middle with right end. If mid > right, min is to the right of mid; else it is at or to the left of mid.',
    code: `function findMin(nums) {
  let lo = 0, hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1;
    else hi = mid;
  }
  return nums[lo];
}`,
    tests: `console.log(findMin([3,4,5,1,2]));    // 1\nconsole.log(findMin([4,5,6,7,0,1,2]));  // 0`,
  },
  {
    number: 198, title: 'House Robber', difficulty: 'Medium',
    topics: ['array', 'dp'],
    description: 'Max money you can rob without robbing two adjacent houses.',
    keywords: ['house robber', 'rob houses', 'adjacent houses'],
    signatures: ['house\\s+robber', 'rob\\s+houses'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'DP: rob[i] = max(rob[i-2] + nums[i], rob[i-1]). Only 2 variables needed.',
    code: `function rob(nums) {
  let prev2 = 0, prev1 = 0;
  for (const n of nums) {
    const curr = Math.max(prev1, prev2 + n);
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}`,
    tests: `console.log(rob([1,2,3,1]));      // 4\nconsole.log(rob([2,7,9,3,1]));   // 12`,
  },
  {
    number: 200, title: 'Number of Islands', difficulty: 'Medium',
    topics: ['graph', 'dfs', 'bfs', 'matrix'],
    description: "Count the number of islands in a 2D grid ('1' = land, '0' = water).",
    keywords: ['number of islands', 'count islands', 'islands grid'],
    signatures: ['number\\s+of\\s+islands', 'count\\s+islands'],
    complexity: { time: 'O(m·n)', space: 'O(m·n)'},
    approach: 'DFS/BFS. For each unvisited 1, increment count and sink the whole island by marking connected land as 0.',
    code: `function numIslands(grid) {
  if (!grid.length) return 0;
  const m = grid.length, n = grid[0].length;
  let count = 0;
  const dfs = (i, j) => {
    if (i < 0 || i >= m || j < 0 || j >= n || grid[i][j] !== '1') return;
    grid[i][j] = '0';
    dfs(i+1,j); dfs(i-1,j); dfs(i,j+1); dfs(i,j-1);
  };
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++)
    if (grid[i][j] === '1') { count++; dfs(i, j); }
  return count;
}`,
    tests: `console.log(numIslands([["1","1","0"],["1","0","0"],["0","0","1"]]));  // 2`,
  },
  {
    number: 207, title: 'Course Schedule', difficulty: 'Medium',
    topics: ['graph', 'topological-sort', 'dfs', 'bfs'],
    description: 'Can you finish all courses given prerequisites? Detect cycle in a directed graph.',
    keywords: ['course schedule', 'finish all courses', 'prerequisites graph'],
    signatures: ['course\\s+schedule', 'finish\\s+all\\s+courses', 'prerequisites.*courses?'],
    complexity: { time: 'O(V + E)', space: 'O(V + E)' },
    approach: "Topological sort via BFS (Kahn's algorithm). If we can't order all courses, there's a cycle.",
    code: `function canFinish(numCourses, prerequisites) {
  const graph = Array.from({ length: numCourses }, () => []);
  const indeg = new Array(numCourses).fill(0);
  for (const [a, b] of prerequisites) { graph[b].push(a); indeg[a]++; }
  const queue = [];
  for (let i = 0; i < numCourses; i++) if (indeg[i] === 0) queue.push(i);
  let done = 0;
  while (queue.length) {
    const c = queue.shift();
    done++;
    for (const next of graph[c]) {
      if (--indeg[next] === 0) queue.push(next);
    }
  }
  return done === numCourses;
}`,
    tests: `console.log(canFinish(2, [[1,0]]));          // true\nconsole.log(canFinish(2, [[1,0],[0,1]]));   // false`,
  },
  {
    number: 226, title: 'Invert Binary Tree', difficulty: 'Easy',
    topics: ['tree', 'dfs', 'bfs'],
    description: 'Invert (mirror) a binary tree.',
    keywords: ['invert binary tree', 'mirror binary tree'],
    signatures: ['invert\\s+(a\\s+)?binary\\s+tree', 'mirror\\s+binary\\s+tree'],
    complexity: { time: 'O(n)', space: 'O(h)' },
    approach: 'Recursive swap of left and right children.',
    code: `function invertTree(root) {
  if (!root) return null;
  [root.left, root.right] = [invertTree(root.right), invertTree(root.left)];
  return root;
}`,
    tests: `// Input:  4 → 2,7 → 1,3,6,9\n// Output: 4 → 7,2 → 9,6,3,1`,
  },
  {
    number: 238, title: 'Product of Array Except Self', difficulty: 'Medium',
    topics: ['array', 'prefix-sum'],
    description: 'Return array where each element is the product of all other elements. No division. O(n).',
    keywords: ['product of array except self', 'product except', 'product without division'],
    signatures: ['product.*except\\s+self', 'product.*array.*except', 'without\\s+division.*product'],
    complexity: { time: 'O(n)', space: 'O(1) excluding output' },
    approach: 'Left-pass prefix products, then right-pass multiplies in suffix products.',
    code: `function productExceptSelf(nums) {
  const n = nums.length;
  const result = new Array(n).fill(1);
  let left = 1;
  for (let i = 0; i < n; i++) { result[i] = left; left *= nums[i]; }
  let right = 1;
  for (let i = n - 1; i >= 0; i--) { result[i] *= right; right *= nums[i]; }
  return result;
}`,
    tests: `console.log(productExceptSelf([1,2,3,4]));    // [24,12,8,6]\nconsole.log(productExceptSelf([-1,1,0,-3,3])); // [0,0,9,0,0]`,
  },
  {
    number: 252, title: 'Meeting Rooms', difficulty: 'Easy',
    topics: ['array', 'sorting'],
    description: 'Can a person attend all meetings? Given intervals, check for overlaps.',
    keywords: ['meeting rooms', 'attend all meetings', 'meeting overlaps'],
    signatures: ['meeting\\s+rooms?\\b', 'attend\\s+all\\s+meetings'],
    complexity: { time: 'O(n log n)', space: 'O(1)' },
    approach: 'Sort by start. Check any adjacent pair overlaps (current.start < prev.end).',
    code: `function canAttendMeetings(intervals) {
  intervals.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i][0] < intervals[i-1][1]) return false;
  }
  return true;
}`,
    tests: `console.log(canAttendMeetings([[0,30],[5,10],[15,20]]));  // false\nconsole.log(canAttendMeetings([[7,10],[2,4]]));            // true`,
  },
  {
    number: 253, title: 'Meeting Rooms II', difficulty: 'Medium',
    topics: ['array', 'heap', 'greedy', 'sorting'],
    description: 'Minimum number of meeting rooms required given intervals.',
    keywords: ['meeting rooms ii', 'minimum meeting rooms', 'minimum rooms'],
    signatures: ['meeting\\s+rooms?\\s+(ii|2)\\b', 'minimum.*meeting\\s+rooms'],
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    approach: 'Separate start/end arrays, sort each. Two pointers: if next start < earliest end, need new room; else reuse.',
    code: `function minMeetingRooms(intervals) {
  const starts = intervals.map(i => i[0]).sort((a,b) => a - b);
  const ends   = intervals.map(i => i[1]).sort((a,b) => a - b);
  let rooms = 0, endIdx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] < ends[endIdx]) rooms++;
    else endIdx++;
  }
  return rooms;
}`,
    tests: `console.log(minMeetingRooms([[0,30],[5,10],[15,20]]));  // 2\nconsole.log(minMeetingRooms([[7,10],[2,4]]));            // 1`,
  },
  {
    number: 322, title: 'Coin Change', difficulty: 'Medium',
    topics: ['array', 'dp'],
    description: 'Fewest coins to make up amount. Return -1 if impossible.',
    keywords: ['coin change', 'fewest coins', 'minimum coins', 'coins to make amount'],
    signatures: ['coin\\s+change\\b', 'fewest\\s+coins', 'minimum.*coins.*amount'],
    complexity: { time: 'O(amount · n)', space: 'O(amount)' },
    approach: 'DP: dp[a] = min over coins c of dp[a - c] + 1.',
    code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const c of coins) {
      if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    tests: `console.log(coinChange([1,2,5], 11));   // 3\nconsole.log(coinChange([2], 3));        // -1\nconsole.log(coinChange([1], 0));        // 0`,
  },
  {
    number: 300, title: 'Longest Increasing Subsequence', difficulty: 'Medium',
    topics: ['array', 'dp', 'binary-search'],
    description: 'Length of the longest strictly increasing subsequence.',
    keywords: ['longest increasing subsequence', 'lis', 'strictly increasing subsequence'],
    signatures: ['longest\\s+increasing\\s+subsequence', '\\blis\\b'],
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    approach: 'Patience sorting / binary search. Maintain a "tails" array where tails[i] = smallest tail of LIS of length i+1. For each num, binary search its position.',
    code: `function lengthOfLIS(nums) {
  const tails = [];
  for (const n of nums) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < n) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = n;
  }
  return tails.length;
}`,
    tests: `console.log(lengthOfLIS([10,9,2,5,3,7,101,18]));  // 4\nconsole.log(lengthOfLIS([0,1,0,3,2,3]));          // 4`,
  },
  {
    number: 338, title: 'Counting Bits', difficulty: 'Easy',
    topics: ['bit-manipulation', 'dp'],
    description: 'For every i in [0..n], return the count of 1 bits.',
    keywords: ['counting bits', 'bit count', 'popcount'],
    signatures: ['counting\\s+bits', 'number\\s+of\\s+1.?bits.*every'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'DP: result[i] = result[i >> 1] + (i & 1).',
    code: `function countBits(n) {
  const dp = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) dp[i] = dp[i >> 1] + (i & 1);
  return dp;
}`,
    tests: `console.log(countBits(5));   // [0,1,1,2,1,2]`,
  },
  {
    number: 347, title: 'Top K Frequent Elements', difficulty: 'Medium',
    topics: ['array', 'hash-table', 'heap', 'bucket-sort'],
    description: 'Return the k most frequent elements.',
    keywords: ['top k frequent', 'k most frequent', 'most frequent elements'],
    signatures: ['top\\s+k\\s+frequent', 'k\\s+most\\s+frequent'],
    complexity: { time: 'O(n)', space: 'O(n)' },
    approach: 'Bucket sort by frequency. Put each element at index = freq.',
    code: `function topKFrequent(nums, k) {
  const count = new Map();
  for (const n of nums) count.set(n, (count.get(n) || 0) + 1);
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [num, c] of count) buckets[c].push(num);
  const result = [];
  for (let i = buckets.length - 1; i >= 0 && result.length < k; i--) {
    for (const n of buckets[i]) {
      result.push(n);
      if (result.length === k) break;
    }
  }
  return result;
}`,
    tests: `console.log(topKFrequent([1,1,1,2,2,3], 2));   // [1,2]\nconsole.log(topKFrequent([1], 1));              // [1]`,
  },
  {
    number: 371, title: 'Sum of Two Integers', difficulty: 'Medium',
    topics: ['bit-manipulation', 'math'],
    description: 'Add two integers without using + or -.',
    keywords: ['sum of two integers', 'add without plus', 'bitwise add'],
    signatures: ['sum\\s+of\\s+two\\s+integers', 'add.*without.*[+-]'],
    complexity: { time: 'O(1)', space: 'O(1)' },
    approach: 'XOR = sum without carry. AND << 1 = carry. Loop until carry is 0.',
    code: `function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;
    a = a ^ b;
    b = carry;
  }
  return a;
}`,
    tests: `console.log(getSum(1, 2));   // 3\nconsole.log(getSum(-1, 1));  // 0`,
  },
  {
    number: 424, title: 'Longest Repeating Character Replacement', difficulty: 'Medium',
    topics: ['string', 'sliding-window'],
    description: 'Longest substring achievable by replacing at most k characters.',
    keywords: ['longest repeating character replacement', 'character replacement'],
    signatures: ['longest\\s+repeating\\s+character', 'character\\s+replacement'],
    complexity: { time: 'O(n)', space: 'O(1)' },
    approach: 'Sliding window. Track most frequent char in window. Window valid while (size - maxFreq) <= k.',
    code: `function characterReplacement(s, k) {
  const count = new Array(26).fill(0);
  let left = 0, maxFreq = 0, best = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s.charCodeAt(right) - 65;
    count[c]++;
    maxFreq = Math.max(maxFreq, count[c]);
    if ((right - left + 1) - maxFreq > k) {
      count[s.charCodeAt(left) - 65]--;
      left++;
    }
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
    tests: `console.log(characterReplacement("ABAB", 2));    // 4\nconsole.log(characterReplacement("AABABBA", 1));  // 4`,
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
  console.log(`Batch 1: ${inserted} inserted, ${updated} updated`);
  const total = await LeetProblem.countDocuments();
  console.log(`Total problems in DB: ${total}\n`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });

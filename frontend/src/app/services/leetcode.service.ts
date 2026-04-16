import { Injectable } from '@angular/core';

/**
 * LeetCode-style problem library with optimal solutions.
 * Matches problem statements by keywords and signature patterns.
 */

export interface LeetProblem {
  id: string;
  number?: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  keywords: string[];       // key phrases from problem statement
  signatures: RegExp[];     // regex patterns to detect the problem
  complexity: { time: string; space: string };
  approach: string;
  code: string;
  tests: string;
}

@Injectable({ providedIn: 'root' })
export class LeetcodeService {
  private problems: LeetProblem[] = [
    // ===== #4: MEDIAN OF TWO SORTED ARRAYS =====
    {
      id: 'median-two-sorted-arrays',
      number: 4, title: 'Median of Two Sorted Arrays', difficulty: 'Hard',
      description: 'Find the median of two sorted arrays in O(log(m+n)) time.',
      keywords: ['median', 'two sorted arrays', 'sorted arrays', 'nums1', 'nums2'],
      signatures: [
        /median.*two\s+sorted\s+arrays/i,
        /nums1.*nums2.*median/i,
        /sorted\s+arrays.*median|median.*sorted\s+arrays/i,
        /m\s*\+\s*n.*\blog\b.*median|log.*m\s*\+\s*n.*median/i,
      ],
      complexity: { time: 'O(log(min(m, n)))', space: 'O(1)' },
      approach: 'Binary search on the partition of the smaller array. Partition both arrays so that the left half contains the smaller elements. Median is derived from the boundary values of the partitions.',
      code: `/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
function findMedianSortedArrays(nums1, nums2) {
  // Ensure nums1 is the smaller array
  if (nums1.length > nums2.length) [nums1, nums2] = [nums2, nums1];

  const m = nums1.length;
  const n = nums2.length;
  const total = m + n;
  const half = Math.floor((total + 1) / 2);

  let lo = 0, hi = m;
  while (lo <= hi) {
    const i = Math.floor((lo + hi) / 2);          // partition in nums1
    const j = half - i;                             // partition in nums2

    const left1  = i === 0 ? -Infinity : nums1[i - 1];
    const right1 = i === m ? Infinity  : nums1[i];
    const left2  = j === 0 ? -Infinity : nums2[j - 1];
    const right2 = j === n ? Infinity  : nums2[j];

    if (left1 <= right2 && left2 <= right1) {
      if (total % 2 === 1) {
        return Math.max(left1, left2);
      }
      return (Math.max(left1, left2) + Math.min(right1, right2)) / 2;
    }
    if (left1 > right2) hi = i - 1;
    else lo = i + 1;
  }

  throw new Error('Input arrays are not sorted');
}`,
      tests: `console.log(findMedianSortedArrays([1, 3], [2]));           // 2
console.log(findMedianSortedArrays([1, 2], [3, 4]));        // 2.5
console.log(findMedianSortedArrays([0, 0], [0, 0]));        // 0
console.log(findMedianSortedArrays([], [1]));                // 1
console.log(findMedianSortedArrays([1, 3, 5], [2, 4, 6]));  // 3.5`,
    },

    // ===== #5: LONGEST PALINDROMIC SUBSTRING =====
    {
      id: 'longest-palindromic-substring',
      number: 5, title: 'Longest Palindromic Substring', difficulty: 'Medium',
      description: 'Given a string, return its longest palindromic substring.',
      keywords: ['longest palindromic substring', 'longest palindrome', 'palindromic substring', 'palindrome in string'],
      signatures: [
        /longest\s+palindrom(ic|e).*substring/i,
        /palindromic\s+substring/i,
        /return\s+the\s+longest\s+palindrom/i,
        /\bbabad\b|\bcbbd\b/i, // distinctive example strings from LeetCode #5
      ],
      complexity: { time: 'O(n²)', space: 'O(1)' },
      approach: 'Expand around every center (n centers for odd-length, n-1 for even-length palindromes). Track the longest found. O(n²) with constant extra space.',
      code: `/**
 * @param {string} s
 * @return {string}
 */
function longestPalindrome(s) {
  if (!s || s.length < 1) return '';

  let start = 0, maxLen = 1;

  const expand = (left, right) => {
    while (left >= 0 && right < s.length && s[left] === s[right]) {
      left--;
      right++;
    }
    // after loop, s[left+1..right-1] is the palindrome
    return [left + 1, right - 1];
  };

  for (let i = 0; i < s.length; i++) {
    // Odd-length palindrome centered at i
    const [l1, r1] = expand(i, i);
    // Even-length palindrome centered between i and i+1
    const [l2, r2] = expand(i, i + 1);

    if (r1 - l1 + 1 > maxLen) { start = l1; maxLen = r1 - l1 + 1; }
    if (r2 - l2 + 1 > maxLen) { start = l2; maxLen = r2 - l2 + 1; }
  }

  return s.slice(start, start + maxLen);
}

// ===== Manacher's Algorithm (optional, O(n)) =====
function longestPalindromeManacher(s) {
  if (!s) return '';
  // Insert '#' between every char + boundaries: "babad" -> "^#b#a#b#a#d#$"
  const t = '^#' + s.split('').join('#') + '#$';
  const n = t.length;
  const p = new Array(n).fill(0);
  let center = 0, right = 0;

  for (let i = 1; i < n - 1; i++) {
    const mirror = 2 * center - i;
    if (i < right) p[i] = Math.min(right - i, p[mirror]);
    while (t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++;
    if (i + p[i] > right) { center = i; right = i + p[i]; }
  }

  let maxLen = 0, centerIndex = 0;
  for (let i = 1; i < n - 1; i++) {
    if (p[i] > maxLen) { maxLen = p[i]; centerIndex = i; }
  }

  const start = Math.floor((centerIndex - maxLen) / 2);
  return s.slice(start, start + maxLen);
}`,
      tests: `console.log(longestPalindrome('babad'));    // "bab" or "aba"
console.log(longestPalindrome('cbbd'));     // "bb"
console.log(longestPalindrome('a'));         // "a"
console.log(longestPalindrome('ac'));        // "a" or "c"
console.log(longestPalindrome('racecar'));   // "racecar"
console.log(longestPalindrome('forgeeksskeegfor')); // "geeksskeeg"`,
    },

    // ===== #6: ZIGZAG CONVERSION =====
    {
      id: 'zigzag-conversion',
      number: 6, title: 'Zigzag Conversion', difficulty: 'Medium',
      description: 'Convert a string into a zigzag pattern across N rows, then read it row by row.',
      keywords: ['zigzag', 'zig zag', 'zigzag pattern', 'zigzag conversion', 'numrows', 'paypal', 'paypalishiring'],
      signatures: [
        /zig.?zag.*pattern/i,
        /zig.?zag.*conversion/i,
        /\bpaypalishiring\b/i,           // the famous example string
        /numRows\s*\)/i,                  // signature of the function
        /convert.*string.*numRows/i,
        /written\s+in\s+a\s+zig.?zag/i,
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
      approach: 'Simulate the zigzag traversal. Maintain an array of row strings. Walk through the input, append each char to the current row, then flip direction at the top (row 0) and bottom (numRows - 1). Concatenate all rows at the end.',
      code: `/**
 * @param {string} s
 * @param {number} numRows
 * @return {string}
 */
function convert(s, numRows) {
  // Edge case: one row or shorter string than rows
  if (numRows === 1 || numRows >= s.length) return s;

  // Create an array of strings, one per row
  const rows = Array.from({ length: numRows }, () => '');

  let currentRow = 0;
  let goingDown = false;

  for (const ch of s) {
    rows[currentRow] += ch;
    // Flip direction at top or bottom
    if (currentRow === 0 || currentRow === numRows - 1) {
      goingDown = !goingDown;
    }
    currentRow += goingDown ? 1 : -1;
  }

  // Join all rows
  return rows.join('');
}

// ===== Alternative: Math-based visiting order (no simulation) =====
function convertMath(s, numRows) {
  if (numRows === 1) return s;
  const cycleLen = 2 * numRows - 2;
  let result = '';

  for (let row = 0; row < numRows; row++) {
    for (let i = 0; row + i < s.length; i += cycleLen) {
      result += s[row + i];
      // Middle rows pick up an additional char from the diagonal
      if (row !== 0 && row !== numRows - 1) {
        const diag = i + cycleLen - row;
        if (diag < s.length) result += s[diag];
      }
    }
  }
  return result;
}`,
      tests: `console.log(convert("PAYPALISHIRING", 3));  // "PAHNAPLSIIGYIR"
console.log(convert("PAYPALISHIRING", 4));  // "PINALSIGYAHRPI"
console.log(convert("A", 1));                // "A"
console.log(convert("AB", 1));               // "AB"
console.log(convert("ABCDE", 4));            // "ABCED"`,
    },

    // ===== #10: REGULAR EXPRESSION MATCHING =====
    {
      id: 'regex-matching',
      number: 10, title: 'Regular Expression Matching', difficulty: 'Hard',
      description: "Implement regex matching with support for '.' (any char) and '*' (zero or more of preceding element).",
      keywords: ['regular expression matching', 'regex matching', 'pattern matching', 'dot star', 'zero or more', 'preceding element'],
      signatures: [
        /regular\s+expression\s+match/i,
        /regex.*match|match.*regex/i,
        /pattern.*\bp\b.*match.*\bs\b|input.*\bs\b.*pattern.*\bp\b/i,
        /['"]\.['"].*match.*single|['"]\*['"].*zero\s+or\s+more/i,
        /\bdot\b.*matches?\s+any|\bstar\b.*matches?\s+zero/i,
      ],
      complexity: { time: 'O(m × n)', space: 'O(m × n)' },
      approach: 'Dynamic programming. dp[i][j] = whether s[0..i) matches p[0..j). Handle "*" by either taking zero of preceding (dp[i][j-2]) or one-or-more if chars match (dp[i-1][j]).',
      code: `/**
 * @param {string} s
 * @param {string} p
 * @return {boolean}
 */
function isMatch(s, p) {
  const m = s.length, n = p.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
  dp[0][0] = true;

  // Empty string vs patterns like "a*", "a*b*", ".*"
  for (let j = 2; j <= n; j++) {
    if (p[j - 1] === '*') dp[0][j] = dp[0][j - 2];
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (p[j - 1] === '*') {
        // Zero occurrences of preceding element
        dp[i][j] = dp[i][j - 2];
        // One or more, if preceding element matches current char
        if (p[j - 2] === s[i - 1] || p[j - 2] === '.') {
          dp[i][j] = dp[i][j] || dp[i - 1][j];
        }
      } else if (p[j - 1] === '.' || p[j - 1] === s[i - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      }
    }
  }

  return dp[m][n];
}`,
      tests: `console.log(isMatch("aa", "a"));      // false — "a" doesn't match full "aa"
console.log(isMatch("aa", "a*"));     // true  — "a*" matches "aa"
console.log(isMatch("ab", ".*"));     // true  — ".*" matches "ab"
console.log(isMatch("aab", "c*a*b")); // true  — "c*" matches "", "a*" matches "aa", "b" matches "b"
console.log(isMatch("mississippi", "mis*is*p*.")); // false
console.log(isMatch("ab", ".*c"));    // false`,
    },

    // ===== #1: TWO SUM =====
    {
      id: 'two-sum',
      number: 1, title: 'Two Sum', difficulty: 'Easy',
      description: 'Given an array of integers and a target, return indices of the two numbers that add up to target.',
      keywords: ['two sum', 'target', 'indices', 'add up to target'],
      signatures: [
        /two\s+numbers.*add\s+up\s+to\s+(target|specific)/i,
        /return.*indices.*two\s+numbers/i,
        /\btwo\s*sum\b/i,
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
      approach: 'Hash map storing (value → index). For each element, check if (target - element) exists in the map.',
      code: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,
      tests: `console.log(twoSum([2, 7, 11, 15], 9));  // [0, 1]
console.log(twoSum([3, 2, 4], 6));        // [1, 2]
console.log(twoSum([3, 3], 6));           // [0, 1]`,
    },

    // ===== #3: LONGEST SUBSTRING WITHOUT REPEATING =====
    {
      id: 'longest-substring-no-repeat',
      number: 3, title: 'Longest Substring Without Repeating Characters', difficulty: 'Medium',
      description: 'Find the length of the longest substring without duplicate characters.',
      keywords: ['longest substring', 'without repeating', 'duplicate characters'],
      signatures: [
        /longest\s+substring.*without\s+repeat/i,
        /substring.*no\s+duplicate/i,
      ],
      complexity: { time: 'O(n)', space: 'O(min(m, n))' },
      approach: 'Sliding window with a Set. Expand right pointer, shrink from left when duplicate found.',
      code: `function lengthOfLongestSubstring(s) {
  const seen = new Set();
  let left = 0, max = 0;
  for (let right = 0; right < s.length; right++) {
    while (seen.has(s[right])) {
      seen.delete(s[left]);
      left++;
    }
    seen.add(s[right]);
    max = Math.max(max, right - left + 1);
  }
  return max;
}`,
      tests: `console.log(lengthOfLongestSubstring('abcabcbb'));  // 3
console.log(lengthOfLongestSubstring('bbbbb'));     // 1
console.log(lengthOfLongestSubstring('pwwkew'));    // 3`,
    },

    // ===== #20: VALID PARENTHESES =====
    {
      id: 'valid-parentheses',
      number: 20, title: 'Valid Parentheses', difficulty: 'Easy',
      description: 'Determine if a string of brackets is valid (properly matched and nested).',
      keywords: ['valid parentheses', 'brackets', 'matched', 'properly nested', 'open bracket', 'close bracket', 'corresponding open'],
      signatures: [
        /valid\s+parenthes/i,
        /matching\s+brackets/i,
        /balanced\s+(parenthes|bracket)/i,
        // Distinctive phrases from the LeetCode problem itself
        /open\s+brackets?\s+must\s+be\s+closed/i,
        /every\s+close\s+bracket.*(corresponding|open\s+bracket)/i,
        /(closed\s+in\s+the\s+correct\s+order|closed\s+by\s+the\s+same\s+type)/i,
        // Mentions all 6 bracket types together: () {} []
        /['"`]?\(\s*[,)]?.{0,20}\)\s*[,)]?.{0,20}\{\s*[,}]?.{0,20}\}\s*[,}]?.{0,20}\[\s*[,\]]?.{0,20}\]/,
        // "string s" + "parentheses" context
        /\bstring\s+s\b.*\bparenthes/i,
      ],
      complexity: { time: 'O(n)', space: 'O(n)' },
      approach: 'Stack-based: push openings, pop on closing and check match.',
      code: `function isValid(s) {
  const stack = [];
  const pairs = { ')': '(', ']': '[', '}': '{' };
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') {
      stack.push(ch);
    } else {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}`,
      tests: `console.log(isValid('()'));         // true
console.log(isValid('()[]{}'));    // true
console.log(isValid('(]'));         // false
console.log(isValid('([)]'));       // false`,
    },

    // ===== #53: MAXIMUM SUBARRAY (Kadane's) =====
    {
      id: 'maximum-subarray',
      number: 53, title: 'Maximum Subarray', difficulty: 'Medium',
      description: 'Find the contiguous subarray with the largest sum.',
      keywords: ['maximum subarray', 'largest sum', 'contiguous subarray', 'kadane'],
      signatures: [
        /maximum\s+subarray|largest\s+sum.*subarray/i,
        /contiguous\s+subarray.*largest/i,
        /kadane/i,
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
      approach: "Kadane's algorithm: at each index, decide whether to extend the current subarray or start new.",
      code: `function maxSubArray(nums) {
  let maxSum = nums[0];
  let currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}`,
      tests: `console.log(maxSubArray([-2, 1, -3, 4, -1, 2, 1, -5, 4]));  // 6 (subarray [4,-1,2,1])
console.log(maxSubArray([1]));                              // 1
console.log(maxSubArray([5, 4, -1, 7, 8]));                 // 23`,
    },

    // ===== #23: MERGE K SORTED LISTS =====
    {
      id: 'merge-k-sorted-lists',
      number: 23, title: 'Merge k Sorted Lists', difficulty: 'Hard',
      description: 'Merge k sorted linked lists into one sorted linked list.',
      keywords: ['merge k sorted', 'k linked-lists', 'k sorted lists', 'array of k linked-lists', 'merge all linked-lists'],
      signatures: [
        /merge\s+k\s+sorted/i,
        /array\s+of\s+k\s+linked.?lists/i,
        /k\s+linked.?lists.*sorted\s+in\s+ascending/i,
        /merge\s+all\s+(the\s+)?linked.?lists/i,
      ],
      complexity: { time: 'O(N log k)', space: 'O(k)' },
      approach: 'Divide and conquer: pair up lists and merge them, halving each round (log k rounds of total work N). Alternative: min-heap of k list heads.',
      code: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *   this.val = (val === undefined ? 0 : val);
 *   this.next = (next === undefined ? null : next);
 * }
 */

/**
 * @param {ListNode[]} lists
 * @return {ListNode}
 */
function mergeKLists(lists) {
  if (!lists || lists.length === 0) return null;

  // Divide and conquer — O(N log k) time
  while (lists.length > 1) {
    const merged = [];
    for (let i = 0; i < lists.length; i += 2) {
      const l1 = lists[i];
      const l2 = i + 1 < lists.length ? lists[i + 1] : null;
      merged.push(mergeTwoLists(l1, l2));
    }
    lists = merged;
  }
  return lists[0];
}

function mergeTwoLists(l1, l2) {
  const dummy = { val: 0, next: null };
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else                  { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  return dummy.next;
}

// ===== Alternative: Min-Heap (also O(N log k)) =====
function mergeKListsHeap(lists) {
  class MinHeap {
    constructor() { this.heap = []; }
    push(node) { this.heap.push(node); this._up(this.heap.length - 1); }
    pop() {
      if (this.heap.length === 0) return null;
      const top = this.heap[0];
      const last = this.heap.pop();
      if (this.heap.length > 0) { this.heap[0] = last; this._down(0); }
      return top;
    }
    _up(i) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.heap[p].val <= this.heap[i].val) break;
        [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
        i = p;
      }
    }
    _down(i) {
      const n = this.heap.length;
      while (true) {
        const l = 2 * i + 1, r = 2 * i + 2;
        let s = i;
        if (l < n && this.heap[l].val < this.heap[s].val) s = l;
        if (r < n && this.heap[r].val < this.heap[s].val) s = r;
        if (s === i) break;
        [this.heap[i], this.heap[s]] = [this.heap[s], this.heap[i]];
        i = s;
      }
    }
  }

  const heap = new MinHeap();
  for (const head of lists) if (head) heap.push(head);

  const dummy = { val: 0, next: null };
  let tail = dummy, top;
  while ((top = heap.pop())) {
    tail.next = top;
    tail = top;
    if (top.next) heap.push(top.next);
  }
  tail.next = null;
  return dummy.next;
}`,
      tests: `// Helpers for tests
const toList = (arr) => {
  const dummy = { val: 0, next: null };
  let tail = dummy;
  for (const v of arr) { tail.next = { val: v, next: null }; tail = tail.next; }
  return dummy.next;
};
const toArray = (node) => {
  const out = [];
  while (node) { out.push(node.val); node = node.next; }
  return out;
};

console.log(toArray(mergeKLists([toList([1,4,5]), toList([1,3,4]), toList([2,6])])));
// [1, 1, 2, 3, 4, 4, 5, 6]

console.log(toArray(mergeKLists([])));           // []
console.log(toArray(mergeKLists([toList([])])));  // []
console.log(toArray(mergeKLists([toList([1,2,3]), toList([4,5,6])])));
// [1, 2, 3, 4, 5, 6]`,
    },

    // ===== #21: MERGE TWO SORTED LISTS =====
    {
      id: 'merge-two-sorted-lists',
      number: 21, title: 'Merge Two Sorted Lists', difficulty: 'Easy',
      description: 'Merge two sorted linked lists into one sorted list.',
      keywords: ['merge two sorted', 'linked lists', 'merge sorted lists'],
      signatures: [
        /merge\s+two\s+sorted\s+(list|array)/i,
        /combine\s+sorted\s+lists/i,
      ],
      complexity: { time: 'O(m + n)', space: 'O(1)' },
      approach: 'Two pointers, create dummy head, pick smaller node each step.',
      code: `function mergeTwoLists(l1, l2) {
  const dummy = { val: 0, next: null };
  let tail = dummy;
  while (l1 && l2) {
    if (l1.val <= l2.val) { tail.next = l1; l1 = l1.next; }
    else                  { tail.next = l2; l2 = l2.next; }
    tail = tail.next;
  }
  tail.next = l1 || l2;
  return dummy.next;
}`,
      tests: `// Given: l1 = 1→2→4, l2 = 1→3→4
// Output: 1→1→2→3→4→4`,
    },

    // ===== #70: CLIMBING STAIRS =====
    {
      id: 'climbing-stairs',
      number: 70, title: 'Climbing Stairs', difficulty: 'Easy',
      description: 'Count distinct ways to climb N stairs taking 1 or 2 steps at a time.',
      keywords: ['climbing stairs', 'distinct ways', '1 or 2 steps'],
      signatures: [
        /climb.*stairs/i,
        /distinct\s+ways.*climb/i,
        /1\s*or\s*2\s*steps/i,
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
      approach: "Fibonacci-like DP: ways(n) = ways(n-1) + ways(n-2). Only two variables needed.",
      code: `function climbStairs(n) {
  if (n <= 2) return n;
  let prev2 = 1, prev1 = 2;
  for (let i = 3; i <= n; i++) {
    const curr = prev1 + prev2;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}`,
      tests: `console.log(climbStairs(2));   // 2 (1+1, 2)
console.log(climbStairs(3));   // 3 (1+1+1, 1+2, 2+1)
console.log(climbStairs(45));  // 1836311903`,
    },

    // ===== #206: REVERSE LINKED LIST =====
    {
      id: 'reverse-linked-list',
      number: 206, title: 'Reverse Linked List', difficulty: 'Easy',
      description: 'Reverse a singly linked list.',
      keywords: ['reverse linked list', 'singly linked'],
      signatures: [
        /reverse.*linked\s+list/i,
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
      approach: 'Three pointers: prev, curr, next. Iterate and flip each link.',
      code: `function reverseList(head) {
  let prev = null;
  let curr = head;
  while (curr) {
    const next = curr.next;
    curr.next = prev;
    prev = curr;
    curr = next;
  }
  return prev;
}`,
      tests: `// Input:  1→2→3→4→5
// Output: 5→4→3→2→1`,
    },

    // ===== #121: BEST TIME TO BUY/SELL STOCK =====
    {
      id: 'best-time-stock',
      number: 121, title: 'Best Time to Buy and Sell Stock', difficulty: 'Easy',
      description: 'Find the max profit from buying and selling a stock once.',
      keywords: ['buy and sell stock', 'max profit', 'maximum profit'],
      signatures: [
        /buy.*sell.*stock/i,
        /max(imum)?\s*profit.*stock/i,
      ],
      complexity: { time: 'O(n)', space: 'O(1)' },
      approach: 'Track min price seen so far, update max profit = current price − min.',
      code: `function maxProfit(prices) {
  let minPrice = Infinity;
  let maxProfit = 0;
  for (const p of prices) {
    if (p < minPrice) minPrice = p;
    else if (p - minPrice > maxProfit) maxProfit = p - minPrice;
  }
  return maxProfit;
}`,
      tests: `console.log(maxProfit([7, 1, 5, 3, 6, 4]));  // 5 (buy at 1, sell at 6)
console.log(maxProfit([7, 6, 4, 3, 1]));     // 0`,
    },

    // ===== #217: CONTAINS DUPLICATE =====
    {
      id: 'contains-duplicate',
      number: 217, title: 'Contains Duplicate', difficulty: 'Easy',
      description: 'Return true if any value appears at least twice.',
      keywords: ['contains duplicate', 'duplicate', 'appears twice'],
      signatures: [/contains\s+duplicate|any\s+duplicate/i],
      complexity: { time: 'O(n)', space: 'O(n)' },
      approach: 'Use a Set. If size differs from array length, there are duplicates.',
      code: `function containsDuplicate(nums) {
  return new Set(nums).size !== nums.length;
}`,
      tests: `console.log(containsDuplicate([1, 2, 3, 1]));  // true
console.log(containsDuplicate([1, 2, 3, 4]));  // false`,
    },

    // ===== #242: VALID ANAGRAM =====
    {
      id: 'valid-anagram',
      number: 242, title: 'Valid Anagram', difficulty: 'Easy',
      description: 'Check if two strings are anagrams of each other.',
      keywords: ['valid anagram', 'anagram', 'permutation'],
      signatures: [/valid\s+anagram|is\s+anagram|are\s+anagrams/i],
      complexity: { time: 'O(n)', space: 'O(1)' },
      approach: 'Character frequency count. Compare counts from both strings.',
      code: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    count[s.charCodeAt(i) - 97]++;
    count[t.charCodeAt(i) - 97]--;
  }
  return count.every(c => c === 0);
}`,
      tests: `console.log(isAnagram('anagram', 'nagaram'));  // true
console.log(isAnagram('rat', 'car'));          // false`,
    },
  ];

  /**
   * Does the input look like a coding problem statement?
   */
  isProblemStatement(input: string): boolean {
    return /\bgiven\b.*\b(array|string|list|tree|integer|number)\b/i.test(input)
      || /\binput\s*:\s*\S|output\s*:\s*\S/i.test(input)
      || /\breturn\s+.{0,40}(median|array|index|count|number|value|sum|substring|palindrome|longest|shortest)/i.test(input)
      || (/\bexample\s*\d?\s*:/i.test(input) && /\bconstraints\b/i.test(input));
  }

  /**
   * Detect if input is a coding problem and match to a known solution.
   */
  detect(input: string): LeetProblem | null {
    const text = input.toLowerCase();

    const isProblem = this.isProblemStatement(input);
    if (!isProblem && input.length < 100) return null;

    // Score each problem
    let best: LeetProblem | null = null;
    let bestScore = 0;

    for (const p of this.problems) {
      let score = 0;

      // Signature regex matches (highest weight)
      for (const sig of p.signatures) {
        if (sig.test(input)) score += 100;
      }

      // Keyword matches
      for (const kw of p.keywords) {
        if (text.includes(kw.toLowerCase())) score += 20;
      }

      // Title words
      const titleWords = p.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const w of titleWords) {
        if (text.includes(w)) score += 5;
      }

      if (score > bestScore) { bestScore = score; best = p; }
    }

    // Minimum threshold
    return bestScore >= 40 ? best : null;
  }

  list(): LeetProblem[] { return this.problems; }

  /**
   * Extended detection — checks in-memory library first, then MongoDB.
   * Use this for async callers that want full coverage.
   */
  async detectExtended(input: string): Promise<LeetProblem | null> {
    // In-memory (fast path — 15 curated problems)
    const local = this.detect(input);
    if (local) return local;

    // MongoDB (150+ Blind 75 / NeetCode 150)
    try {
      const url = await this.getApiUrl();
      if (!url) return null;
      const res = await fetch(`${url}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.match) return null;

      // Adapt MongoDB shape to in-memory LeetProblem shape
      const m = data.match;
      return {
        id: `mongo-${m.number}`,
        number: m.number,
        title: m.title,
        difficulty: m.difficulty,
        description: m.description,
        keywords: m.keywords || [],
        signatures: (m.signatures || []).map((s: string) => new RegExp(s, 'i')),
        complexity: m.complexity,
        approach: m.approach,
        code: m.code,
        tests: m.tests || '',
      };
    } catch { return null; }
  }

  /**
   * Get total problem count (in-memory + MongoDB).
   */
  async listAll(): Promise<{ local: number; mongodb: number; total: number }> {
    try {
      const url = await this.getApiUrl();
      if (!url) return { local: this.problems.length, mongodb: 0, total: this.problems.length };
      const res = await fetch(`${url}/stats/summary`);
      const data = await res.json();
      return { local: this.problems.length, mongodb: data.total || 0, total: this.problems.length + (data.total || 0) };
    } catch { return { local: this.problems.length, mongodb: 0, total: this.problems.length }; }
  }

  private _apiUrl = '';
  private async getApiUrl(): Promise<string> {
    if (this._apiUrl) return this._apiUrl;
    for (let p = 4100; p <= 4106; p++) {
      try {
        const r = await fetch(`http://localhost:${p}/api/health`);
        if (r.ok) { this._apiUrl = `http://localhost:${p}/api/leetcode`; return this._apiUrl; }
      } catch {}
    }
    return '';
  }
}

import { Injectable } from '@angular/core';

/**
 * Algorithm snippet library with typo tolerance.
 * When user asks "create fibonacci", "write factorial", etc. — return actual working code.
 */

export interface AlgoSnippet {
  name: string;
  aliases: string[];       // alternative names / typo tolerance
  description: string;
  code: string;
  example: string;         // how to call / expected output
  complexity?: string;
}

@Injectable({ providedIn: 'root' })
export class AlgorithmsService {
  private snippets: AlgoSnippet[] = [
    {
      name: 'fibonacci',
      aliases: ['fibonacci', 'fibanocci', 'fibnosis', 'fibnacci', 'fib', 'fibo', 'fibanacci', 'fibbo', 'fibonaccy', 'febonacci'],
      description: 'Fibonacci sequence: 0, 1, 1, 2, 3, 5, 8, 13, 21, 34, ...',
      complexity: 'O(n) iterative, O(2^n) naive recursive, O(n) memoized',
      code: `// Iterative (efficient) — O(n) time, O(1) space
function fibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// Recursive (simple, slow) — O(2^n) time
function fibRecursive(n) {
  if (n <= 1) return n;
  return fibRecursive(n - 1) + fibRecursive(n - 2);
}

// Memoized recursion — O(n) time
function fibMemo(n, memo = {}) {
  if (n in memo) return memo[n];
  if (n <= 1) return n;
  memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  return memo[n];
}

// Print first N numbers
function printFibonacci(n) {
  for (let i = 0; i < n; i++) {
    console.log(fibonacci(i));
  }
}`,
      example: `printFibonacci(10);
// Output:
// 0, 1, 1, 2, 3, 5, 8, 13, 21, 34

console.log(fibonacci(10));  // 55
console.log(fibonacci(20));  // 6765`,
    },

    {
      name: 'factorial',
      aliases: ['factorial', 'factoral', 'fact', 'factorail'],
      description: 'Factorial: n! = n × (n-1) × ... × 2 × 1',
      complexity: 'O(n)',
      code: `// Iterative
function factorial(n) {
  if (n < 0) throw new Error('Factorial of negative number');
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// Recursive
function factorialRecursive(n) {
  if (n < 0) throw new Error('Factorial of negative number');
  if (n <= 1) return 1;
  return n * factorialRecursive(n - 1);
}`,
      example: `console.log(factorial(5));   // 120
console.log(factorial(10));  // 3628800
console.log(factorial(0));   // 1`,
    },

    {
      name: 'prime-check',
      aliases: ['prime', 'is prime', 'check prime', 'primes', 'prime number', 'isprime'],
      description: 'Check if a number is prime',
      complexity: 'O(√n)',
      code: `function isPrime(n) {
  if (n < 2) return false;
  if (n === 2) return true;
  if (n % 2 === 0) return false;
  for (let i = 3; i * i <= n; i += 2) {
    if (n % i === 0) return false;
  }
  return true;
}

// Generate first N primes
function firstNPrimes(n) {
  const primes = [];
  let num = 2;
  while (primes.length < n) {
    if (isPrime(num)) primes.push(num);
    num++;
  }
  return primes;
}`,
      example: `console.log(isPrime(7));       // true
console.log(isPrime(10));      // false
console.log(firstNPrimes(10));
// [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]`,
    },

    {
      name: 'palindrome',
      aliases: ['palindrome', 'palindrom', 'is palindrome', 'palindromic'],
      description: 'Check if a string or number reads the same forwards and backwards',
      complexity: 'O(n)',
      code: `// String palindrome
function isPalindrome(str) {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}

// Optimized — no extra memory
function isPalindromeOptimized(str) {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  let left = 0, right = clean.length - 1;
  while (left < right) {
    if (clean[left] !== clean[right]) return false;
    left++; right--;
  }
  return true;
}

// Number palindrome
function isPalindromeNumber(n) {
  return n === Number(String(n).split('').reverse().join(''));
}`,
      example: `console.log(isPalindrome('racecar'));      // true
console.log(isPalindrome('Madam, I\\'m Adam')); // true
console.log(isPalindrome('hello'));         // false
console.log(isPalindromeNumber(121));       // true`,
    },

    {
      name: 'reverse-string',
      aliases: ['reverse string', 'reverse', 'string reverse'],
      description: 'Reverse a string',
      complexity: 'O(n)',
      code: `// Simple
function reverseString(str) {
  return str.split('').reverse().join('');
}

// Manual (no built-in reverse)
function reverseStringManual(str) {
  let result = '';
  for (let i = str.length - 1; i >= 0; i--) {
    result += str[i];
  }
  return result;
}

// Two-pointer (array conversion)
function reverseStringTwoPointer(str) {
  const chars = str.split('');
  let left = 0, right = chars.length - 1;
  while (left < right) {
    [chars[left], chars[right]] = [chars[right], chars[left]];
    left++; right--;
  }
  return chars.join('');
}`,
      example: `console.log(reverseString('hello'));  // 'olleh'
console.log(reverseString('Angular')); // 'ralugnA'`,
    },

    {
      name: 'bubble-sort',
      aliases: ['bubble sort', 'bubblesort', 'bubble'],
      description: 'Bubble sort — repeatedly swap adjacent out-of-order elements',
      complexity: 'O(n²)',
      code: `function bubbleSort(arr) {
  const a = [...arr];  // don't mutate input
  const n = a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;  // optimization: already sorted
  }
  return a;
}`,
      example: `console.log(bubbleSort([5, 2, 8, 1, 9, 3]));
// [1, 2, 3, 5, 8, 9]`,
    },

    {
      name: 'quicksort',
      aliases: ['quicksort', 'quick sort', 'qsort'],
      description: 'QuickSort — divide and conquer using a pivot',
      complexity: 'O(n log n) avg, O(n²) worst',
      code: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  return [...quickSort(left), ...middle, ...quickSort(right)];
}

// In-place quicksort
function quickSortInPlace(arr, lo = 0, hi = arr.length - 1) {
  if (lo < hi) {
    const p = partition(arr, lo, hi);
    quickSortInPlace(arr, lo, p - 1);
    quickSortInPlace(arr, p + 1, hi);
  }
  return arr;
}
function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (arr[j] < pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
  return i + 1;
}`,
      example: `console.log(quickSort([5, 2, 8, 1, 9, 3]));
// [1, 2, 3, 5, 8, 9]`,
    },

    {
      name: 'binary-search',
      aliases: ['binary search', 'binarysearch', 'bsearch'],
      description: 'Binary search in a sorted array — O(log n)',
      complexity: 'O(log n)',
      code: `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

// Recursive version
function binarySearchRecursive(arr, target, left = 0, right = arr.length - 1) {
  if (left > right) return -1;
  const mid = Math.floor((left + right) / 2);
  if (arr[mid] === target) return mid;
  return arr[mid] < target
    ? binarySearchRecursive(arr, target, mid + 1, right)
    : binarySearchRecursive(arr, target, left, mid - 1);
}`,
      example: `console.log(binarySearch([1, 3, 5, 7, 9, 11], 7));  // 3
console.log(binarySearch([1, 3, 5, 7, 9, 11], 4));  // -1`,
    },

    {
      name: 'fizzbuzz',
      aliases: ['fizzbuzz', 'fizz buzz', 'fizz'],
      description: 'FizzBuzz — classic interview problem',
      complexity: 'O(n)',
      code: `function fizzBuzz(n) {
  for (let i = 1; i <= n; i++) {
    if (i % 15 === 0) console.log('FizzBuzz');
    else if (i % 3 === 0) console.log('Fizz');
    else if (i % 5 === 0) console.log('Buzz');
    else console.log(i);
  }
}`,
      example: `fizzBuzz(15);
// 1, 2, Fizz, 4, Buzz, Fizz, 7, 8, Fizz, Buzz, 11, Fizz, 13, 14, FizzBuzz`,
    },

    {
      name: 'gcd',
      aliases: ['gcd', 'greatest common divisor', 'hcf', 'euclidean'],
      description: 'Greatest Common Divisor using Euclidean algorithm',
      complexity: 'O(log min(a, b))',
      code: `// Euclidean algorithm
function gcd(a, b) {
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

// Recursive
function gcdRecursive(a, b) {
  return b === 0 ? a : gcdRecursive(b, a % b);
}

// LCM — uses GCD
function lcm(a, b) {
  return (a * b) / gcd(a, b);
}`,
      example: `console.log(gcd(48, 18));   // 6
console.log(gcd(100, 75));  // 25
console.log(lcm(4, 6));     // 12`,
    },

    {
      name: 'reverse-array',
      aliases: ['reverse array', 'reverse list'],
      description: 'Reverse an array in place',
      complexity: 'O(n)',
      code: `function reverseArray(arr) {
  let left = 0, right = arr.length - 1;
  while (left < right) {
    [arr[left], arr[right]] = [arr[right], arr[left]];
    left++; right--;
  }
  return arr;
}`,
      example: `console.log(reverseArray([1, 2, 3, 4, 5]));
// [5, 4, 3, 2, 1]`,
    },

    {
      name: 'count-vowels',
      aliases: ['count vowels', 'vowels', 'vowel count'],
      description: 'Count vowels in a string',
      complexity: 'O(n)',
      code: `function countVowels(str) {
  return (str.match(/[aeiou]/gi) || []).length;
}

// Manual loop version
function countVowelsManual(str) {
  const vowels = 'aeiouAEIOU';
  let count = 0;
  for (const ch of str) {
    if (vowels.includes(ch)) count++;
  }
  return count;
}`,
      example: `console.log(countVowels('Hello World'));  // 3
console.log(countVowels('Angular'));       // 3`,
    },

    {
      name: 'even-numbers',
      aliases: ['even', 'even number', 'even numbers', 'even no', 'even nos', 'print even', 'check even', 'is even', 'even or odd'],
      description: 'Print / check even numbers',
      complexity: 'O(n) for print, O(1) for check',
      code: `// Check if a number is even
function isEven(n) {
  return n % 2 === 0;
}

// Print all even numbers from 1 to n
function printEvenNumbers(n) {
  for (let i = 2; i <= n; i += 2) {
    console.log(i);
  }
}

// Get even numbers from an array
function filterEven(arr) {
  return arr.filter(n => n % 2 === 0);
}

// Sum of even numbers up to n
function sumOfEven(n) {
  let sum = 0;
  for (let i = 2; i <= n; i += 2) sum += i;
  return sum;
}`,
      example: `console.log(isEven(4));              // true
console.log(isEven(7));              // false
printEvenNumbers(10);                // 2, 4, 6, 8, 10
console.log(filterEven([1,2,3,4,5,6])); // [2, 4, 6]
console.log(sumOfEven(10));          // 30`,
    },

    {
      name: 'odd-numbers',
      aliases: ['odd', 'odd number', 'odd numbers', 'odd no', 'odd nos', 'print odd', 'check odd', 'is odd'],
      description: 'Print / check odd numbers',
      complexity: 'O(n) for print, O(1) for check',
      code: `function isOdd(n) {
  return n % 2 !== 0;
}

function printOddNumbers(n) {
  for (let i = 1; i <= n; i += 2) {
    console.log(i);
  }
}

function filterOdd(arr) {
  return arr.filter(n => n % 2 !== 0);
}`,
      example: `console.log(isOdd(7));               // true
printOddNumbers(10);                 // 1, 3, 5, 7, 9
console.log(filterOdd([1,2,3,4,5])); // [1, 3, 5]`,
    },

    {
      name: 'leap-year',
      aliases: ['leap year', 'leap', 'is leap year', 'check leap year', 'leapyear'],
      description: 'Check if a year is a leap year',
      complexity: 'O(1)',
      code: `function isLeapYear(year) {
  // Divisible by 4, but not 100, unless also by 400
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}`,
      example: `console.log(isLeapYear(2000)); // true
console.log(isLeapYear(2100)); // false
console.log(isLeapYear(2024)); // true`,
    },

    {
      name: 'sum-of-digits',
      aliases: ['sum of digits', 'digit sum', 'sum digits', 'add digits'],
      description: 'Sum of the digits of a number',
      complexity: 'O(log n)',
      code: `function sumOfDigits(n) {
  n = Math.abs(n);
  let sum = 0;
  while (n > 0) {
    sum += n % 10;
    n = Math.floor(n / 10);
  }
  return sum;
}`,
      example: `console.log(sumOfDigits(1234)); // 10
console.log(sumOfDigits(999));  // 27`,
    },

    {
      name: 'count-digits',
      aliases: ['count digits', 'number of digits', 'digit count', 'how many digits'],
      description: 'Count digits of a number',
      complexity: 'O(log n)',
      code: `function countDigits(n) {
  n = Math.abs(n);
  if (n === 0) return 1;
  return Math.floor(Math.log10(n)) + 1;
}`,
      example: `console.log(countDigits(12345)); // 5
console.log(countDigits(0));     // 1`,
    },

    {
      name: 'multiplication-table',
      aliases: ['multiplication table', 'times table', 'table of', 'print table'],
      description: 'Print the multiplication table of a number',
      complexity: 'O(n)',
      code: `function multiplicationTable(n, upTo = 10) {
  for (let i = 1; i <= upTo; i++) {
    console.log(\`\${n} x \${i} = \${n * i}\`);
  }
}`,
      example: `multiplicationTable(5);
// 5 x 1 = 5
// 5 x 2 = 10
// ...
// 5 x 10 = 50`,
    },

    {
      name: 'array-sum',
      aliases: ['sum of array', 'array sum', 'add array', 'sum numbers', 'sum of numbers', 'total of array'],
      description: 'Sum all numbers in an array',
      complexity: 'O(n)',
      code: `function arraySum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

// Manual loop version
function arraySumLoop(arr) {
  let sum = 0;
  for (const n of arr) sum += n;
  return sum;
}`,
      example: `console.log(arraySum([1, 2, 3, 4, 5])); // 15`,
    },

    {
      name: 'array-max-min',
      aliases: ['max of array', 'min of array', 'largest number', 'smallest number', 'max min', 'find max', 'find min'],
      description: 'Find the max / min element in an array',
      complexity: 'O(n)',
      code: `function arrayMax(arr) {
  return Math.max(...arr);
}

function arrayMin(arr) {
  return Math.min(...arr);
}

// Manual version for huge arrays (avoids spread stack limit)
function arrayMaxLoop(arr) {
  let max = -Infinity;
  for (const n of arr) if (n > max) max = n;
  return max;
}`,
      example: `console.log(arrayMax([3, 1, 7, 2])); // 7
console.log(arrayMin([3, 1, 7, 2])); // 1`,
    },

    {
      name: 'anagram-check',
      aliases: ['anagram', 'is anagram', 'anagrams'],
      description: 'Check if two strings are anagrams',
      complexity: 'O(n log n)',
      code: `function isAnagram(s1, s2) {
  const clean = s => s.toLowerCase().replace(/\\s+/g, '').split('').sort().join('');
  return clean(s1) === clean(s2);
}

// Optimized — O(n) with character count
function isAnagramOptimized(s1, s2) {
  if (s1.length !== s2.length) return false;
  const counts = {};
  for (const ch of s1) counts[ch] = (counts[ch] || 0) + 1;
  for (const ch of s2) {
    if (!counts[ch]) return false;
    counts[ch]--;
  }
  return true;
}`,
      example: `console.log(isAnagram('listen', 'silent'));  // true
console.log(isAnagram('hello', 'world'));    // false`,
    },
  ];

  /**
   * Fuzzy find — handles typos using simple edit-distance-like match.
   */
  find(query: string): AlgoSnippet | null {
    const q = query.toLowerCase().trim();
    if (!q) return null;

    // 1. Exact match on name or alias
    for (const s of this.snippets) {
      if (s.name === q || s.aliases.includes(q)) return s;
    }

    // 2. Query contains snippet name/alias
    for (const s of this.snippets) {
      for (const alias of s.aliases) {
        if (q.includes(alias) && alias.length >= 3) return s;
      }
    }

    // 3. Fuzzy — similar word
    let best: AlgoSnippet | null = null;
    let bestScore = 0;
    for (const s of this.snippets) {
      for (const alias of s.aliases) {
        const score = this.similarity(q, alias);
        if (score > bestScore && score > 0.6) {
          bestScore = score;
          best = s;
        }
      }
      // Also check individual words in query
      const words = q.split(/\s+/);
      for (const word of words) {
        if (word.length < 4) continue;
        for (const alias of s.aliases) {
          const score = this.similarity(word, alias);
          if (score > bestScore && score > 0.6) {
            bestScore = score;
            best = s;
          }
        }
      }
    }
    return best;
  }

  /**
   * Simple similarity score 0-1 based on Levenshtein distance.
   */
  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const maxLen = Math.max(a.length, b.length);
    const distance = this.levenshtein(a, b);
    return 1 - distance / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    return dp[m][n];
  }

  /**
   * List all available algorithms.
   */
  list(): string[] {
    return this.snippets.map(s => s.name);
  }
}

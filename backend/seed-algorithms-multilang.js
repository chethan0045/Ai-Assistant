/**
 * Seed C and C++ variants for 16 core algorithms.
 *
 * This only sets the `codes` array on each LeetProblem — the existing top-level
 * `code` field (JavaScript) is preserved, and the endpoints fall back to it when
 * no C/C++ variant is seeded for a given problem.
 *
 * Run: node seed-algorithms-multilang.js
 * Then: node backfill-embeddings.js  (existing embeddings are reused if present)
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const VARIANTS = [
  // ---------- #1 Two Sum ----------
  {
    number: 1,
    codes: [
      {
        language: 'c',
        code: `/* returns indices of the two numbers that add up to target. caller frees. */
#include <stdlib.h>
#include <string.h>
struct Pair { int key; int idx; struct Pair* next; };
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    int cap = 1024;
    struct Pair** table = calloc(cap, sizeof(struct Pair*));
    int* res = malloc(2 * sizeof(int));
    *returnSize = 2;
    for (int i = 0; i < numsSize; i++) {
        int need = target - nums[i];
        unsigned h = ((unsigned)(need + 1000000007)) % cap;
        for (struct Pair* p = table[h]; p; p = p->next) {
            if (p->key == need) { res[0] = p->idx; res[1] = i; free(table); return res; }
        }
        unsigned h2 = ((unsigned)(nums[i] + 1000000007)) % cap;
        struct Pair* np = malloc(sizeof(struct Pair));
        np->key = nums[i]; np->idx = i; np->next = table[h2]; table[h2] = np;
    }
    *returnSize = 0;
    return res;
}`,
        tests: `/* int nums[] = {2,7,11,15}; int rs; int* r = twoSum(nums, 4, 9, &rs);
   r[0]=0, r[1]=1 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <unordered_map>
class Solution {
public:
    std::vector<int> twoSum(std::vector<int>& nums, int target) {
        std::unordered_map<int,int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int need = target - nums[i];
            auto it = seen.find(need);
            if (it != seen.end()) return { it->second, i };
            seen[nums[i]] = i;
        }
        return {};
    }
};`,
        tests: `// Solution().twoSum(v, 9) where v = {2,7,11,15}  ->  {0, 1}`,
      },
    ],
  },

  // ---------- #9 Palindrome Number ----------
  {
    number: 9,
    codes: [
      {
        language: 'c',
        code: `#include <stdbool.h>
bool isPalindrome(int x) {
    if (x < 0 || (x % 10 == 0 && x != 0)) return false;
    int rev = 0;
    while (x > rev) { rev = rev * 10 + x % 10; x /= 10; }
    return x == rev || x == rev / 10;
}`,
        tests: `/* isPalindrome(121)=true, isPalindrome(-121)=false, isPalindrome(10)=false */`,
      },
      {
        language: 'cpp',
        code: `class Solution {
public:
    bool isPalindrome(int x) {
        if (x < 0 || (x % 10 == 0 && x != 0)) return false;
        int rev = 0;
        while (x > rev) { rev = rev * 10 + x % 10; x /= 10; }
        return x == rev || x == rev / 10;
    }
};`,
        tests: `// Solution().isPalindrome(121) == true`,
      },
    ],
  },

  // ---------- #13 Roman to Integer ----------
  {
    number: 13,
    codes: [
      {
        language: 'c',
        code: `int romanToInt(char* s) {
    int map[128] = {0};
    map['I']=1; map['V']=5; map['X']=10; map['L']=50;
    map['C']=100; map['D']=500; map['M']=1000;
    int total = 0;
    for (int i = 0; s[i]; i++) {
        int cur = map[(unsigned char)s[i]];
        int nx  = s[i+1] ? map[(unsigned char)s[i+1]] : 0;
        total += (nx > cur) ? -cur : cur;
    }
    return total;
}`,
        tests: `/* romanToInt("MCMXCIV") == 1994 */`,
      },
      {
        language: 'cpp',
        code: `#include <string>
#include <unordered_map>
class Solution {
public:
    int romanToInt(std::string s) {
        std::unordered_map<char,int> m = {{'I',1},{'V',5},{'X',10},{'L',50},{'C',100},{'D',500},{'M',1000}};
        int total = 0;
        for (size_t i = 0; i < s.size(); i++) {
            int cur = m[s[i]];
            int nx = (i + 1 < s.size()) ? m[s[i+1]] : 0;
            total += (nx > cur) ? -cur : cur;
        }
        return total;
    }
};`,
        tests: `// Solution().romanToInt("LVIII") == 58`,
      },
    ],
  },

  // ---------- #20 Valid Parentheses ----------
  {
    number: 20,
    codes: [
      {
        language: 'c',
        code: `#include <stdbool.h>
#include <string.h>
bool isValid(char* s) {
    int n = strlen(s);
    char* st = (char*)malloc(n + 1);
    int top = 0;
    for (int i = 0; s[i]; i++) {
        char c = s[i];
        if (c == '(' || c == '[' || c == '{') st[top++] = c;
        else {
            if (top == 0) { free(st); return false; }
            char o = st[--top];
            if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) {
                free(st); return false;
            }
        }
    }
    bool ok = (top == 0);
    free(st);
    return ok;
}`,
        tests: `/* isValid("()[]{}")=true, isValid("(]")=false */`,
      },
      {
        language: 'cpp',
        code: `#include <stack>
#include <string>
class Solution {
public:
    bool isValid(std::string s) {
        std::stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '[' || c == '{') st.push(c);
            else {
                if (st.empty()) return false;
                char o = st.top(); st.pop();
                if ((c == ')' && o != '(') || (c == ']' && o != '[') || (c == '}' && o != '{')) return false;
            }
        }
        return st.empty();
    }
};`,
        tests: `// Solution().isValid("([)]") == false`,
      },
    ],
  },

  // ---------- #26 Remove Duplicates from Sorted Array ----------
  {
    number: 26,
    codes: [
      {
        language: 'c',
        code: `int removeDuplicates(int* nums, int numsSize) {
    if (numsSize == 0) return 0;
    int slow = 0;
    for (int fast = 1; fast < numsSize; fast++) {
        if (nums[fast] != nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return slow + 1;
}`,
        tests: `/* int a[] = {0,0,1,1,1,2,2,3}; removeDuplicates(a, 8) == 5 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
class Solution {
public:
    int removeDuplicates(std::vector<int>& nums) {
        if (nums.empty()) return 0;
        int slow = 0;
        for (int fast = 1; fast < (int)nums.size(); fast++) {
            if (nums[fast] != nums[slow]) nums[++slow] = nums[fast];
        }
        return slow + 1;
    }
};`,
        tests: `// input {1,1,2} -> returns 2, nums[0..1] = {1,2}`,
      },
    ],
  },

  // ---------- #53 Maximum Subarray (Kadane) ----------
  {
    number: 53,
    codes: [
      {
        language: 'c',
        code: `int maxSubArray(int* nums, int numsSize) {
    int best = nums[0], cur = nums[0];
    for (int i = 1; i < numsSize; i++) {
        cur = nums[i] > cur + nums[i] ? nums[i] : cur + nums[i];
        if (cur > best) best = cur;
    }
    return best;
}`,
        tests: `/* int a[] = {-2,1,-3,4,-1,2,1,-5,4}; maxSubArray(a,9) == 6 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <algorithm>
class Solution {
public:
    int maxSubArray(std::vector<int>& nums) {
        int best = nums[0], cur = nums[0];
        for (size_t i = 1; i < nums.size(); i++) {
            cur = std::max(nums[i], cur + nums[i]);
            best = std::max(best, cur);
        }
        return best;
    }
};`,
        tests: `// {-2,1,-3,4,-1,2,1,-5,4} -> 6`,
      },
    ],
  },

  // ---------- #70 Climbing Stairs ----------
  {
    number: 70,
    codes: [
      {
        language: 'c',
        code: `int climbStairs(int n) {
    if (n <= 2) return n;
    int a = 1, b = 2;
    for (int i = 3; i <= n; i++) { int t = a + b; a = b; b = t; }
    return b;
}`,
        tests: `/* climbStairs(5) == 8 */`,
      },
      {
        language: 'cpp',
        code: `class Solution {
public:
    int climbStairs(int n) {
        if (n <= 2) return n;
        int a = 1, b = 2;
        for (int i = 3; i <= n; i++) { int t = a + b; a = b; b = t; }
        return b;
    }
};`,
        tests: `// Solution().climbStairs(5) == 8`,
      },
    ],
  },

  // ---------- #121 Best Time to Buy and Sell Stock ----------
  {
    number: 121,
    codes: [
      {
        language: 'c',
        code: `int maxProfit(int* prices, int pricesSize) {
    int mn = 2147483647, profit = 0;
    for (int i = 0; i < pricesSize; i++) {
        if (prices[i] < mn) mn = prices[i];
        else if (prices[i] - mn > profit) profit = prices[i] - mn;
    }
    return profit;
}`,
        tests: `/* int p[] = {7,1,5,3,6,4}; maxProfit(p, 6) == 5 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <algorithm>
#include <climits>
class Solution {
public:
    int maxProfit(std::vector<int>& prices) {
        int mn = INT_MAX, profit = 0;
        for (int p : prices) {
            mn = std::min(mn, p);
            profit = std::max(profit, p - mn);
        }
        return profit;
    }
};`,
        tests: `// {7,1,5,3,6,4} -> 5`,
      },
    ],
  },

  // ---------- #125 Valid Palindrome ----------
  {
    number: 125,
    codes: [
      {
        language: 'c',
        code: `#include <ctype.h>
#include <stdbool.h>
#include <string.h>
bool isPalindrome(char* s) {
    int l = 0, r = strlen(s) - 1;
    while (l < r) {
        while (l < r && !isalnum((unsigned char)s[l])) l++;
        while (l < r && !isalnum((unsigned char)s[r])) r--;
        if (tolower((unsigned char)s[l]) != tolower((unsigned char)s[r])) return false;
        l++; r--;
    }
    return true;
}`,
        tests: `/* isPalindrome("A man, a plan, a canal: Panama") == true */`,
      },
      {
        language: 'cpp',
        code: `#include <string>
#include <cctype>
class Solution {
public:
    bool isPalindrome(std::string s) {
        int l = 0, r = s.size() - 1;
        while (l < r) {
            while (l < r && !std::isalnum((unsigned char)s[l])) l++;
            while (l < r && !std::isalnum((unsigned char)s[r])) r--;
            if (std::tolower((unsigned char)s[l]) != std::tolower((unsigned char)s[r])) return false;
            l++; r--;
        }
        return true;
    }
};`,
        tests: `// Solution().isPalindrome("race a car") == false`,
      },
    ],
  },

  // ---------- #198 House Robber ----------
  {
    number: 198,
    codes: [
      {
        language: 'c',
        code: `int rob(int* nums, int numsSize) {
    int prev = 0, curr = 0;
    for (int i = 0; i < numsSize; i++) {
        int next = (curr > prev + nums[i]) ? curr : prev + nums[i];
        prev = curr; curr = next;
    }
    return curr;
}`,
        tests: `/* int a[] = {2,7,9,3,1}; rob(a, 5) == 12 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <algorithm>
class Solution {
public:
    int rob(std::vector<int>& nums) {
        int prev = 0, curr = 0;
        for (int n : nums) {
            int next = std::max(curr, prev + n);
            prev = curr; curr = next;
        }
        return curr;
    }
};`,
        tests: `// {2,7,9,3,1} -> 12`,
      },
    ],
  },

  // ---------- #217 Contains Duplicate ----------
  {
    number: 217,
    codes: [
      {
        language: 'c',
        code: `#include <stdbool.h>
#include <stdlib.h>
static int cmp(const void* a, const void* b) { return *(int*)a - *(int*)b; }
bool containsDuplicate(int* nums, int numsSize) {
    qsort(nums, numsSize, sizeof(int), cmp);
    for (int i = 1; i < numsSize; i++) if (nums[i] == nums[i-1]) return true;
    return false;
}`,
        tests: `/* int a[] = {1,2,3,1}; containsDuplicate(a, 4) == true */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <unordered_set>
class Solution {
public:
    bool containsDuplicate(std::vector<int>& nums) {
        std::unordered_set<int> seen;
        for (int n : nums) {
            if (seen.count(n)) return true;
            seen.insert(n);
        }
        return false;
    }
};`,
        tests: `// {1,2,3,4} -> false`,
      },
    ],
  },

  // ---------- #238 Product of Array Except Self ----------
  {
    number: 238,
    codes: [
      {
        language: 'c',
        code: `#include <stdlib.h>
int* productExceptSelf(int* nums, int numsSize, int* returnSize) {
    int* res = malloc(sizeof(int) * numsSize);
    *returnSize = numsSize;
    res[0] = 1;
    for (int i = 1; i < numsSize; i++) res[i] = res[i-1] * nums[i-1];
    int suffix = 1;
    for (int i = numsSize - 1; i >= 0; i--) {
        res[i] *= suffix;
        suffix *= nums[i];
    }
    return res;
}`,
        tests: `/* input {1,2,3,4} -> {24,12,8,6} */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
class Solution {
public:
    std::vector<int> productExceptSelf(std::vector<int>& nums) {
        int n = nums.size();
        std::vector<int> res(n);
        res[0] = 1;
        for (int i = 1; i < n; i++) res[i] = res[i-1] * nums[i-1];
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) {
            res[i] *= suffix;
            suffix *= nums[i];
        }
        return res;
    }
};`,
        tests: `// {1,2,3,4} -> {24,12,8,6}`,
      },
    ],
  },

  // ---------- #300 Longest Increasing Subsequence ----------
  {
    number: 300,
    codes: [
      {
        language: 'c',
        code: `int lengthOfLIS(int* nums, int numsSize) {
    int* tails = (int*)malloc(sizeof(int) * numsSize);
    int len = 0;
    for (int i = 0; i < numsSize; i++) {
        int l = 0, r = len;
        while (l < r) {
            int m = (l + r) / 2;
            if (tails[m] < nums[i]) l = m + 1; else r = m;
        }
        tails[l] = nums[i];
        if (l == len) len++;
    }
    free(tails);
    return len;
}`,
        tests: `/* {10,9,2,5,3,7,101,18} -> 4 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <algorithm>
class Solution {
public:
    int lengthOfLIS(std::vector<int>& nums) {
        std::vector<int> tails;
        for (int n : nums) {
            auto it = std::lower_bound(tails.begin(), tails.end(), n);
            if (it == tails.end()) tails.push_back(n);
            else *it = n;
        }
        return (int)tails.size();
    }
};`,
        tests: `// {10,9,2,5,3,7,101,18} -> 4`,
      },
    ],
  },

  // ---------- #322 Coin Change ----------
  {
    number: 322,
    codes: [
      {
        language: 'c',
        code: `#include <stdlib.h>
int coinChange(int* coins, int coinsSize, int amount) {
    int INF = amount + 1;
    int* dp = (int*)malloc(sizeof(int) * (amount + 1));
    for (int i = 0; i <= amount; i++) dp[i] = INF;
    dp[0] = 0;
    for (int i = 1; i <= amount; i++) {
        for (int c = 0; c < coinsSize; c++) {
            if (coins[c] <= i && dp[i - coins[c]] + 1 < dp[i])
                dp[i] = dp[i - coins[c]] + 1;
        }
    }
    int r = (dp[amount] == INF) ? -1 : dp[amount];
    free(dp);
    return r;
}`,
        tests: `/* int c[] = {1,2,5}; coinChange(c, 3, 11) == 3 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <algorithm>
class Solution {
public:
    int coinChange(std::vector<int>& coins, int amount) {
        std::vector<int> dp(amount + 1, amount + 1);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int c : coins) {
                if (c <= i) dp[i] = std::min(dp[i], dp[i - c] + 1);
            }
        }
        return dp[amount] > amount ? -1 : dp[amount];
    }
};`,
        tests: `// coins {2}, amount 3 -> -1`,
      },
    ],
  },

  // ---------- #704 Binary Search ----------
  {
    number: 704,
    codes: [
      {
        language: 'c',
        code: `int search(int* nums, int numsSize, int target) {
    int l = 0, r = numsSize - 1;
    while (l <= r) {
        int m = l + (r - l) / 2;
        if (nums[m] == target) return m;
        if (nums[m] < target) l = m + 1; else r = m - 1;
    }
    return -1;
}`,
        tests: `/* int a[] = {-1,0,3,5,9,12}; search(a, 6, 9) == 4 */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
class Solution {
public:
    int search(std::vector<int>& nums, int target) {
        int l = 0, r = (int)nums.size() - 1;
        while (l <= r) {
            int m = l + (r - l) / 2;
            if (nums[m] == target) return m;
            if (nums[m] < target) l = m + 1; else r = m - 1;
        }
        return -1;
    }
};`,
        tests: `// {-1,0,3,5,9,12}, target 2 -> -1`,
      },
    ],
  },

  // ---------- #912 Sort an Array (merge sort) ----------
  {
    number: 912,
    codes: [
      {
        language: 'c',
        code: `#include <stdlib.h>
static void mergeHalves(int* a, int l, int m, int r, int* tmp) {
    int i = l, j = m + 1, k = l;
    while (i <= m && j <= r) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i <= m) tmp[k++] = a[i++];
    while (j <= r) tmp[k++] = a[j++];
    for (int x = l; x <= r; x++) a[x] = tmp[x];
}
static void msort(int* a, int l, int r, int* tmp) {
    if (l >= r) return;
    int m = (l + r) / 2;
    msort(a, l, m, tmp);
    msort(a, m + 1, r, tmp);
    mergeHalves(a, l, m, r, tmp);
}
int* sortArray(int* nums, int numsSize, int* returnSize) {
    int* tmp = (int*)malloc(sizeof(int) * numsSize);
    msort(nums, 0, numsSize - 1, tmp);
    free(tmp);
    *returnSize = numsSize;
    return nums;
}`,
        tests: `/* sorts in place then returns pointer */`,
      },
      {
        language: 'cpp',
        code: `#include <vector>
#include <algorithm>
class Solution {
    void msort(std::vector<int>& a, int l, int r, std::vector<int>& tmp) {
        if (l >= r) return;
        int m = (l + r) / 2;
        msort(a, l, m, tmp);
        msort(a, m + 1, r, tmp);
        int i = l, j = m + 1, k = l;
        while (i <= m && j <= r) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
        while (i <= m) tmp[k++] = a[i++];
        while (j <= r) tmp[k++] = a[j++];
        for (int x = l; x <= r; x++) a[x] = tmp[x];
    }
public:
    std::vector<int> sortArray(std::vector<int>& nums) {
        std::vector<int> tmp(nums.size());
        msort(nums, 0, (int)nums.size() - 1, tmp);
        return nums;
    }
};`,
        tests: `// Solution().sortArray(v) where v = {5,2,3,1,4} -> {1,2,3,4,5}`,
      },
    ],
  },
];

(async () => {
  await mongoose.connect(MONGO_URI, { family: 4, serverSelectionTimeoutMS: 15000 });
  let updated = 0, missing = 0;
  for (const V of VARIANTS) {
    const doc = await LeetProblem.findOne({ number: V.number });
    if (!doc) {
      console.warn(`#${V.number}: not found — run seed-leetcode-* first. Skipping.`);
      missing++;
      continue;
    }
    doc.codes = V.codes;
    await doc.save();
    updated++;
    console.log(`#${V.number} "${doc.title}": ${V.codes.length} language variants set (${V.codes.map(c => c.language).join(', ')})`);
  }
  console.log(`\nMultilang seed complete: ${updated} updated, ${missing} missing.`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });

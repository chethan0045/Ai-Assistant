/**
 * Seed LeetCode #112 — Path Sum.
 */
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://todoUser:chethan45@cluster0.etbmi2g.mongodb.net/ai-app?retryWrites=true&w=majority&appName=Cluster0';
const LeetProblem = require('./models/LeetProblem');

const P = {
  number: 112, title: 'Path Sum', difficulty: 'Easy',
  topics: ['tree', 'depth-first-search', 'binary-tree', 'recursion'],
  description: 'Given the root of a binary tree and an integer targetSum, return true if the tree has a root-to-leaf path such that adding up all the values along the path equals targetSum. A leaf is a node with no children.',
  keywords: [
    'path sum',
    'root to leaf',
    'binary tree path',
    'target sum tree',
    'tree path sum',
    'sum along path',
    'leaf node sum',
    'dfs path sum',
  ],
  signatures: [
    'path\\s+sum',
    'root.?to.?leaf\\s+path',
    'root.?to.?leaf.*(?:sum|equal)',
    'adding\\s+up.*values\\s+along\\s+the\\s+path',
    'target\\s*sum.*(?:tree|path)',
    'binary\\s+tree.*target\\s*sum',
    'tree.*equals\\s+targetSum',
  ],
  complexity: { time: 'O(n) — visits each node once', space: 'O(h) — recursion stack, h = tree height (O(n) worst, O(log n) balanced)' },
  approach: 'Recursive DFS. At each node, subtract the node value from the remaining target. A leaf (no left and no right) contributes true iff the remaining target equals the leaf\'s value. Internal nodes return true if either subtree can hit the reduced target. Empty tree is always false — an empty tree has no root-to-leaf path, not even for targetSum=0.',
  code: `/**
 * Definition for a binary tree node.
 * function TreeNode(val, left, right) {
 *   this.val = (val===undefined ? 0 : val);
 *   this.left = (left===undefined ? null : left);
 *   this.right = (right===undefined ? null : right);
 * }
 */
/**
 * @param {TreeNode} root
 * @param {number} targetSum
 * @return {boolean}
 */
function hasPathSum(root, targetSum) {
  if (root === null) return false;

  // Leaf node — path ends here; check if it matches the remaining target.
  if (root.left === null && root.right === null) {
    return root.val === targetSum;
  }

  // Internal node — descend with the reduced target.
  const remaining = targetSum - root.val;
  return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}

// Iterative alternative using a stack of [node, remainingTarget] pairs —
// same O(n) / O(h) bounds but avoids recursion limits on deep trees.
function hasPathSumIterative(root, targetSum) {
  if (root === null) return false;
  const stack = [[root, targetSum]];
  while (stack.length) {
    const [node, remaining] = stack.pop();
    if (node.left === null && node.right === null && node.val === remaining) {
      return true;
    }
    if (node.right) stack.push([node.right, remaining - node.val]);
    if (node.left)  stack.push([node.left,  remaining - node.val]);
  }
  return false;
}`,
  tests: `// Helper to build a binary tree from a level-order array (LeetCode format).
function build(arr) {
  if (!arr.length || arr[0] == null) return null;
  const root = { val: arr[0], left: null, right: null };
  const queue = [root];
  let i = 1;
  while (queue.length && i < arr.length) {
    const node = queue.shift();
    if (i < arr.length && arr[i] != null) {
      node.left = { val: arr[i], left: null, right: null };
      queue.push(node.left);
    }
    i++;
    if (i < arr.length && arr[i] != null) {
      node.right = { val: arr[i], left: null, right: null };
      queue.push(node.right);
    }
    i++;
  }
  return root;
}

console.log(hasPathSum(build([5,4,8,11,null,13,4,7,2,null,null,null,1]), 22)); // true
console.log(hasPathSum(build([1,2,3]), 5));                                     // false
console.log(hasPathSum(build([]), 0));                                          // false (empty tree)
console.log(hasPathSum(build([1,2]), 1));                                       // false — 1 is not a leaf, only path is 1→2
console.log(hasPathSum(build([-2,null,-3]), -5));                               // true — negative values work too`,
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

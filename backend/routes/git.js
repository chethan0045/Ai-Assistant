const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

/**
 * Git integration routes.
 * All commands run in the project's cwd (path param).
 */

function runGit(cwd, args, timeout = 10000) {
  return new Promise((resolve) => {
    exec(`git ${args}`, { cwd, timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, error: stderr?.trim() || err.message, stdout: stdout?.trim() });
      } else {
        resolve({ ok: true, stdout: stdout?.trim() || '', stderr: stderr?.trim() });
      }
    });
  });
}

// ===== STATUS — modified/added/untracked/deleted =====
router.get('/status', async (req, res) => {
  const cwd = req.query.cwd;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });

  // Check if it's a git repo
  const check = await runGit(cwd, 'rev-parse --is-inside-work-tree');
  if (!check.ok) {
    return res.json({ initialized: false, files: [], branch: null, remote: null });
  }

  // Branch
  const branchRes = await runGit(cwd, 'branch --show-current');
  const branch = branchRes.ok ? branchRes.stdout : null;

  // Remote
  const remoteRes = await runGit(cwd, 'remote get-url origin');
  const remote = remoteRes.ok ? remoteRes.stdout : null;

  // Ahead/behind
  let ahead = 0, behind = 0;
  if (remote && branch) {
    const countRes = await runGit(cwd, `rev-list --left-right --count origin/${branch}...HEAD`);
    if (countRes.ok) {
      const [b, a] = countRes.stdout.split(/\s+/).map(Number);
      behind = b || 0; ahead = a || 0;
    }
  }

  // Status
  const statusRes = await runGit(cwd, 'status --porcelain=v1');
  const files = [];
  if (statusRes.ok) {
    const lines = statusRes.stdout.split('\n').filter(Boolean);
    for (const line of lines) {
      const x = line[0];
      const y = line[1];
      const filePath = line.slice(3).trim();
      let status = 'modified';
      if (x === '?' && y === '?') status = 'untracked';
      else if (x === 'A' || y === 'A') status = 'added';
      else if (x === 'D' || y === 'D') status = 'deleted';
      else if (x === 'R') status = 'renamed';
      else if (x === 'M' || y === 'M') status = 'modified';
      else if (x === 'U' || y === 'U') status = 'conflict';
      const staged = x !== ' ' && x !== '?';
      files.push({ path: filePath, status, staged });
    }
  }

  res.json({ initialized: true, branch, remote, ahead, behind, files });
});

// ===== INIT =====
router.post('/init', async (req, res) => {
  const { cwd } = req.body;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const r = await runGit(cwd, 'init');
  if (!r.ok) return res.status(500).json({ error: r.error });
  await runGit(cwd, 'branch -M main');
  res.json({ message: 'Initialized empty git repo', stdout: r.stdout });
});

// ===== STAGE FILE(S) =====
router.post('/add', async (req, res) => {
  const { cwd, files } = req.body;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const args = files && files.length > 0
    ? `add ${files.map(f => `"${f}"`).join(' ')}`
    : 'add -A';
  const r = await runGit(cwd, args);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: 'Staged', count: files?.length || 'all' });
});

// ===== UNSTAGE =====
router.post('/unstage', async (req, res) => {
  const { cwd, files } = req.body;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const args = files && files.length > 0
    ? `reset HEAD -- ${files.map(f => `"${f}"`).join(' ')}`
    : 'reset HEAD';
  const r = await runGit(cwd, args);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: 'Unstaged' });
});

// ===== DISCARD CHANGES =====
router.post('/discard', async (req, res) => {
  const { cwd, file } = req.body;
  if (!cwd || !file) return res.status(400).json({ error: 'cwd and file required' });
  const r = await runGit(cwd, `checkout -- "${file}"`);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: `Discarded changes in ${file}` });
});

// ===== COMMIT =====
router.post('/commit', async (req, res) => {
  const { cwd, message, userName, userEmail } = req.body;
  if (!cwd || !message) return res.status(400).json({ error: 'cwd and message required' });

  // Set author if provided (useful for IDE commits without global config)
  const userArgs = (userName && userEmail)
    ? `-c user.name="${userName}" -c user.email="${userEmail}"`
    : '';

  const escaped = message.replace(/"/g, '\\"');
  const r = await runGit(cwd, `${userArgs} commit -m "${escaped}"`);
  if (!r.ok) return res.status(500).json({ error: r.error, stdout: r.stdout });
  res.json({ message: 'Committed', stdout: r.stdout });
});

// ===== PUSH =====
router.post('/push', async (req, res) => {
  const { cwd, remote, branch, setUpstream } = req.body;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const r = remote === undefined
    ? await runGit(cwd, 'push', 60000)
    : await runGit(cwd, `push ${setUpstream ? '-u ' : ''}${remote || 'origin'} ${branch || 'main'}`, 60000);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: 'Pushed', stdout: r.stdout, stderr: r.stderr });
});

// ===== PULL =====
router.post('/pull', async (req, res) => {
  const { cwd, remote, branch } = req.body;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const args = remote === undefined ? 'pull' : `pull ${remote || 'origin'} ${branch || 'main'}`;
  const r = await runGit(cwd, args, 60000);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: 'Pulled', stdout: r.stdout });
});

// ===== FETCH =====
router.post('/fetch', async (req, res) => {
  const { cwd } = req.body;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const r = await runGit(cwd, 'fetch --all', 30000);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: 'Fetched' });
});

// ===== REMOTE =====
router.post('/remote', async (req, res) => {
  const { cwd, action, name, url } = req.body;
  if (!cwd || !action) return res.status(400).json({ error: 'cwd and action required' });

  let args = 'remote -v';
  if (action === 'add') args = `remote add ${name || 'origin'} "${url}"`;
  else if (action === 'remove') args = `remote remove ${name || 'origin'}`;
  else if (action === 'set-url') args = `remote set-url ${name || 'origin'} "${url}"`;

  const r = await runGit(cwd, args);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: `Remote ${action}`, stdout: r.stdout });
});

// ===== LOG =====
router.get('/log', async (req, res) => {
  const cwd = req.query.cwd;
  const limit = req.query.limit || 20;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const r = await runGit(cwd, `log -${limit} --pretty=format:"%h|%an|%ar|%s"`);
  if (!r.ok) return res.json({ commits: [] });
  const commits = r.stdout.split('\n').filter(Boolean).map(line => {
    const [hash, author, date, ...msg] = line.split('|');
    return { hash, author, date, message: msg.join('|') };
  });
  res.json({ commits });
});

// ===== DIFF =====
router.get('/diff', async (req, res) => {
  const { cwd, file, staged } = req.query;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const args = staged === 'true'
    ? `diff --cached ${file ? `"${file}"` : ''}`
    : `diff ${file ? `"${file}"` : ''}`;
  const r = await runGit(cwd, args);
  res.json({ diff: r.ok ? r.stdout : '' });
});

// ===== BRANCH =====
router.get('/branch', async (req, res) => {
  const cwd = req.query.cwd;
  if (!cwd) return res.status(400).json({ error: 'cwd required' });
  const r = await runGit(cwd, 'branch -a');
  if (!r.ok) return res.json({ branches: [], current: null });
  const branches = r.stdout.split('\n').map(l => l.trim()).filter(Boolean);
  const current = branches.find(b => b.startsWith('*'))?.slice(2) || null;
  res.json({
    current,
    branches: branches.map(b => ({
      name: b.replace(/^\*?\s*/, '').replace(/^remotes\//, ''),
      current: b.startsWith('*'),
      remote: b.includes('remotes/'),
    })),
  });
});

// ===== CHECKOUT / SWITCH BRANCH =====
router.post('/checkout', async (req, res) => {
  const { cwd, branch, create } = req.body;
  if (!cwd || !branch) return res.status(400).json({ error: 'cwd and branch required' });
  const args = create ? `checkout -b "${branch}"` : `checkout "${branch}"`;
  const r = await runGit(cwd, args);
  if (!r.ok) return res.status(500).json({ error: r.error });
  res.json({ message: `Switched to ${branch}` });
});

module.exports = router;

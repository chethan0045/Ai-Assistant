const express = require('express');
const router = express.Router();
const fs = require('fs');
const { fastInstall, CACHE_ROOT } = require('../services/depsCache');

/**
 * POST /api/scaffold/fast-install
 * Body: { path: '<absolute project path>' }
 *
 * Ensures the shared node_modules cache is populated for this project's
 * dep hash, then junctions it into the project. First call for a given
 * hash runs `npm install` (~2 min for Angular); subsequent calls return
 * in milliseconds.
 */
router.post('/fast-install', async (req, res) => {
  try {
    const { path: projectPath } = req.body || {};
    if (!projectPath) return res.status(400).json({ error: 'path required' });
    if (!fs.existsSync(projectPath)) return res.status(404).json({ error: 'project path does not exist' });

    const result = await fastInstall(projectPath);
    res.json(result);
  } catch (err) {
    console.error('Fast install error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scaffold/cache-info
 * Returns summary of what's in the cache — useful for debug / dashboard.
 */
router.get('/cache-info', (_req, res) => {
  try {
    if (!fs.existsSync(CACHE_ROOT)) return res.json({ root: CACHE_ROOT, entries: [] });
    const entries = fs.readdirSync(CACHE_ROOT).map(name => {
      const dir = require('path').join(CACHE_ROOT, name);
      const nm = require('path').join(dir, 'node_modules');
      let sizeMb = null;
      try {
        if (fs.existsSync(nm)) {
          // Top-level-only size — recursive is too slow for big caches.
          const count = fs.readdirSync(nm).length;
          return { hash: name, dir, nodeModulesExists: true, topLevelPackages: count };
        }
      } catch {}
      return { hash: name, dir, nodeModulesExists: false };
    });
    res.json({ root: CACHE_ROOT, entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

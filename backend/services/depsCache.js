// Shared node_modules cache for scaffolded projects.
//
// Problem: every scaffolded Angular project runs `npm install` from scratch —
// 800+ packages, ~2 min, gigabytes of duplicate disk. Same packages for every
// scaffold of the same template.
//
// Fix: install deps ONCE into ~/.ai-scaffold-cache/<hash>/node_modules and
// create a Windows junction (symlink on mac/linux) from each new project to
// the cache. First scaffold pays the 2-min cost; every subsequent scaffold
// with the same dependency set is instantaneous.
//
// The cache key is a hash of (dependencies + devDependencies) — scripts,
// comments, or version bumps elsewhere don't invalidate the cache.
//
// Safety caveat: because projects share the cached node_modules via a
// symlink, running `npm install <new-pkg>` in one project mutates the cache
// for ALL projects using that hash. Fine for normal dev (everyone gets the
// extra package) but noted in the scaffold README so users know how to
// "eject" to a local install if needed.

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

const CACHE_ROOT = path.join(os.homedir(), '.ai-scaffold-cache');

/**
 * Hash package.json deps so only real dependency changes invalidate the cache.
 * We ignore scripts / metadata / version field because they don't affect
 * what lives under node_modules.
 */
function hashDependencies(pkgJsonContent) {
  let obj;
  try {
    obj = JSON.parse(pkgJsonContent);
  } catch {
    obj = { raw: pkgJsonContent };
  }
  const signature = {
    dependencies: obj.dependencies || {},
    devDependencies: obj.devDependencies || {},
    peerDependencies: obj.peerDependencies || {},
  };
  // Sort keys so ordering doesn't change the hash.
  const normalized = JSON.stringify(signature, Object.keys(signature).sort());
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
}

/** Run `npm install --no-audit --no-fund` in the given dir. Resolves on exit 0. */
function runNpmInstall(cwd) {
  return new Promise((resolve, reject) => {
    const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const child = spawn(cmd, ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let errOut = '';
    let stdout = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { errOut += d.toString(); });
    child.on('error', reject);
    child.on('exit', code => {
      if (code === 0) resolve({ stdout, errOut });
      else reject(new Error(`npm install failed (exit ${code}) — ${errOut.slice(0, 800)}`));
    });
  });
}

/**
 * Ensure the cache for this project's package.json is ready. First call for a
 * given dep-hash kicks off npm install; subsequent calls return the existing
 * cache directory immediately.
 */
async function ensureCache(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) throw new Error(`package.json not found at ${pkgPath}`);
  const pkg = fs.readFileSync(pkgPath, 'utf-8');
  const hash = hashDependencies(pkg);
  const cacheDir = path.join(CACHE_ROOT, hash);
  const cacheNodeModules = path.join(cacheDir, 'node_modules');

  if (fs.existsSync(cacheNodeModules)) {
    return { hash, cacheDir, installed: false };
  }

  // First time for this dep set — write package.json and install into the cache.
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'package.json'), pkg);
  await runNpmInstall(cacheDir);
  return { hash, cacheDir, installed: true };
}

/**
 * Create a junction (Windows) or symlink (posix) from cacheDir/node_modules into
 * projectPath/node_modules. If target already exists and is a real folder, leave
 * it alone — we don't overwrite a user's existing install.
 */
function linkNodeModules(cacheDir, projectPath) {
  const targetNodeModules = path.join(projectPath, 'node_modules');
  const cacheNodeModules = path.join(cacheDir, 'node_modules');

  if (fs.existsSync(targetNodeModules)) {
    // Check if it's already our symlink — if so, nothing to do.
    try {
      const lstat = fs.lstatSync(targetNodeModules);
      if (lstat.isSymbolicLink() || lstat.isDirectory()) {
        // Already present. We leave existing folders alone so we don't clobber
        // a user-customized install.
        return { linked: false, reason: 'target already exists' };
      }
    } catch {}
  }

  const type = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(cacheNodeModules, targetNodeModules, type);
  return { linked: true };
}

/**
 * End-to-end: ensure the cache, then link it into the project.
 * This is what the HTTP endpoint calls — one shot, returns timing.
 */
async function fastInstall(projectPath) {
  const startedAt = Date.now();
  const { hash, cacheDir, installed } = await ensureCache(projectPath);
  const link = linkNodeModules(cacheDir, projectPath);
  return {
    hash,
    cacheDir,
    cacheHit: !installed,
    installedNow: installed,
    linked: link.linked,
    skipReason: link.reason,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = { fastInstall, ensureCache, linkNodeModules, hashDependencies, CACHE_ROOT };

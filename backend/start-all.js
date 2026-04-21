// Starts every backend process in one terminal. Prefixes each line with the
// source so you can tell Node from Python logs at a glance. Ctrl-C kills both.
// No external deps — uses only Node's built-in child_process.

const { spawn } = require('child_process');
const path = require('path');

const RESET = '\x1b[0m';
const procs = [
  {
    name: 'node',
    color: '\x1b[36m', // cyan
    cmd: process.execPath,             // current node binary
    args: ['terminal-server.js'],
    cwd: __dirname,
  },
  {
    name: 'py  ',
    color: '\x1b[33m', // yellow
    cmd: process.platform === 'win32' ? 'python' : 'python3',
    args: ['ai-server.py'],
    cwd: __dirname,
    optional: true,                    // don't fail the whole dev loop if Python isn't installed
  },
];

const children = [];

for (const p of procs) {
  const child = spawn(p.cmd, p.args, { cwd: p.cwd, shell: false });

  const prefix = `${p.color}[${p.name}]${RESET} `;
  const pipe = (stream, dest) => {
    let buf = '';
    stream.on('data', chunk => {
      buf += chunk.toString();
      let idx;
      while ((idx = buf.indexOf('\n')) >= 0) {
        dest.write(prefix + buf.slice(0, idx) + '\n');
        buf = buf.slice(idx + 1);
      }
    });
    stream.on('end', () => { if (buf) dest.write(prefix + buf + '\n'); });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on('error', err => {
    if (p.optional && err.code === 'ENOENT') {
      console.log(`${prefix}(skipped — ${p.cmd} not on PATH)`);
    } else {
      console.error(`${prefix}spawn error: ${err.message}`);
    }
  });
  child.on('exit', (code, signal) => {
    console.log(`${prefix}exited (code=${code}, signal=${signal || '-'})`);
    // If the Node backend dies, tear everything down. Python is optional.
    if (p.name.trim() === 'node') shutdown(code ?? 1);
  });

  children.push({ ...p, child });
}

function shutdown(code = 0) {
  for (const { child } of children) {
    if (!child.killed) {
      try { child.kill(); } catch {}
    }
  }
  process.exit(code);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

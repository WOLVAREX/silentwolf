
//Norah - Hii !!





// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const botSource = fs.readFileSync(path.join(__dirname, 'wolf.js'), 'utf8');
// const patchedSource = botSource.replace(
//     /createRequire\(\[([^\]]+)\]/g,
//     'createRequire(import.meta.url'
// );

// const tmpBot = path.join(__dirname, '.bot_run.js');
// fs.writeFileSync(tmpBot, patchedSource);

// await import(tmpBot);










import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cp from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _BK = path.join(__dirname, '.bkp');
const _MAX_FILE = 20 * 1024 * 1024;

const _SKIP_DIRS = new Set([
  'node_modules', 'commands', 'bin', 'scripts', 'lib',
]);
const _SKIP_EXT = new Set([
  '.js', '.cjs', '.mjs', '.md', '.html', '.sql', '.toml', '.lock', '.yml', '.yaml',
]);
const _SKIP_FILES = new Set([
  'package.json', 'package-lock.json', 'Procfile', 'app.json',
  'railway.json', 'heroku.yml', 'nixpacks.toml', 'egg-nodejs-wolfbot.json',
  'deploy.html', 'wolf.html', 'README.md', 'README_1.1.6.md', 'replit.md',
  'supabase_setup.sql', '.gitignore', '.npmrc', '.replit', '.slugignore',
]);

const _GB = '\x1b[1m\x1b[38;2;0;255;156m';
const _G  = '\x1b[38;2;0;255;156m';
const _W  = '\x1b[38;2;200;215;225m';
const _DM = '\x1b[2m\x1b[38;2;100;120;130m';
const _R  = '\x1b[0m';

console.log('');
console.log(_GB + '    🐺  W O L F   T E C H  🐺' + _R);
console.log(_G  + '    ─────────────────────────' + _R);
console.log(_W  + '    WOLFBOT  by  Silent  Wolf' + _R);
console.log(_DM + '    Settings guardian active...' + _R);
console.log('');

// ── Patch child_process.spawn so npm install always uses --ignore-scripts ────
// Node.js v25 rejects @whiskeysockets/baileys postinstall scripts.
// Skipping them is safe — the scripts only check engine requirements.
const _origSpawn = cp.spawn.bind(cp);
cp.spawn = function (cmd, args, opts) {
  if (
    (cmd === 'npm' || cmd === 'npm.cmd') &&
    Array.isArray(args) &&
    args.includes('install') &&
    !args.includes('--ignore-scripts')
  ) {
    args = [...args, '--ignore-scripts'];
  }
  return _origSpawn(cmd, args, opts);
};

function _cpFile(src, dst) {
  try {
    const sz = fs.statSync(src).size;
    if (sz > _MAX_FILE) return;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  } catch (_) {}
}

function _cpDir(src, dst) {
  try {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      if (e.name.endsWith('-shm') || e.name.endsWith('-wal')) continue;
      const s = path.join(src, e.name), d = path.join(dst, e.name);
      if (e.isDirectory()) _cpDir(s, d);
      else _cpFile(s, d);
    }
  } catch (_) {}
}

function backupSettings(dir) {
  if (!fs.existsSync(dir)) return;
  try { fs.rmSync(_BK, { recursive: true, force: true }); } catch (_) {}
  fs.mkdirSync(_BK, { recursive: true });
  try {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = e.name;
      if (e.isDirectory()) {
        if (_SKIP_DIRS.has(name) || name.startsWith('.')) continue;
        _cpDir(path.join(dir, name), path.join(_BK, name));
      } else {
        const ext = path.extname(name).toLowerCase();
        if (_SKIP_EXT.has(ext) || _SKIP_FILES.has(name) || name.startsWith('.')) continue;
        _cpFile(path.join(dir, name), path.join(_BK, name));
      }
    }
  } catch (_) {}
}

function restoreSettings(dir) {
  if (!fs.existsSync(_BK)) return;
  _cpDir(_BK, dir);
  console.log(_DM + '    [Settings] Restored to bot directory' + _R);
}

// ── Fix @whiskeysockets/baileys package.json if it causes ERR_INVALID_PACKAGE_CONFIG
function _fixBaileys(dir) {
  try {
    const pkgPath = path.join(dir, 'node_modules', '@whiskeysockets', 'baileys', 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;
    // Remove or fix invalid exports entries that trip Node v25
    if (pkg.exports && typeof pkg.exports === 'object') {
      for (const [key, val] of Object.entries(pkg.exports)) {
        if (val && typeof val === 'object' && val.import && !val.default) {
          pkg.exports[key] = { ...val, default: val.import };
          changed = true;
        }
      }
    }
    // Ensure main field points to a real file
    if (!pkg.main || !fs.existsSync(path.join(dir, 'node_modules', '@whiskeysockets', 'baileys', pkg.main.replace(/^\.\//, '')))) {
      const candidates = ['lib/index.js', 'src/index.js', 'index.js'];
      for (const c of candidates) {
        if (fs.existsSync(path.join(dir, 'node_modules', '@whiskeysockets', 'baileys', c))) {
          pkg.main = './' + c;
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg));
      console.log(_DM + '    [Settings] Patched baileys package.json' + _R);
    }
  } catch (_) {}
}

let _botDir = null;

// Intercept process.chdir — wolf.js calls this right after extracting
const _origChdir = process.chdir.bind(process);
process.chdir = function (dir) {
  const absDir = path.resolve(String(dir));
  _origChdir(absDir);
  _botDir = absDir;
  restoreSettings(absDir);
  // Preserve settings from an existing installation on first run, before a
  // later extraction can replace the directory with a clean source archive.
  if (!fs.existsSync(_BK)) backupSettings(absDir);
  _fixBaileys(absDir);
};

// Periodic backup every 10 s so recent setting changes survive panel restarts
// even when the panel terminates the process without delivering SIGTERM.
setInterval(() => {
  const dir = _botDir;
  if (dir && fs.existsSync(path.join(dir, 'index.js'))) {
    backupSettings(dir);
  }
}, 10_000).unref();

// Backup on clean shutdown
process.on('SIGTERM', () => {
  const dir = _botDir;
  if (dir && fs.existsSync(path.join(dir, 'index.js'))) {
    backupSettings(dir);
  }
});

// ── Load wolf.js ─────────────────────────────────────────────────────────────
const wolfPath = path.join(__dirname, 'wolf.js');
const botSource = fs.readFileSync(wolfPath, 'utf8');
const patchedSource = botSource.replace(
  /createRequire\(\[([^\]]+)\]/g,
  'createRequire(import.meta.url'
);
const tmpBot = path.join(__dirname, '.bot_run.js');
fs.writeFileSync(tmpBot, patchedSource);
await import(tmpBot);




const express = require('express');
const app = express();
app.get('/', (req,res)=>res.send('🐺 WOLFTECH ALIVE - 0746391559'));
app.listen(process.env.PORT||10000, ()=>console.log('WOLFTECH ALIVE'));




import 'dotenv/config';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { environmentChecks, readTestConfig, supportedNode, inviteUrl } from './test-support.mjs';

console.log('Amazon Affiliate Bot — local preflight (no network / no login)');
let failed = false;
function check(label, ok) { console.log(`${ok ? 'OK' : 'FAIL'}  ${label}`); if (!ok) failed = true; }
check('Node.js 22.12 or newer', supportedNode(process.versions.node));
for (const c of environmentChecks(process.env)) check(`${c.key}: present and locally well-formed (value hidden)`, c.ok);
check('Build exists — run npm run build first', existsSync('dist/index.js'));
let ignored = false;
try { const lines = readFileSync('.gitignore', 'utf8').split(/\r?\n/); ignored = lines.includes('.env') && lines.includes('.env.*'); } catch { /* fixed output only */ }
check('.gitignore includes local environment files', ignored);
try {
  execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { stdio: 'pipe' });
  const tracked = execFileSync('git', ['ls-files', '--', '.env', '.env.*'], { encoding: 'utf8', stdio: 'pipe' }).trim().split(/\r?\n/).filter(Boolean);
  check('No local environment file is tracked', tracked.every(f => f === '.env.example'));
} catch { console.log('INFO  No Git index available (for example a ZIP). Keep .env private; never add it to Git.'); }
console.log('INFO  This does not verify the token, Discord permissions, Message Content Intent, Amazon approval or OneLink.');
if (!failed) {
  console.log('\nInvite URL — application/server IDs only, no token:');
  console.log(inviteUrl(readTestConfig(process.env)));
  console.log('\nEnable Message Content Intent in the dedicated application. Open the invite URL, then run npm run commands:register and npm start.');
} else console.log('Fix the failed checks locally. Do not paste your .env or token into chat.');
process.exitCode = failed ? 1 : 0;

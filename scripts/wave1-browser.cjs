// SPDX-License-Identifier: Apache-2.0
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), http = require('node:http'), { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..'), f = require('../fixtures/synthetic/wave1.cjs');
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);
const waitExit = child => child.exitCode !== null ? Promise.resolve() : new Promise(resolve => { const timer = setTimeout(resolve, 5000); child.once('exit', () => { clearTimeout(timer); resolve(); }); });
async function main() {
  const chrome = candidates.find(file => fs.existsSync(file)); if (!chrome) throw Error('Real Chrome/Chromium required; no mock substitute. Set CHROME_BIN.');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'schedule-core-wave1-browser-'));
  const server = http.createServer((req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>Synthetic Wave 1</title>'); return; }
      if (pathname === '/wave1-fixture.json') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ dataset: f.dataset(), scope: f.scope(), buckets: f.buckets(), withdraw: f.withdraw(), archive: f.archive() })); return; }
      const file = path.resolve(root, '.' + decodeURIComponent(pathname));
      if (!file.startsWith(root + path.sep) || !/\.(js|mjs)$/.test(file) || !fs.statSync(file).isFile()) throw Error('Not found');
      res.setHeader('Content-Type', 'text/javascript'); res.end(fs.readFileSync(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--disable-extensions', '--disable-component-update', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = ''; const timer = setTimeout(() => reject(Error('Browser startup timeout')), 20000);
      child.stderr.on('data', bytes => { output += bytes; const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
      child.once('error', error => { clearTimeout(timer); reject(error); }); child.once('exit', () => { clearTimeout(timer); reject(Error('Browser exited before startup')); });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(Error('CDP connect timeout')), 10000); socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true }); socket.addEventListener('error', () => { clearTimeout(timer); reject(Error('CDP connect failed')); }, { once: true }); });
    let sequence = 0; const pending = new Map();
    socket.addEventListener('message', event => { const msg = JSON.parse(event.data), request = pending.get(msg.id); if (request) { pending.delete(msg.id); clearTimeout(request.timer); msg.error ? request.reject(Error(msg.error.message)) : request.resolve(msg.result); } });
    socket.addEventListener('close', () => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(Error('CDP closed')); } pending.clear(); });
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++sequence, timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout')); }, 30000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const version = await send('Browser.getVersion'), { targetId } = await send('Target.createTarget', { url }), { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    await send('Page.enable', {}, sessionId); await send('Page.navigate', { url }, sessionId);
    const expression = ` (async () => {
      const wave = (await import('/experimental-wave1.mjs')).default, seed = await (await fetch('/wave1-fixture.json')).json(), data = seed.dataset;
      const state = globalThis.ScheduleCoreV2.state, original = globalThis.ScheduleNotesCore, checks = [];
      const check = (name, condition) => { if (!condition) throw Error(name); checks.push({ name, status: 'PASS' }); };
      const before = JSON.stringify(data), revision = await state.hash(data);
      check('browser ESM experimental surface', wave.apiRegistry.length === 16 && original.assessTruth === undefined);
      check('known zero and missing truth', wave.assessTruth({kind:'actual',value:0,quality:'KNOWN',sourceIds:['SRC_SYN_WAVE']}).isKnownZero && wave.assessTruth({kind:'actual',value:null,quality:'UNKNOWN',sourceIds:[]}).value === null);
      const mean = wave.aggregatePeriods(seed.buckets,{calendar:'GREGORIAN_MONTH',closedThrough:'2032-03-31',bucketIds:['M_SYN_01','M_SYN_02','M_SYN_03']});
      check('explicit missing-month denominator', mean.value === 15 && mean.denominator === 2);
      check('stable hospital aggregation', wave.summarizeHospitalSales(data,seed.scope).value === 10);
      const evidence = await wave.candidateEvidence(data,{entityType:'Hospital',query:{name:'Synthetic Twin Hospital'},options:{}}), confirmation = await wave.confirmIdentity(data,{entityType:'Hospital',selectedId:'H_SYN_WAVE1',namespace:null,selection:'EXPLICIT',expectedRevision:revision,evidence});
      check('candidate versus explicit identity', evidence.candidates.quality === 'AMBIGUOUS' && confirmation.status === 'CONFIRMED' && confirmation.authenticationVerified === false);
      const terminal = await wave.planTerminal(data,{entityType:'Task',id:'T_SYN_WAVE',operation:'CANCEL',expectedRevision:revision});
      check('terminal plan validation', terminal.status === 'PLANNED' && (await wave.validateCommandPlan(data,terminal)).status === 'VALID');
      const withdrawn = await wave.planWithdraw(data,seed.withdraw,{recommendationId:'R_SYN_WAVE',expectedRevision:revision,expectedStateRevision:await state.hash(seed.withdraw)});
      const archived = await wave.planArchive(data,seed.archive,{entityType:'Customer',id:'C_SYN_WAVE1',expectedRevision:revision,expectedStateRevision:await state.hash(seed.archive)});
      check('withdraw and archive plans', withdrawn.nextState.associations[0].status === 'WITHDRAWN' && archived.activeCustomerIds.length === 1);
      check('no store mutation or schema migration', JSON.stringify(data) === before && wave.migrationGuard(data).status === 'NO_MIGRATION');
      return checks;
    })()`;
    const evaluated = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (evaluated.exceptionDetails) throw Error(evaluated.exceptionDetails.exception?.description || evaluated.exceptionDetails.text);
    console.log(JSON.stringify({ browser: version.product, checks: evaluated.result.value.length, results: evaluated.result.value }));
    await send('Browser.close'); await waitExit(child);
  } finally {
    socket?.close(); if (child.exitCode === null) { child.kill('SIGKILL'); await waitExit(child); }
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    const resolved = path.resolve(profile); if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('schedule-core-wave1-browser-')) throw Error('Unsafe temporary cleanup path');
    fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
main().catch(error => { console.error('WAVE1_BROWSER_FAILED: ' + error.message); process.exitCode = 1; });

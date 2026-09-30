// Throwaway static server for the headless-Chrome harness (PROJECT-CONTEXT.md §11).
//
// Why a server at all, when the app is documented as `open index.html`? Because the tests need to
// FETCH things -- a saved-calendar fixture out of tests/fixtures/ -- and a file:// page cannot.
// Serving the repo root from one origin makes both the app and the fixtures reachable.
//
// The app's script is one IIFE, so nothing inside it is a global and a test cannot call its
// functions. Every test therefore drives the DOM: set a field and dispatch input+change, or click
// a button. That is why the test script is INJECTED into the served page rather than run beside it.
//
//   node srv.js <port> <repo-root> <test-dir>
//
// GET /index.html?test=<name> serves index.html with t/lib.js and t/<name>.js appended before
// </body>, plus a <pre id="R"> for the result. Everything else is served verbatim.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = +process.argv[2], ROOT = process.argv[3], TDIR = process.argv[4];

http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x');
  let p = decodeURIComponent(u.pathname);
  if (p === '/') p = '/index.html';
  // Never let a test path escape the repo.
  const file = path.join(ROOT, p);
  if (!file.startsWith(path.resolve(ROOT))) { r.writeHead(403); r.end('no'); return; }
  // GET /__sw.js -- a no-op service worker for the `swscope` leg (FIX-PLAN 4.2, audit SUPPLY-3).
  // A service worker's script must be same-origin, and its scope may not reach above the script's
  // own directory unless the response says Service-Worker-Allowed. Served from here, with that
  // header, so the leg can register one at /dist/ (the app's own path) and one at a neighbouring
  // path WITHOUT a stray file in the repo, and without writing into dist/, which Vite empties.
  if (p === '/__sw.js') {
    r.writeHead(200, { 'Content-Type': 'text/javascript', 'Service-Worker-Allowed': '/', 'Cache-Control': 'no-store' });
    r.end('self.addEventListener("install", function(){ self.skipWaiting(); });');
    return;
  }
  const t = u.searchParams.get('test');
  // ?state=<name> substitutes tests/fixtures/<name>.sptcal into the page's own
  // <script id="saved-state"> block, which the app already ships (as `null`) and which
  // restoreSavedState() replays at startup. That is the SHAREABLE-COPY restore path -- a real one --
  // so a test can start from an arbitrary saved state with no debug hook in the app and, crucially,
  // WITHOUT IndexedDB: the `restore` leg's file-handle path is what stalls in headless Chrome, and
  // this deliberately avoids it.
  const stateName = u.searchParams.get('state');
  fs.readFile(file, (e, d) => {
    if (e) { r.writeHead(404); r.end('not found'); return; }
    let o = String(d);
    if (stateName && /^[\w.-]+$/.test(stateName)) {
      const sp = path.join(ROOT, 'tests', 'fixtures', stateName + '.sptcal');
      let json;
      try { json = fs.readFileSync(sp, 'utf8'); }
      catch (err) { r.writeHead(500); r.end('state fixture not found: ' + sp); return; }
      // `<` escaped exactly as buildSavedHtml does, so user text containing a closing script tag
      // cannot truncate the document.
      const safe = json.replace(/</g, '\\u003c');
      const re = /(<script id="saved-state" type="application\/json">)([\s\S]*?)(<\/script>)/;
      if (!re.test(o)) { r.writeHead(500); r.end('no saved-state block in ' + p); return; }
      o = o.replace(re, (m, a, _b, c) => a + safe + c);
    }
    if (t) {
      // ⛔ THE CSP COMES OFF ON ?test= PAGES ONLY (FIX-PLAN 4.1, 30 Sep 2026). The build carries a
      // Content-Security-Policy whose script-src lists the hashes of its own inline scripts, and every
      // leg is injected below as unhashed inline scripts -- which that policy refuses, so every leg
      // would report STILL PENDING. Stripping it here, for the page the leg runs in, keeps each leg
      // testing what it always tested. Pages served WITHOUT ?test= keep the policy -- the pane's
      // ?state= pages, the install gate's iframes (pwagate), a shareable copy framed by sharecopy2 --
      // and cspproof.mjs drives the policy-bearing page over CDP to prove it holds.
      // HARNESS_KEEP_CSP=1 keeps it instead, and adds the hashes of the scripts injected below to its
      // script-src -- a leg then runs under the real policy, with only its own code let in. (Added to
      // reproduce the audit's "shareable copy timed out under the CSP": see HANDOFF, 4.1.)
      const keepCsp = process.env.HARNESS_KEEP_CSP === '1';
      if (!keepCsp) o = o.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\n?/i, () => '');
      // ** Installed in <head>, BEFORE the app's own script parses. ** lib.js is injected at
      // </body>, by which point the app has already run -- so a trap installed there cannot see
      // an exception thrown during init, and the test just reports an empty calendar. That looks
      // like a broken feature and is actually a broken page. Ask window.__ERR before believing
      // any "nothing rendered" result.
      o = o.replace('<head>', '<head>\n<script>\nwindow.__ERR=[];' +
        'window.addEventListener("error",function(e){window.__ERR.push("error: "+(e.message||e)+" @ "+(e.filename||"?")+":"+(e.lineno||"?"));});' +
        'window.addEventListener("unhandledrejection",function(e){window.__ERR.push("reject: "+((e.reason&&(e.reason.message||e.reason))||"?"));});' +
        '(function(){var w=console.warn,r=console.error;' +
        'console.warn=function(){window.__ERR.push("warn: "+[].slice.call(arguments).join(" "));return w.apply(console,arguments);};' +
        'console.error=function(){window.__ERR.push("console: "+[].slice.call(arguments).join(" "));return r.apply(console,arguments);};})();' +
        '\n</script>');
      const lib = fs.readFileSync(path.join(TDIR, 'lib.js'), 'utf8');
      const js  = fs.readFileSync(path.join(TDIR, t + '.js'), 'utf8');
      // ⛔ A FUNCTION replacement, never a string (found 25 Sep 2026). With a string, String.replace
      // reads $' $& $` in the INJECTED CODE as patterns: a test containing `'^' + x + '$'` got the
      // rest of the page spliced into its own source, every leg on the page -- base included --
      // died silently, and each one reported "STILL PENDING", which reads as a broken app.
      const inject = '<pre id="R">pending</pre>\n<script>\n' + lib + '\n</script>\n<script>\n' + js + '\n</script>\n</body>';
      o = o.replace('</body>', () => inject);
      if (keepCsp) {
        const crypto = require('crypto');
        const h = (t) => "'sha256-" + crypto.createHash('sha256').update(t, 'utf8').digest('base64') + "'";
        const errTrap = (o.match(/<head>\n<script>([\s\S]*?)<\/script>/) || [])[1];
        const extra = [errTrap, '\n' + lib + '\n', '\n' + js + '\n'].filter(x => x != null).map(h).join(' ');
        o = o.replace(/(<meta http-equiv="Content-Security-Policy" content="[^"]*script-src )/i, (m) => m + extra + ' ');
      }
    }
    // no-store, or a second run in the same Chrome profile silently tests the first run's page.
    r.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    r.end(Buffer.from(o));
  });
}).listen(PORT, () => console.log('harness listening on ' + PORT));

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
  const t = u.searchParams.get('test');
  fs.readFile(file, (e, d) => {
    if (e) { r.writeHead(404); r.end('not found'); return; }
    let o = String(d);
    if (t) {
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
      o = o.replace('</body>',
        '<pre id="R">pending</pre>\n<script>\n' + lib + '\n</script>\n<script>\n' + js + '\n</script>\n</body>');
    }
    // no-store, or a second run in the same Chrome profile silently tests the first run's page.
    r.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' });
    r.end(Buffer.from(o));
  });
}).listen(PORT, () => console.log('harness listening on ' + PORT));

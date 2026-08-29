// The bridge between the imperative engine and the React chrome.
//
// WHY THIS EXISTS, and why it only carries state ONE way.
//
// React re-renders by MUTATING the DOM node it already made, not by replacing it. So a listener the
// legacy IIFE attaches with document.getElementById('save-file-btn').addEventListener(...) survives
// every subsequent React render, and INPUT needs no bridge at all: React renders the button with
// its real id, the IIFE binds to it afterwards, and clicks keep working exactly as they did. That
// is why main.jsx renders before it calls initLegacyApp(), and why the IIFE's habit of capturing
// nodes into module-scope consts at evaluation time (saveBtn, saveAsBtn) is safe.
//
// OUTPUT is the half that cannot survive unchanged, for three separate reasons:
//
//   1. `el.textContent = 'Saving…'` on a Mantine Button DESTROYS its inner spans. Mantine renders
//      <button><span class="…inner"><span class="…label">Save</span></span></button> and the inner
//      span carries the flex centring. A textContent write replaces all of it with a bare text node.
//   2. `el.className = 'save-status dirty'` assigns the WHOLE string, wiping whatever class Mantine
//      put there. The status text would silently lose its styling the first time it changed.
//   3. Mantine styles disabled state from `[data-disabled]` ONLY -- verified, there is no `:disabled`
//      rule in Button.css. Setting the native `.disabled` property therefore disables the button
//      functionally while leaving it looking enabled.
//
// So: the engine keeps deciding WHAT the chrome should say, and hands that decision here as data.
// React decides how it looks. No imperative code touches a React-rendered node's text, class or
// disabled state again.
//
// ⚠️ Every function below is a NO-OP until React installs the real one. That is deliberate: the
// legacy engine must still evaluate and behave sanely if the chrome ever fails to mount, rather
// than throwing partway through init and taking the rest of the IIFE with it.

const noop = () => {}

export const chrome = {
  // { label, busy, disabled }  — the Save button. `busy` is a state, never a snapshotted string.
  saveBtn: noop,
  // { visible, busy }          — Save As…, which only exists where a real file location can be picked.
  saveAsBtn: noop,
  // { text, tone, title }      — tone is 'idle' | 'dirty' | 'failed'. Replaces the className write.
  saveStatus: noop,
  // { label, primary, disabled, busy } — the export DISPATCHER. Its label is DERIVED from viewMode,
  // never captured: the old handler did `const original = btn.textContent` in a property render()
  // also writes, so a commit landing between the snapshot and the restore could strand the button
  // reading 'Building file...' forever.
  exportBtn: noop,
  // { visible, disabled }      — Export Waterfall to PDF.
  exportWfBtn: noop,
  // { visible, label, items, open } — items are [{id, name, active}]. React renders them carrying
  // the SAME data-id / data-remove / data-action attributes the engine's delegated click handler
  // matches on, so that handler ports across untouched.
  fileMenu: noop,
  // (which, { visible, text, fileName }) — which is 'legacy' | 'update'.
  notice: noop,
  // { visible }                — the PWA install button.
  installBtn: noop,
}

export function installChrome(impl) {
  Object.assign(chrome, impl)
}

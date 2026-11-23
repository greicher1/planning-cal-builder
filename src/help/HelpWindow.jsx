// HelpWindow.jsx -- SPTCal Help: a wide window with a sidebar of sections, one article at a time, search, and
// "On this page" (owner's picks, 21 Nov 2026: window A, design 1 "Docs"). It replaced the one-page Guide (#help-overlay).
//
// WHERE THINGS LIVE (so an edit reads one small file): toc.js is the list of sections and articles; each article's
// words are articles/<id>.jsx; the building blocks are parts.jsx; pictures are shots/*.webp from tools/help-shots.mjs.
// README.md beside this file says how to add or change an article. This file is the window and rarely changes.
//
// Opened by the ? button (#help-fab, static markup in index.html), and by chrome.openHelp(id) from anywhere else.
// "? opens the article for what you're doing" (owner's pick): the open box or editor is read on the PRESS of ?, before
// the click that would close it (CONTEXT below). Otherwise it reopens the last article read, when that one fits the
// view on screen, else the Month view's article in the Month view and the tour in the Waterfall.
//
// Per-machine only, never saved in a calendar: localStorage 'sptcal.help' = { last, monthOnly }. The window has
// Mantine inputs (the search box, the switch), which mint ids, so the engine's field sweep skips `.help-dlg`
// (isSweptField in app.js), as it skips the Export PDF and Compare windows.
//
// withinPortal={false}, as every app Modal: inside #react-root, before #print-root, so both print paths hide it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Modal, Switch } from '@mantine/core'
import { installChrome } from '../chrome/bridge.js'
import { useOutsideCloseGuard } from '../chrome/modalGuard.js'
import { GROUPS, ARTICLES, ARTICLE } from './toc.js'
import { HelpNav } from './parts.jsx'
import { setHelpCloser } from './showme.js'

// Every article file, by id (articles/<id>.jsx exports the body as default).
const BODIES = Object.fromEntries(Object.entries(import.meta.glob('./articles/*.jsx', { eager: true }))
  .map(([file, mod]) => [file.replace(/^.*\/|\.jsx$/g, ''), mod.default]))
for (const id of Object.keys(BODIES)) if (!ARTICLE[id]) console.error(`help: articles/${id}.jsx is not in toc.js`)

const STORE_KEY = 'sptcal.help'
const readStore = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {} } catch (e) { return {} } }
const writeStore = (v) => { try { localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...v })) } catch (e) { /* storage off: forget it */ } }

// What's open when ? is pressed -> the article for it. First match wins.
const shown = sel => { const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
const inMonth = () => !!document.querySelector('#table-wrap .month-view')
const CONTEXT = [
  [() => shown('#pop-shift'), 'shift'],
  [() => shown('#pop-solve'), 'build'],
  [() => shown('.mv-note-pop') || (shown('.note-pop') && inMonth()), 'mvnotes'],
  [() => shown('.note-pop'), 'wfnotes'],
  [() => shown('.day-menu'), 'month'],
  // Settings is open when its button says so (aria-expanded; it never carried an "active" class, so an earlier version of this
  // line never matched). Its tabs have an article each.
  [() => !!document.querySelector('.side-settings-btn[aria-expanded="true"]'), () => {
    const tab = [...document.querySelectorAll('.sw-tab')].find(t => t.getAttribute('aria-selected') === 'true')
    const name = tab && tab.textContent.trim()
    return name === 'Region' ? 'region' : name === 'Presets' ? 'presets' : 'prefs'
  }, ['prefs', 'region', 'presets']],
]
// A table that names an article that is gone would send ? nowhere, silently: say so at load (the help leg's console check).
for (const [, target, ids] of CONTEXT) for (const id of (ids || [target])) if (!ARTICLE[id]) console.error(`help: the ? context names "${id}", which is not in toc.js`)
function contextArticle() {
  for (const [test, target] of CONTEXT) {
    try { if (test()) { const id = typeof target === 'function' ? target() : target; if (ARTICLE[id]) return id } } catch (e) { /* a test that fails is no match */ }
  }
  return null
}
const fitsView = (id, month) => ARTICLE[id] && (ARTICLE[id].view === 'both' || ARTICLE[id].view === (month ? 'month' : 'waterfall'))

const VIEW_LABEL = { waterfall: 'Waterfall', month: 'Month view', both: 'Both views' }

export function HelpWindow() {
  const [open, setOpen] = useState(false)
  const [cur, setCur] = useState('welcome')
  const [q, setQ] = useState('')
  const [monthOnly, setMonthOnly] = useState(() => !!readStore().monthOnly)
  const [index, setIndex] = useState(null)       // id -> the article's text, built the first time someone searches
  const [toc, setToc] = useState([])
  const mainRef = useRef(null)
  const indexRef = useRef(null)
  const pressCtx = useRef(null)

  const visibleArticles = useMemo(() => ARTICLES.filter(a => !monthOnly || a.view !== 'waterfall'), [monthOnly])

  const go = (id) => {
    if (!ARTICLE[id]) return
    setCur(id); setQ(''); writeStore({ last: id })
    if (mainRef.current) mainRef.current.scrollTop = 0
  }
  const openAt = (id) => {
    const month = inMonth()
    const last = readStore().last
    const pick = (id && ARTICLE[id]) ? id : (pressCtx.current || (last && fitsView(last, month) ? last : (month ? 'month' : 'welcome')))
    pressCtx.current = null
    setQ(''); setCur(pick); writeStore({ last: pick }); setOpen(true)
  }
  const close = () => setOpen(false)

  useLayoutEffect(() => {
    installChrome({ openHelp: (id) => openAt(id) })
    setHelpCloser(() => setOpen(false))
  }, [])

  // The ? button. Read what's open on the PRESS (the click that follows closes the Shift box and the note editors).
  useEffect(() => {
    const press = e => { if (e.target.closest && e.target.closest('#help-fab')) pressCtx.current = contextArticle() }
    const click = e => { if (e.target.closest && e.target.closest('#help-fab')) openAt() }
    document.addEventListener('pointerdown', press, true)
    document.addEventListener('click', click)
    return () => { document.removeEventListener('pointerdown', press, true); document.removeEventListener('click', click) }
  }, [])

  // "On this page": the article's headings, read after it renders.
  useLayoutEffect(() => {
    if (!open || !mainRef.current) return
    mainRef.current.scrollTop = 0
    setToc([...mainRef.current.querySelectorAll('.hp-art h2')].map((h, i) => ({ i, text: h.textContent })))
  }, [open, cur, q])

  // The search index: every article rendered once, out of sight, for its text.
  const needIndex = open && q.trim() && !index
  useLayoutEffect(() => {
    if (!needIndex || !indexRef.current) return
    const map = {}
    indexRef.current.querySelectorAll('[data-ix]').forEach(el => { map[el.getAttribute('data-ix')] = el.textContent.replace(/\s+/g, ' ') })
    setIndex(map)
  }, [needIndex])

  const results = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return null
    const out = []
    for (const a of visibleArticles) {
      const body = (index && index[a.id]) || (a.outline || []).join(' ')
      const hay = (a.title + ' ' + body).toLowerCase()
      if (!terms.every(t => hay.includes(t))) continue
      const score = terms.reduce((s, t) => s + (a.title.toLowerCase().includes(t) ? 10 : 0) + hay.split(t).length - 1, 0)
      const at = body.toLowerCase().indexOf(terms[0])
      const snip = at < 0 ? '' : (at > 40 ? '…' : '') + body.slice(Math.max(0, at - 40), at + 90).trim() + '…'
      out.push({ a, score, snip })
    }
    return out.sort((x, y) => y.score - x.score).slice(0, 30)
  }, [q, index, visibleArticles])

  const outside = useOutsideCloseGuard(open, close)
  const art = ARTICLE[cur] || ARTICLE.welcome
  const Body = BODIES[art.id]
  const nav = useMemo(() => ({ go }), [])

  if (!open) return null
  return (
    <Modal
      opened
      onClose={close}
      closeOnClickOutside={false}
      withinPortal={false}
      withCloseButton={false}
      centered
      size={1120}
      padding={0}
      radius="lg"
      shadow="xl"
      className="help-dlg"
      aria-label="SPTCal Help"
      overlayProps={{ backgroundOpacity: 0.35, onClick: outside }}
      styles={{ content: { height: 'min(88vh, 900px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
        body: { flex: 1, minHeight: 0, padding: 0, display: 'flex', flexDirection: 'column' } }}
    >
      <HelpNav.Provider value={nav}>
        <div className="hp-top">
          <span className="hp-q" aria-hidden="true">?</span>
          <span className="hp-title">SPTCal Help</span>
          <button type="button" className="hp-x" aria-label="Close Help" onClick={close}>×</button>
        </div>
        <div className="hp-body">
          <nav className="hp-side" aria-label="Help sections">
            <label className="hp-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              {/* Esc clears a typed search first. Mantine's modal closes on Esc in the CAPTURE phase, before this handler runs,
                  unless the target says data-mantine-stop-propagation: so it says so while there is something to clear. */}
              <input type="search" placeholder="Search Help" value={q} data-autofocus
                data-mantine-stop-propagation={q ? 'true' : undefined}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape' && q) { e.stopPropagation(); e.preventDefault(); setQ('') } }} />
            </label>
            <div className="hp-nav">
              {results ? (
                results.length ? results.map(({ a, snip }) => (
                  <button type="button" key={a.id} className="hp-res" onClick={() => go(a.id)}>
                    <b>{a.title}</b><small>{a.groupName}</small>{snip && <span>{snip}</span>}
                  </button>
                )) : <p className="hp-none">{index ? 'No articles match.' : 'Searching…'}</p>
              ) : GROUPS.map(g => {
                const items = g.articles.filter(a => !monthOnly || a.view !== 'waterfall')
                if (!items.length) return null
                return (
                  <div className="hp-g" key={g.id}>
                    <div className="hp-gh">{g.name}</div>
                    {items.map(a => (
                      <button type="button" key={a.id} className={'hp-i' + (a.id === art.id ? ' on' : '')} onClick={() => go(a.id)}
                        aria-current={a.id === art.id ? 'page' : undefined}>{a.title}</button>
                    ))}
                  </div>
                )
              })}
            </div>
            <div className="hp-side-foot">
              <Switch size="xs" label="I only use the Month view" checked={monthOnly}
                onChange={e => { const v = e.currentTarget.checked; setMonthOnly(v); writeStore({ monthOnly: v }) }} />
            </div>
          </nav>
          <main className="hp-main" ref={mainRef}>
            <article className="hp-art" key={art.id}>
              <div className="hp-crumb">{art.groupName}</div>
              <h1>{art.title}</h1>
              <div className="hp-badges"><span className={'hp-vb ' + art.view}>{VIEW_LABEL[art.view]}</span></div>
              {Body ? <Body /> : (
                <div className="hp-todo">
                  <p>This article is being written. It will cover:</p>
                  <ul>{(art.outline || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
                </div>
              )}
            </article>
          </main>
          <aside className="hp-toc" aria-label="On this page">
            {toc.length > 1 && <>
              <h5>On this page</h5>
              {toc.map(t => (
                <button type="button" key={t.i} onClick={() => {
                  const h = mainRef.current && mainRef.current.querySelectorAll('.hp-art h2')[t.i]
                  if (h) mainRef.current.scrollTo({ top: h.offsetTop - 16, behavior: 'smooth' })
                }}>{t.text}</button>
              ))}
            </>}
          </aside>
        </div>
        <div className="hp-foot">
          <button type="button" onClick={() => go('shortcuts')}>Keyboard shortcuts</button>
          <span>·</span>
          <button type="button" onClick={() => go('whatsnew')}>What’s new</button>
          <span>·</span>
          <button type="button" onClick={() => go('glossary')}>Glossary</button>
        </div>
        {needIndex && (
          <div className="hp-index" ref={indexRef} aria-hidden="true">
            {ARTICLES.map(a => { const B = BODIES[a.id]; return <div key={a.id} data-ix={a.id}>{B ? <B /> : null}</div> })}
          </div>
        )}
      </HelpNav.Provider>
    </Modal>
  )
}

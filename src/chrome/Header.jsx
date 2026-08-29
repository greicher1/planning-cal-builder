// The app header: the file menu, the six toolbar actions, and the save-status readout.
//
// Redesigned on Mantine per UI-CONVENTIONS.md, but every id, every aria attribute and every
// data-* hook is verbatim. Those are not implementation details:
//
//   * the ids are how the imperative engine binds its click handlers, after this has rendered;
//   * `data-id` / `data-remove` / `data-action` are what the engine's ONE delegated listener on
//     #file-menu matches with .closest(), so that handler ports across without an edit;
//   * `header.app-header` must stay a direct child of <body> and stay matchable by
//     document.querySelector('header.app-header') -- a ResizeObserver writes --header-h from its
//     measured height, and the frozen `.sheet-scroll{max-height:calc(100vh - var(--header-h) -
//     140px)}` reads it. This component therefore renders INTO that element via a portal and never
//     replaces or wraps it.
import { useState, useLayoutEffect, useCallback } from 'react'
import { Button, Menu, Group, Text, Badge, CloseButton, Box } from '@mantine/core'
import { installChrome } from './bridge.js'
import { IconFolder, IconFilePlus, IconFloppy, IconCopyPlus, IconTable, IconDownload, IconShare } from './icons.jsx'

// The four sizes this toolbar uses, named once. Everything is size="xs" (30px) because the app's
// current control measures 30.0px and the sidebar it shares a scale with already overflows its
// container by 2x -- see theme.js.
const BTN = { size: 'xs', radius: 'md' }

export function Header() {
  // Every piece of state here is PUSHED by the engine through the bridge. React owns none of the
  // decisions -- readState/computeSchedule/render still decide what the chrome should say -- it
  // owns only how that decision is drawn.
  const [save, setSave] = useState({ label: 'Save', busy: false, disabled: false })
  const [saveAs, setSaveAs] = useState({ visible: false, busy: false, label: 'Save As…', disabled: false })
  const [status, setStatus] = useState({ text: '', tone: 'idle', title: '' })
  const [exp, setExp] = useState({ label: 'Export to Excel', primary: false, disabled: true, busy: false })
  const [expWf, setExpWf] = useState({ visible: true, disabled: true })
  const [menu, setMenu] = useState({ visible: false, label: 'Untitled', items: [], open: false })
  // The recents filter. React-local on purpose: the engine pushes the full list through the
  // bridge and never needs to know a filter exists. The input carries NO id -- collectFieldValues
  // sweeps input[id] document-wide, and this box must never enter a saved file or the undo stack.
  const [q, setQ] = useState('')

  const merge = useCallback((set) => (patch) => set((s) => ({ ...s, ...patch })), [])

  // useLayoutEffect, not useEffect: main.jsx wraps the first render in flushSync and then calls
  // initLegacyApp() on the next line. Layout effects run synchronously inside that commit, so the
  // bridge is installed before the engine's first refreshSaveBtn() / render() fires. A passive
  // effect would run too late and those first pushes would be dropped.
  useLayoutEffect(() => {
    installChrome({
      saveBtn: merge(setSave),
      saveAsBtn: merge(setSaveAs),
      saveStatus: merge(setStatus),
      exportBtn: merge(setExp),
      exportWfBtn: merge(setExpWf),
      fileMenu: merge(setMenu),
    })
  }, [merge])

  return (
    <Group className="app-toolbar" gap="sm" wrap="nowrap" align="center" w="100%">
      {/* The brand block. Identity is most of what makes a header read as designed rather than as
          a strip of buttons -- ui.mantine.dev's headers all lead with a mark. Kept deliberately
          narrow: the header's height feeds --header-h (frozen .sheet-scroll reads it, and the
          print-fallback measurement cares), so nothing here may make the toolbar wrap. The name
          hides below 1240px (CSS) for the same reason. */}
      <div className="app-brand">
        <span className="app-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
               strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
            <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
            <path d="M2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" />
          </svg>
        </span>
        <span className="app-brand-name">SPT Planning Calendar</span>
      </div>
      <div className="app-toolbar-div" aria-hidden="true" />

      {/* The file menu.
          withinPortal={false} is a CORRECTNESS requirement, not a preference: Popover's
          defaultProps carry withinPortal:true, and portalling moves the dropdown out from under
          #file-menu-wrap, which is what the engine's click-away test (`!e.target.closest(
          '#file-menu-wrap')`) matches on.
          keepMounted, because the engine binds ONE delegated listener to #file-menu at
          evaluation time -- an unmounted dropdown means getElementById returns null and the whole
          menu goes dead.
          closeOnItemClick={false}, because removing a recent must NOT close the menu. Today that
          is a side effect of stopPropagation; here the engine's own handler decides, calling
          closeFileMenu() on the navigating branches and returning early on the remove branch. So
          the existing control flow keeps deciding, exactly as it reads. */}
      <Menu
          opened={menu.open}
          onChange={(open) => { setMenu((s) => ({ ...s, open })); if (!open) setQ('') }}
          withinPortal={false}
          keepMounted
          closeOnItemClick={false}
          position="bottom-start"
          offset={4}
          width={280}
        >
          <Box id="file-menu-wrap" className="file-menu-wrap"
                 /* ⚠️ ALWAYS RENDERED, visibility carried by display -- never by a
                    conditional. The engine attaches ONE delegated click listener to
                    #file-menu at evaluation time; if React had not rendered that node
                    yet, getElementById would return null, the listener would never
                    attach, and the menu would stay dead even after renderRecents()
                    later made it visible. The original markup has the same shape for
                    the same reason: it toggles #file-menu-wrap's style.display. */
                 style={{ display: menu.visible ? undefined : 'none' }}>
            <Menu.Target>
              <Button
                {...BTN}
                id="file-menu-btn"
                className="file-menu-btn"
                variant="default"
                aria-haspopup="true"
                aria-expanded={menu.open ? 'true' : 'false'}
                leftSection={<IconFolder className="btn-ic" />}
                rightSection={<span className="caret" aria-hidden="true">▾</span>}
                styles={{ root: { maxWidth: 220 }, label: { overflow: 'hidden', textOverflow: 'ellipsis' } }}
              >
                <span id="file-menu-label">{menu.label}</span>
              </Button>
            </Menu.Target>

            <Menu.Dropdown id="file-menu" role="menu" className="file-menu">
              {/* Open… is PINNED at the top (owner's ask, 29 Aug 2026), with the search box under
                  it; only the recents list below them scrolls (.fm-list). The engine's ONE
                  delegated handler still decides everything -- Open… keeps data-action="open",
                  every recent keeps data-id/data-remove, and a click on the search box matches
                  neither branch and correctly does nothing. */}
              <Menu.Item className="file-menu-item" data-action="open" role="menuitem">
                <span className="fm-name">Open…</span>
              </Menu.Item>
              <div className="fm-search-row">
                {/* Plain <input>, deliberately not a Mantine TextInput: Mantine inputs mint a
                    random id when none is passed (UI-CONVENTIONS §8.3), and any input[id] outside
                    .tools-menu is swept into every saved calendar. */}
                <input
                  className="fm-search"
                  type="text"
                  placeholder="Search saved files…"
                  aria-label="Search saved files"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Menu.Divider className="file-menu-sep" />
              <div className="fm-list">
                {menu.items.length === 0 ? (
                  <Text className="file-menu-empty" size="xs" c="dimmed" px="md" py="md">
                    No saved files yet
                  </Text>
                ) : menu.items.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).length === 0 ? (
                  <Text className="file-menu-empty" size="xs" c="dimmed" px="md" py="md">
                    No files match “{q.trim()}”
                  </Text>
                ) : (
                  menu.items
                    .filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase()))
                    .map((f) => (
                      <Menu.Item
                        key={f.id}
                        className={'file-menu-item' + (f.active ? ' active' : '')}
                        data-id={f.id}
                        role="menuitem"
                        title={f.name}
                        /* Native title=, deliberately kept: it reveals a file name the 220px button
                           and the 280px dropdown both truncate. UI-CONVENTIONS §6. */
                        rightSection={
                          /* As rightSection it is a real element OUTSIDE the item's label, so the
                             engine's `.closest('[data-remove]')` branch fires before its
                             `.closest('.file-menu-item')` branch -- the order that keeps the menu
                             open while pruning several entries. */
                          <CloseButton
                            component="span"
                            size="xs"
                            className="fm-remove"
                            data-remove={f.id}
                            title="Remove from list"
                            aria-label="Remove"
                          />
                        }
                      >
                        <span className="fm-name">{f.name}</span>
                      </Menu.Item>
                    ))
                )}
              </div>
            </Menu.Dropdown>
          </Box>
      </Menu>

      <Button {...BTN} id="new-file-btn" variant="default" leftSection={<IconFilePlus className="btn-ic" />}>New</Button>

      <Button
        {...BTN}
        id="save-file-btn"
        variant="default"
        leftSection={<IconFloppy className="btn-ic" />}
        loading={save.busy}
        disabled={save.disabled}
      >
        {save.label}
      </Button>

      {/* ⚠️ ALWAYS RENDERED, visibility carried by display — same rule as #file-menu-wrap above.
          The engine captures `const saveAsBtn = getElementById('save-as-btn')` at evaluation time
          and binds its click listener through that const. Rendered conditionally, the capture was
          null, the listener never bound, and the button appeared later (visible:true push) fully
          dead. Found 29 Aug 2026 while investigating the sidebar-rows stage. */}
      <Button
        {...BTN}
        id="save-as-btn"
        variant="default"
        leftSection={<IconCopyPlus className="btn-ic" />}
        loading={saveAs.busy}
        disabled={saveAs.disabled}
        style={{ display: saveAs.visible ? undefined : 'none' }}
      >
        {saveAs.label}
      </Button>

      {/* "Export shareable copy" split out of the file menu (owner's ask, 29 Aug 2026). The
          engine handles the click by document-level delegation on this id, so the button may be
          conditionally styled but must always be rendered. */}
      <Button
        {...BTN}
        id="share-copy-btn"
        variant="default"
        leftSection={<IconShare className="btn-ic" />}
        title="A standalone HTML copy of the app with this calendar in it — for sending to someone who doesn’t have the tool"
      >
        Share copy
      </Button>

      {/* ONE button, with the viewMode dispatch inside the engine's handler. It is the SOLE entry
          point to exportMonthPdf(); splitting it into two semantic buttons would decouple the month
          PDF from every entry point unless the dispatch were reproduced. */}
      {/* The status readout. "Autosave failed" LEAVES the status slot and becomes a Badge: the one
          state that means something is wrong should be the one state with a shape. Everything else
          stays quiet text. UI-CONVENTIONS §4. */}
      {status.tone === 'failed' ? (
        <Badge
          id="save-status"
          className="save-status"
          role="status"
          aria-live="polite"
          color="danger"
          variant="light"
          size="sm"
          radius="sm"
          title={status.title}
          styles={{ root: { textTransform: 'none', fontWeight: 500 } }}
        >
          {status.text}
        </Badge>
      ) : (
        <Text
          id="save-status"
          className="save-status"
          role="status"
          aria-live="polite"
          size="xs"
          title={status.title}
          /* var(--text-faint), not Mantine's c="dimmed". Measured: dimmed (gray-6 #868e96) on this
             app's ground is 3.07:1, where --text-faint is 4.98:1 -- and --text-faint carries a
             comment recording that it was darkened from #9C988E specifically to reach AA. */
          c={status.tone === 'dirty' ? 'var(--text)' : 'var(--text-faint)'}
          fw={status.tone === 'dirty' ? 500 : 400}
          style={{ minWidth: 78, whiteSpace: 'nowrap' }}
        >
          {status.text}
        </Text>
      )}

      {/* The export group sits right-aligned, HeaderMegaMenu-style: the principal (filled) action
          lives at the row's end. The icon follows the engine's `primary` flag because in Month
          view this same button IS the PDF export -- a static icon would lie half the time. */}
      <Button
        {...BTN}
        id="export-btn"
        ml="auto"
        variant={exp.primary ? 'filled' : 'default'}
        leftSection={exp.primary ? <IconDownload className="btn-ic" /> : <IconTable className="btn-ic" />}
        loading={exp.busy}
        disabled={exp.disabled}
      >
        {exp.label}
      </Button>

      {/* ⚠️ ALWAYS RENDERED, visibility carried by display — the engine binds this button's click
          directly by id at evaluation time. It starts visible, so the listener DID bind — but a
          conditional render meant one Month↔Waterfall round-trip unmounted the node and remounted
          a NEW one, silently orphaning the listener: the export button came back looking fine and
          doing nothing. Same fix as #save-as-btn above. */}
      <Button
        {...BTN}
        id="export-wf-pdf-btn"
        variant="filled"
        leftSection={<IconDownload className="btn-ic" />}
        disabled={expWf.disabled}
        style={{ display: expWf.visible ? undefined : 'none' }}
      >
        Export PDF
      </Button>

      {/* Reset sits past a divider at the very end -- the destructive action gets distance from
          the export pair it used to sit beside. (The old ml="auto" right-alignment now lives on
          the export group.) */}
      <div className="app-toolbar-div" aria-hidden="true" />
      <Button {...BTN} id="reset-btn" variant="default" c="danger.9" fw={500}>
        Reset All
      </Button>
    </Group>
  )
}

// The two notice strips stay STATIC MARKUP for this stage, deliberately.
//
// Porting them to React would fix the live bug in HANDOFF.md §2h for free -- buildSavedHtml()
// strips .note-pop / .mv-note-pop / .phase-color-pop from its clone but not #legacy-notice or
// #update-notice, and `el.hidden = false` REMOVES the attribute outerHTML would have serialised, so
// a shareable copy exported while a strip was showing bakes in a permanent banner naming someone
// else's file. A strip that renders nothing when dismissed cannot be serialised at all.
//
// But that is a change to an export's output, and CLAUDE.md requires the owner's sign-off for it
// rather than letting it arrive as a side effect of a UI pass. Their CSS is retokenised in place
// (the §9.2 pattern: most of the visual win, no behaviour change), and the port waits for a ruling.

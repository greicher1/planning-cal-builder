// Mounts the real Mantine Compare window into the static mockup. The mockup's own script calls
// window.SPTCompare.open(props) / .close(), the way the engine calls installChrome hooks in the app.
// The CSS imports are main.jsx's, in main.jsx's order (it is derived, never alphabetical), plus the
// two this window adds: Chip and Table.
import '@mantine/core/styles/default-css-variables.layer.css'
import '@mantine/core/styles/baseline.layer.css'
import '@mantine/core/styles/global.layer.css'
import '@mantine/core/styles/ScrollArea.layer.css'
import '@mantine/core/styles/UnstyledButton.layer.css'
import '@mantine/core/styles/VisuallyHidden.layer.css'
import '@mantine/core/styles/Paper.layer.css'
import '@mantine/core/styles/Overlay.layer.css'
import '@mantine/core/styles/Popover.layer.css'
import '@mantine/core/styles/Loader.layer.css'
import '@mantine/core/styles/ActionIcon.layer.css'
import '@mantine/core/styles/CloseButton.layer.css'
import '@mantine/core/styles/Group.layer.css'
import '@mantine/core/styles/ModalBase.layer.css'
import '@mantine/core/styles/Input.layer.css'
import '@mantine/core/styles/Text.layer.css'
import '@mantine/core/styles/Badge.layer.css'
import '@mantine/core/styles/Button.layer.css'
import '@mantine/core/styles/Modal.layer.css'
import '@mantine/core/styles/Stack.layer.css'
import '@mantine/core/styles/Chip.layer.css'
import '@mantine/core/styles/Table.layer.css'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { theme } from '../../src/theme.js'
import { CompareDialog } from './CompareDialog.jsx'

let root = null
let props = null
function render() {
  root.render(
    <MantineProvider theme={theme} forceColorScheme="light" withCssVariables>
      <CompareDialog {...props} />
    </MantineProvider>
  )
}
window.SPTCompare = {
  open(p) {
    if (!root) { const el = document.createElement('div'); el.id = 'sc-compare-root'; document.body.appendChild(el); root = createRoot(el) }
    props = { ...p, opened: true }
    render()
  },
  close() { if (props && props.opened) { props = { ...props, opened: false }; render() } },
  isOpen() { return !!(props && props.opened) },
}

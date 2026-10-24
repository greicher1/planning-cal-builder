// Mounts the Phases-card mockups (PhaseCards.jsx) into mockups/phase-cards.html. Not part of the app's build.
// The full layered Mantine stylesheet rather than main.jsx's per-component list: a mockup has no size budget,
// and the full file carries Mantine's own order, so the import-order trap (UI-CONVENTIONS §9.6) cannot bite.
import '@mantine/core/styles.layer.css'
import '../../src/styles/inter.css'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
import { theme } from '../../src/theme.js'
import { PhaseCardMockups } from './PhaseCards.jsx'

createRoot(document.getElementById('root')).render(
  <MantineProvider theme={theme} forceColorScheme="light" withCssVariables>
    <PhaseCardMockups />
  </MantineProvider>
)

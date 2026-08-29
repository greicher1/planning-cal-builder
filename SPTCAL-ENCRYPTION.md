# Encrypted `.sptcal` — design

Status: **design only, not implemented.** No change has been made to `index.html`.

---

## 0. The assumption, and what it actually requires

The owner's stated assumption is: **the app's HTML is never accessed — only `.sptcal` files are.**
Under that assumption an app key embedded in `index.html` is a real secret, and the app-key mode
below gives real confidentiality rather than obfuscation. The design is built on that assumption.

**But the assumption is not true today, in four independent ways.** Each is fixable; none is
fixable by anything inside the encryption scheme, so they are listed here as preconditions rather
than buried as caveats.

1. **The GitHub repo is public.** `github.com/greicher1/planning-cal-builder` → `isPrivate: false`.
   Anyone can read `index.html`, including every historical version of it, forever, in the git
   history. A key committed once is public from that commit on, and rotating it later does not
   un-publish the files the old key wrote.
2. **The app is on GitHub Pages.** <https://greicher1.github.io/planning-cal-builder/> serves the
   file to anyone; View Source is the whole attack.
3. **`releases/v1.0.0.html` is a byte-identical copy of the app**, committed to that public repo by
   the versioning rule in `CLAUDE.md`. Every future release copy would carry the key too.
4. **The `.html` "Export shareable copy" is designed to be emailed around.** That format exists
   precisely to hand someone a working copy of the app — i.e. to give away the HTML.

And one that is not fixable at all: **this is a client-side app, so every user necessarily
receives the HTML** in order to run it. The assumption can hold against people who do not have the
app; it can never hold against someone who does.

### What that leaves — pick one, deliberately

| | What it protects against | What it costs |
|---|---|---|
| **A. Make the assumption true.** Repo private, drop public Pages, distribute `index.html` directly to the intended users, strip the key from the `.html` export (or retire that export). | Anyone without the app: cloud sync, email attachments, a lost laptop's disk, a shared drive, anyone the file is forwarded to by mistake. **This is a genuinely useful threat model and probably the real one.** | Loses the public URL and the frictionless "just email them the file" distribution. |
| **B. Leave the app public.** | Nothing, against a determined reader. Still gives **tamper-evidence** and **write-authenticity** — no other tool can forge a file the app accepts — and stops casual reading in a text editor. | Honest but modest. Must not be described to users as "encrypted and private". |
| **C. Passphrase mode.** | Everyone, including people holding the app. The only option that survives a public `index.html`. | The user must type and remember a passphrase; a forgotten one is an unrecoverable plan. |

**A and C compose** — the container below carries both, and B is simply A with the precondition
left unmet. Nothing further down depends on which is chosen; the choice only determines what may
truthfully be said in the UI.

**Corollary — the `.html` share export must not be encrypted**, under any option. That file *is* a
copy of the app, so the key would sit a few kilobytes from the ciphertext. It buys nothing and
costs the format its only job: being double-clickable. Leave it plaintext and label it "shareable
copy — not encrypted". Under option A it is the thing that must change or go.

---

## 1. Container format

One container carries **both** key modes — app key (option A/B) and passphrase (option C) — so
there is exactly one read path and the choice is a header field rather than a fork in the code.

One line of ASCII, so the file still writes through the existing text path and survives being
pasted into an email:

```
SPTCAL1.<keytok>.<b64u salt>.<b64u iv>.<b64u ciphertext‖tag>
```

* `SPTCAL1` — container version. Bump only for a container change; the snapshot's own
  `SNAPSHOT_VERSION` stays inside the plaintext and is untouched by this.
* `<keytok>` — how the key was derived:
  * `a<n>` — app key, keyring id `n` (`a1`, `a2`, …)
  * `p<iters>` — PBKDF2-SHA256 from a user passphrase at that iteration count (`p600000`)
* `salt` — 16 random bytes, per file, per save.
* `iv` — 12 random bytes, **fresh on every write**. Never reuse an IV under one key; GCM fails
  catastrophically if you do, and this app rewrites the same file on every autosave.
* Payload — AES-256-GCM ciphertext with its 128-bit tag appended.
* `b64u` = base64url, unpadded.

**AAD (additional authenticated data) = the entire header prefix**, i.e. everything up to and
including the final `.` before the ciphertext. This binds mode, key id, iteration count, salt and
IV into the tag, so none of them can be swapped or downgraded without the tag failing.

Extension stays `.sptcal` for both plaintext and encrypted files. The pickers, the recents list
and the handle store need no change; the format is sniffed from content, exactly as
`parseCalendarText()` already sniffs `{` vs. `<script id="saved-state">`.

---

## 2. Key derivation

### App-key mode (`a<n>`) — the default

```
key = HKDF-SHA256(
        ikm  = APP_KEYS[n],          // 32 constant bytes embedded in index.html
        salt = <file salt>,
        info = "sptcal/v1/appkey",
      ) -> AES-256-GCM
```

HKDF (not raw use of the constant) so every file gets a distinct key even though the secret is
fixed, and so `info` can namespace future uses of the same secret.

**Keyring, not a key.** `APP_KEYS` is a map `{1: bytes, 2: bytes}` and a `CURRENT_KEY_ID`. Decrypt
always uses the id named in the file; encrypt always uses `CURRENT_KEY_ID`. **Never delete an
entry** — an old id removed is every file it wrote destroyed. Rotation is then a one-line change
and existing files keep opening, which is the standing rule.

### Passphrase mode (`p<iters>`) — opt-in

```
key = PBKDF2-SHA256(passphrase, salt, iters=600000) -> AES-256-GCM
```

The iteration count lives in the header so it can be raised later without breaking old files.
WebCrypto has no Argon2; PBKDF2 at 600k is the honest ceiling here.

**The passphrase is never stored.** The derived `CryptoKey` is created non-extractable and cached
in a module-scope variable for the session only, because Save writes back in place with no dialog
and autosave must not prompt. On reload — or after `newFile()` — the cache is gone and the first
write re-prompts once.

---

## 3. Where it lands in the code

The seam is unusually clean; the app already funnels both directions through one function each.

**Write** — `buildSavedData()` ([index.html:7300](index.html:7300)) currently returns
`JSON.stringify(captureSnapshot(), null, 1)`. It gains an async wrapper:

```js
async function encodeCalendarFile(){
  const json = buildSavedData();          // unchanged, still the one definition of "state"
  if(!cryptoAvailable()) return json;     // see §5 — plaintext fallback, never a failed save
  return sealCalendar(json);              // returns the SPTCAL1 line
}
```

Three call sites: [7527](index.html:7527), [8149](index.html:8149), [8213](index.html:8213).
Each becomes `await encodeCalendarFile()` — and each already branches on `handleIsLegacyHtml()`,
so the `.html` path is untouched by construction.

**Read** — `parseCalendarText()` ([index.html:7352](index.html:7352)) becomes `async` and grows a
*third* branch, ahead of the existing two.

> ### ⚠️ Corrected 29 Aug 2026 — this sketch was written against the OLD signature
> `parseCalendarText()` shipped in v1.1.0 returning **`{format, snapshot}`**, not a bare snapshot.
> The format is part of the contract because opening a legacy `.html` is the one moment the app
> can offer to upgrade it. **The encrypted branch must return the same shape** — an encrypted
> file is still the data format, so it is `format:'data'`.

```js
async function parseCalendarText(text){
  const t = String(text||'').replace(/^\uFEFF/, '').trimStart();
  if(t.startsWith('SPTCAL1.')){                        // NEW
    const json = await openSealed(t);                  // throws on any decrypt failure — see below
    return { format:'data', snapshot: JSON.parse(json) };
  }
  if(t.startsWith('{'))  return /* existing plaintext branch, unchanged */;
  /* existing legacy .html branch, unchanged */
}
```

> ### ⚠️ `openSealed()` must THROW, never return `null`
> `parseCalendarText()` signals "this isn't a calendar" by returning `null`, and the caller turns
> that into *"That file doesn't contain saved calendar data."* A decrypt failure returning `null`
> would inherit that message — telling someone holding a perfectly good calendar that it is the
> wrong file, and sending them to look for one that does not exist. That is the exact failure §4
> exists to prevent, so make it structural: throw a typed error and let the caller map it to one
> of §4's four messages.

Exactly one functional caller: [index.html:8302](index.html:8302) inside `openRecentFile()`,
already `async` — it takes an `await`. Every pre-encryption `.sptcal` and every pre-v1.1.0 `.html`
keeps opening through code that was not modified, which is the cheapest possible way to honour
"every saved calendar must keep opening, forever."

**Not encrypted, deliberately:** the IndexedDB crash backup (`BACKUP_KEY`) and the undo stack.
Both are same-origin browser storage the user's own browser already fences; encrypting them adds
key-management failure modes to the crash-recovery path, which is the last place you want them.

---

## 4. Failure modes and what the user is told

The current Open path has one error string. Encryption needs four distinct ones, because the
remedies are completely different:

| Condition | Detection | Message |
|---|---|---|
| Not a calendar at all | no branch matched | "That file doesn't contain saved calendar data." (existing) |
| Encrypted, wrong passphrase | GCM tag fails, mode `p` | "That passphrase didn't open this calendar." + retry |
| Encrypted, unknown key id | `n` not in `APP_KEYS` | "This calendar was saved by a newer version of the app." |
| Encrypted, tag fails in mode `a` | GCM tag fails | "This calendar file is damaged or has been modified." |

A decrypt failure must **never** fall through to "doesn't contain calendar data" — that reads as
"wrong file", and the user goes looking for a file that isn't the problem.

---

## 5. The one thing that could break Save — verify first

`crypto.subtle` requires a **secure context**. The documented way to run this app is
`open index.html`, i.e. a `file://` origin. Chrome and Firefox currently treat `file://` as a
secure context, but this is exactly the kind of thing that is true until it isn't.

**Gate the whole feature on a runtime check, not an assumption:**

```js
const CRYPTO_OK = !!(window.isSecureContext && window.crypto && window.crypto.subtle);
```

If it's false: save **plaintext**, and surface it once ("This browser can't encrypt calendar
files; saved unencrypted."). A calendar that saves in the clear is a disclosed limitation. A Save
button that throws is a lost production plan. Verify `isSecureContext` on `file://` in Chrome and
Edge before writing any of this — it is the go/no-go for the default mode.

---

## 6. Acceptance gate

Fixtures under `tests/fixtures/`, all four opened in one pass:

1. `plain-v1.sptcal` — pre-encryption plaintext JSON → opens
2. `legacy-v1.0.0.html` — real pre-v1.1.0 share file → opens
3. `sealed-a1.sptcal` — app-key mode → opens
4. `sealed-p.sptcal` — passphrase mode → opens with the passphrase, gives the *passphrase* error without it

Plus: (5) flip one byte of a sealed file's ciphertext → refuses with the *damaged* message, never
a partial restore; (6) save the same calendar twice → the two files differ in salt **and** IV;
(7) round-trip a 10-episode calendar and diff the restored snapshot against the captured one —
byte-identical.

Point (7) matters most: encryption must be a transparent envelope. If the snapshot changes shape
to accommodate it, the change is wrong.

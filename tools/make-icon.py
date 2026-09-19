#!/usr/bin/env python3
"""Rasterise art/app-icon.svg into every place the app icon lives.

WHY THIS EXISTS. Before 18 Sep 2026 the icon bytes were a base64 blob in
src/chrome/appIcon.js whose header said "Rasterised at 192px from the source SVG" -- and
that SVG was NOT IN THE REPO. So the raster could not be reproduced, re-cut at another
size, or diffed against its own source. This closes that: the SVG is the source of truth
and every PNG in the app is derived from it by running this script.

    python3 tools/make-icon.py            # patch the sources in place
    python3 tools/make-icon.py --check    # report what WOULD change, write nothing

THREE PLACES CONSUME THE ICON, and they are deliberately not one place:

  1. src/chrome/appIcon.js -- APP_ICON, a 192px PNG data URI. main.jsx writes it onto the
     head's placeholder <link>s at startup (the skeleton ships href="data:," precisely so
     no second copy of the bytes exists in the static HTML), and Header.jsx renders it as
     the brand mark. Owner ruling, round 5: the favicon and the header mark must be
     instances of ONE upload, never two independent copies.
  2+3. The PWA manifest's icons, inside the data-URI manifest in src/index.html -- 192 and
     512. These are the INSTALLED-APP identity and live in the manifest because that is
     where a manifest's icons have to live; there is no way to point them at a JS module.

  (appIcon.js's header used to say the manifest carried "192/512/512-maskable" -- THREE
  icons, one of them maskable. It carries TWO and neither declares a purpose. Corrected
  18 Sep 2026; a maskable icon needs its own safe-zone artwork, which this one is not.)

CHROME IS THE RASTERISER, because it is the only one on this machine and it is the same
engine the app itself renders in -- so what the icon looks like here is what it looks like
in the tab.

  /!\ macOS Chrome CLAMPS --window-size below ~400px, and the screenshot then becomes a
  CROP of a larger render rather than a scaled one. A 192px icon rendered directly once
  shipped as a fragment of itself. So: render at RENDER_PX (well above the clamp) and
  downscale with Pillow. Never render at the target size.

  /!\ The check that catches it is two pixels: the centre must be opaque (alpha 255) and a
  corner must be transparent (alpha 0). A crop fails the corner; a solid background fails
  it too. Both are asserted below and the script refuses to write on failure.
"""
import argparse, base64, io, json, os, re, subprocess, sys, tempfile, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SVG = os.path.join(ROOT, 'art', 'app-icon.svg')
APPICON = os.path.join(ROOT, 'src', 'chrome', 'appIcon.js')
INDEX = os.path.join(ROOT, 'src', 'index.html')
CHROME = os.environ.get('CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')

RENDER_PX = 1024          # comfortably above the ~400px macOS clamp
SIZES = {'app': 192, 'manifest': [192, 512]}


def render(svg_text, px, workdir):
    """Render the SVG at px x px on a TRANSPARENT background, return PNG bytes."""
    # The SVG is inlined rather than <img src>'d so there is no second fetch to fail, and
    # sized explicitly so it fills the viewport exactly -- its own viewBox is 0 0 800 800.
    html = ('<!doctype html><meta charset="utf-8">'
            '<style>html,body{margin:0;padding:0;background:transparent}'
            'svg{display:block;width:%dpx;height:%dpx}</style>%s' % (px, px, svg_text))
    page = os.path.join(workdir, 'icon.html')
    shot = os.path.join(workdir, 'icon.png')
    io.open(page, 'w', encoding='utf-8').write(html)
    # /!\ CHROME WRITES THE FILE AND THEN DOES NOT EXIT. Documented in PROJECT-CONTEXT.md section
    # 11 for --dump-dom and it is just as true of --screenshot: the PNG lands on disk, the process
    # stays alive, and a subprocess.run() waits out its whole timeout and then reports failure --
    # which reads exactly like "the render failed" when in fact the render succeeded. So: launch in
    # the BACKGROUND, poll for the file to appear AND stop growing, then kill it.
    proc = subprocess.Popen([
        CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
        '--force-device-scale-factor=1',
        '--default-background-color=00000000',      # transparent, not white
        '--hide-scrollbars',
        '--user-data-dir=' + os.path.join(workdir, 'profile'),
        '--window-size=%d,%d' % (px, px),
        '--screenshot=' + shot, 'file://' + page,
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        deadline, stable, last = time.time() + 90, 0, -1
        while time.time() < deadline:
            time.sleep(0.25)
            size = os.path.getsize(shot) if os.path.exists(shot) else -1
            # Two identical non-zero readings in a row means the write has finished. Without the
            # stability check a large PNG can be read back half-written.
            stable = stable + 1 if (size > 0 and size == last) else 0
            last = size
            if stable >= 2:
                break
        else:
            raise SystemExit('Chrome produced no screenshot within 90s (looked for %s)' % shot)
    finally:
        proc.kill()
        proc.wait(timeout=10)
    return io.open(shot, 'rb').read()


def downscale(png_bytes, target):
    from PIL import Image
    im = Image.open(io.BytesIO(png_bytes)).convert('RGBA')
    if im.size != (target, target):
        im = im.resize((target, target), Image.LANCZOS)
    out = io.BytesIO()
    im.save(out, format='PNG', optimize=True)
    return im, out.getvalue()


def assert_sane(im, label):
    """The two-pixel check from the module docstring. Refuse to ship a crop."""
    w, h = im.size
    centre = im.getpixel((w // 2, h // 2))
    corner = im.getpixel((0, 0))
    if centre[3] != 255:
        sys.exit('REFUSING: %s centre alpha is %d, expected 255 (render looks empty)'
                 % (label, centre[3]))
    if corner[3] != 0:
        sys.exit('REFUSING: %s corner alpha is %d, expected 0 -- the screenshot is a CROP of a '
                 'larger render, or the background is not transparent. See this file\'s header.'
                 % (label, corner[3]))
    return 'centre a=%d rgb=%s / corner a=0' % (centre[3], centre[:3])


def data_uri(png):
    return 'data:image/png;base64,' + base64.b64encode(png).decode('ascii')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true', help='report, write nothing')
    # theme_color is an AESTHETIC choice, not something derivable from the artwork -- a spectrum
    # gradient has no single "the" colour. So it is a flag, never a silent write: running this
    # script without it leaves whatever the manifest already says.
    ap.add_argument('--theme-color', metavar='#RRGGBB',
                    help="set the manifest's theme_color (owner's call; omit to leave it alone)")
    args = ap.parse_args()

    if not os.path.exists(CHROME):
        sys.exit('no Chrome at: %s (set CHROME=...)' % CHROME)
    svg_text = io.open(SVG, encoding='utf-8').read()

    with tempfile.TemporaryDirectory() as wd:
        big = render(svg_text, RENDER_PX, wd)
        wanted = sorted({SIZES['app']} | set(SIZES['manifest']))
        pngs = {}
        for px in wanted:
            im, data = downscale(big, px)
            print('  %4dpx  %6d bytes  %s' % (px, len(data), assert_sane(im, '%dpx' % px)))
            pngs[px] = data

    app_uri = data_uri(pngs[SIZES['app']])

    # --- src/chrome/appIcon.js : the single APP_ICON constant -------------------------
    js = io.open(APPICON, encoding='utf-8').read()
    m = re.search(r"(export const APP_ICON\s*=\s*\n?\s*')([^']*)(')", js)
    if not m:
        sys.exit('could not find APP_ICON in %s' % APPICON)
    js_new = js[:m.start(2)] + app_uri + js[m.end(2):]
    js_changed = js_new != js

    # --- src/index.html : the manifest's icons ----------------------------------------
    html = io.open(INDEX, encoding='utf-8').read()
    mm = re.search(r'(href="data:application/manifest\+json,)([^"]+)(")', html)
    if not mm:
        sys.exit('could not find the manifest data URI in %s' % INDEX)
    man = json.loads(urllib.parse.unquote(mm.group(2)))
    by_size = {i['sizes']: i for i in man['icons']}
    for px in SIZES['manifest']:
        key = '%dx%d' % (px, px)
        if key not in by_size:
            sys.exit('manifest has no %s icon; expected %s' % (key, sorted(by_size)))
        by_size[key]['src'] = data_uri(pngs[px])
    theme_was = man.get('theme_color')
    if args.theme_color:
        if not re.fullmatch(r'#[0-9A-Fa-f]{6}', args.theme_color):
            sys.exit('--theme-color must be #RRGGBB, got %r' % args.theme_color)
        man['theme_color'] = args.theme_color
    # Re-encode exactly as it was authored: compact separators, then percent-encode the
    # whole thing. quote()'s default safe set would leave '/' raw, which is fine in a data
    # URI, but the file was written with everything escaped -- keep it byte-comparable.
    man_json = json.dumps(man, separators=(',', ':'))
    html_new = html[:mm.start(2)] + urllib.parse.quote(man_json, safe='') + html[mm.end(2):]
    html_changed = html_new != html

    print('\n  appIcon.js     %s  (APP_ICON %d -> %d chars)'
          % ('CHANGED' if js_changed else 'unchanged', len(m.group(2)), len(app_uri)))
    print('  index.html     %s  (manifest %d -> %d chars)'
          % ('CHANGED' if html_changed else 'unchanged', len(mm.group(2)), len(html_new[mm.start(2):mm.start(2)+len(urllib.parse.quote(man_json, safe=''))])))
    if args.theme_color and args.theme_color != theme_was:
        print('  theme_color    CHANGED   %s -> %s' % (theme_was, man['theme_color']))
    else:
        print('  theme_color    unchanged  %s  (an owner choice; pass --theme-color to set it)'
              % man.get('theme_color'))

    if args.check:
        print('\n--check: nothing written.')
        return
    if js_changed:
        io.open(APPICON, 'w', encoding='utf-8').write(js_new)
    if html_changed:
        io.open(INDEX, 'w', encoding='utf-8').write(html_new)
    print('\nWritten. Now: npm run build && npm run check')


if __name__ == '__main__':
    main()

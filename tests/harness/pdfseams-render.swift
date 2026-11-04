// pdfseams-render.swift -- render page 1 of a PDF through CoreGraphics (Quartz, macOS Preview's renderer), anti-aliased,
// onto white, and write it as "W H\n" followed by W*H RGBA bytes, top row first. pdfseams.py reads it.
//
//   pdfseams-render <file.pdf> <scale> <out.raw>      scale 1 = 1 px per pt (100% zoom on a 1x screen); 2 = Retina
//
// ⛔ Quartz, not poppler: poppler forces hairlines and seams to whole pixels, so it cannot show the hairline this leg
// exists to catch (HANDOFF, the month-grid lines entry and "A HAIRLINE BETWEEN ROWS IN THE WATERFALL PDF").
// Compiled by gate.sh into .pdfseams-render beside this file, and recompiled only when this source is newer.
import Foundation
import CoreGraphics

let a = CommandLine.arguments
guard a.count == 4, let s = Double(a[2]),
      let doc = CGPDFDocument(URL(fileURLWithPath: a[1]) as CFURL), let page = doc.page(at: 1) else {
  FileHandle.standardError.write("usage: pdfseams-render <file.pdf> <scale> <out.raw>\n".data(using: .utf8)!)
  exit(2)
}
let box = page.getBoxRect(.mediaBox)
let W = Int((box.width * CGFloat(s)).rounded()), H = Int((box.height * CGFloat(s)).rounded())
guard let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4,
                          space: CGColorSpace(name: CGColorSpace.sRGB)!,
                          bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(3) }
ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
ctx.fill(CGRect(x: 0, y: 0, width: W, height: H))
ctx.setShouldAntialias(true)
ctx.setAllowsAntialiasing(true)
ctx.scaleBy(x: CGFloat(s), y: CGFloat(s))
ctx.drawPDFPage(page)
var out = "\(W) \(H)\n".data(using: .ascii)!
out.append(Data(bytes: ctx.data!, count: W * H * 4))
do { try out.write(to: URL(fileURLWithPath: a[3])) } catch { exit(4) }

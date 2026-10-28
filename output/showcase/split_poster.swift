import Foundation
import CoreGraphics

let folder = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let input = folder.appendingPathComponent("jelly-showcase-a2.pdf")
guard let document = CGPDFDocument(input as CFURL), let page = document.page(at: 1) else {
    fatalError("Could not open the A2 poster")
}
let source = page.getBoxRect(.mediaBox)
var sheet = CGRect(x: 0, y: 0, width: source.width, height: source.height / 2)
func save(_ filename: String, halves: [Bool]) {
    let output = folder.appendingPathComponent(filename)
    guard let context = CGContext(output as CFURL, mediaBox: &sheet, nil) else {
        fatalError("Could not create \(filename)")
    }
    for top in halves {
        context.beginPDFPage(nil)
        context.saveGState()
        context.clip(to: sheet)
        context.translateBy(x: -source.minX, y: -source.minY - (top ? source.height / 2 : 0))
        context.drawPDFPage(page)
        context.restoreGState()
        context.endPDFPage()
    }
    context.closePDF()
    print("Saved \(filename)")
}
save("jelly-showcase-two-a3.pdf", halves: [true, false])
save("jelly-showcase-a3-top.pdf", halves: [true])
save("jelly-showcase-a3-bottom.pdf", halves: [false])
print("Each sheet: \(sheet.width * 25.4 / 72) × \(sheet.height * 25.4 / 72) mm")

// Subject cutout for `shorts cutout`: Apple Vision foreground-instance mask
// (any subject, not only people) applied to the image, written as a PNG with
// alpha at the image's own size, so it can sit exactly over the original.
// usage: cutout <image-in> <png-out>      prints the share of the frame kept
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write("usage: cutout <image-in> <png-out>\n".data(using: .utf8)!)
  exit(2)
}
guard let input = CIImage(contentsOf: URL(fileURLWithPath: args[1]), options: [.applyOrientationProperty: true]) else {
  FileHandle.standardError.write("cannot read \(args[1])\n".data(using: .utf8)!)
  exit(1)
}
let handler = VNImageRequestHandler(ciImage: input)
let request = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([request])
guard let result = request.results?.first else {
  FileHandle.standardError.write("no subject found\n".data(using: .utf8)!)
  exit(3)
}
let buffer = try result.generateMaskedImage(ofInstances: result.allInstances, from: handler, croppedToInstancesExtent: false)
let cut = CIImage(cvPixelBuffer: buffer)
let ctx = CIContext()
guard let cg = ctx.createCGImage(cut, from: cut.extent, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!) else { exit(1) }
guard let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { exit(1) }
CGImageDestinationAddImage(dest, cg, nil)
guard CGImageDestinationFinalize(dest) else { exit(1) }

// share of pixels kept, so the caller can warn about an empty or full-frame mask
var kept = 0
if let data = cg.dataProvider?.data, let p = CFDataGetBytePtr(data) {
  let n = cg.width * cg.height
  let step = max(1, n / 200_000)
  var seen = 0
  var i = 0
  while i < n {
    if p[i * 4 + 3] > 127 { kept += 1 }
    seen += 1
    i += step
  }
  print(String(format: "%.3f", Double(kept) / Double(max(1, seen))))
}

// Person matte for `reels mask`: Apple Vision person segmentation, one 8-bit
// grey frame per video frame (W x H, raw) on stdout, for ffmpeg to pick up.
// usage: swift segment.swift <video> <W> <H>
import AVFoundation
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 4, let W = Int(args[2]), let H = Int(args[3]) else {
  FileHandle.standardError.write("usage: segment.swift <video> <W> <H>\n".data(using: .utf8)!)
  exit(2)
}
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let track = asset.tracks(withMediaType: .video)[0]
let reader = try AVAssetReader(asset: asset)
let output = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(output)
reader.startReading()

let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
let ctx = CIContext()
let grey = CGColorSpaceCreateDeviceGray()
var buf = [UInt8](repeating: 0, count: W * H)
var n = 0

while let sample = output.copyNextSampleBuffer(), let pixels = CMSampleBufferGetImageBuffer(sample) {
  try VNImageRequestHandler(cvPixelBuffer: pixels).perform([request])
  if let mask = request.results?.first?.pixelBuffer {
    let img = CIImage(cvPixelBuffer: mask)
    let scaled = img.transformed(by: CGAffineTransform(scaleX: CGFloat(W) / img.extent.width, y: CGFloat(H) / img.extent.height))
    ctx.render(scaled, toBitmap: &buf, rowBytes: W, bounds: CGRect(x: 0, y: 0, width: W, height: H), format: .L8, colorSpace: grey)
  } else {
    buf = [UInt8](repeating: 0, count: W * H)
  }
  FileHandle.standardOutput.write(Data(buf))
  n += 1
  if n % 60 == 0 { FileHandle.standardError.write("\(n) frames\n".data(using: .utf8)!) }
}

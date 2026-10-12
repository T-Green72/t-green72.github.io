// Re-encodes a video for the web: H.264 at a fixed bitrate, AAC audio, moov atom first (fast start).
// Usage: swift scripts/transcode.swift <in.mp4> <out.mp4> <videoBitsPerSecond>
import AVFoundation
let args = CommandLine.arguments
let input = URL(fileURLWithPath: args[1]), output = URL(fileURLWithPath: args[2])
let bitrate = Int(args[3]) ?? 1_000_000
try? FileManager.default.removeItem(at: output)
let asset = AVURLAsset(url: input)
let reader = try! AVAssetReader(asset: asset)
let writer = try! AVAssetWriter(outputURL: output, fileType: .mp4)
writer.shouldOptimizeForNetworkUse = true
let vTrack = asset.tracks(withMediaType: .video)[0]
let size = vTrack.naturalSize.applying(vTrack.preferredTransform)
let w = Int(abs(size.width)), h = Int(abs(size.height))
let vOut = AVAssetReaderTrackOutput(track: vTrack, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange])
reader.add(vOut)
let vIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: Int(vTrack.naturalSize.width), AVVideoHeightKey: Int(vTrack.naturalSize.height),
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: bitrate, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel, AVVideoMaxKeyFrameIntervalKey: 60]])
vIn.transform = vTrack.preferredTransform
vIn.expectsMediaDataInRealTime = false
writer.add(vIn)
var aOut: AVAssetReaderTrackOutput? = nil, aIn: AVAssetWriterInput? = nil
if let aTrack = asset.tracks(withMediaType: .audio).first {
  aOut = AVAssetReaderTrackOutput(track: aTrack, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
  reader.add(aOut!)
  aIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVNumberOfChannelsKey: 2, AVSampleRateKey: 44100, AVEncoderBitRateKey: 96000])
  aIn!.expectsMediaDataInRealTime = false
  writer.add(aIn!)
}
reader.startReading(); writer.startWriting(); writer.startSession(atSourceTime: .zero)
let group = DispatchGroup()
func pump(_ input: AVAssetWriterInput, _ output: AVAssetReaderTrackOutput, _ q: String) {
  group.enter()
  input.requestMediaDataWhenReady(on: DispatchQueue(label: q)) {
    while input.isReadyForMoreMediaData {
      if let buf = output.copyNextSampleBuffer() { input.append(buf) } else { input.markAsFinished(); group.leave(); return }
    }
  }
}
pump(vIn, vOut, "v"); if let i = aIn, let o = aOut { pump(i, o, "a") }
group.wait()
let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print(writer.status == .completed ? "ok \(w)x\(h)" : "failed: \(String(describing: writer.error))")

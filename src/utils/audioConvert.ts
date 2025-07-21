import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import { Readable } from "stream";

ffmpeg.setFfmpegPath(ffmpegPath.path);

export async function convertWebmToWav(webmBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inputStream = new Readable();
    inputStream.push(webmBuffer);
    inputStream.push(null);

    const chunks: Buffer[] = [];

    const command = ffmpeg(inputStream)
      .inputFormat("webm")
      .audioCodec("pcm_s16le") // 16-bit PCM
      .audioFrequency(16000) // 16kHz sample rate (required by Azure Speech)
      .audioChannels(1) // Mono channel
      .format("wav")
      .on("error", (err) => {
        console.error("FFmpeg conversion error:", err);
        reject(new Error(`Audio conversion failed: ${err.message}`));
      })
      .on("end", () => {
        const result = Buffer.concat(chunks);
        console.log("Audio conversion completed. Output size:", result.length);

        // Validate the converted WAV file
        if (result.length < 44) {
          reject(new Error("Converted audio file is too small"));
          return;
        }

        // Check RIFF header
        const riffHeader = result.subarray(0, 4).toString("ascii");
        if (riffHeader !== "RIFF") {
          reject(new Error("Converted file missing RIFF header"));
          return;
        }

        resolve(result);
      });

    const stream = command.pipe();
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", (err: Error) => {
      console.error("Stream error:", err);
      reject(err);
    });
  });
}

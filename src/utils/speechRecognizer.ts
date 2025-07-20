// speechRecognizer.ts
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as fs from "fs";
import { Readable } from "stream";
import axios from "axios";
import fsExtra from "fs-extra";

interface RecognizeOptions {
  /**
   * Path to a local WAV file (PCM, 16‑bit, 16 kHz, mono)
   * OR a Buffer containing WAV data.
   */
  audio: string | Buffer;
  subscriptionKey: string;
  serviceRegion: string; // e.g. "eastus"
  language?: string; // e.g. "en-US" (default)
}

interface AssemblyAIOptions {
  /**
   * Path to a local audio file OR a Buffer containing audio data.
   */
  audio: string | Buffer;
  apiKey: string;
  speechModel?: string; // default: "universal"
}

/**
 * Transcribes audio using AssemblyAI API.
 * Resolves with the recognized text, or rejects on error.
 */
export async function transcribeWithAssemblyAI({
  audio,
  apiKey,
  speechModel = "universal",
}: AssemblyAIOptions): Promise<string> {
  const baseUrl = "https://api.assemblyai.com";

  const headers = {
    authorization: apiKey,
  };

  let audioUrl: string;

  // Upload audio to AssemblyAI if it's a local file or buffer
  if (typeof audio === "string") {
    // Read from file path
    const audioData = await fsExtra.readFile(audio);
    const uploadResponse = await axios.post(`${baseUrl}/v2/upload`, audioData, {
      headers,
    });
    audioUrl = uploadResponse.data.upload_url;
  } else {
    // Upload buffer
    const uploadResponse = await axios.post(`${baseUrl}/v2/upload`, audio, {
      headers,
    });
    audioUrl = uploadResponse.data.upload_url;
  }

  const data = {
    audio_url: audioUrl,
    speech_model: speechModel,
  };

  const url = `${baseUrl}/v2/transcript`;
  const response = await axios.post(url, data, { headers: headers });

  const transcriptId = response.data.id;
  const pollingEndpoint = `${baseUrl}/v2/transcript/${transcriptId}`;

  while (true) {
    const pollingResponse = await axios.get(pollingEndpoint, {
      headers: headers,
    });
    const transcriptionResult = pollingResponse.data;

    if (transcriptionResult.status === "completed") {
      return transcriptionResult.text || "";
    } else if (transcriptionResult.status === "error") {
      throw new Error(`Transcription failed: ${transcriptionResult.error}`);
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

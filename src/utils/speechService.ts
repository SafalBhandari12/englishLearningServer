// Utility for Azure Pronunciation Assessment integration

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";

const subscriptionKey = process.env.AZURE_SUBSCRIPTION_KEY!;
const serviceRegion = process.env.AZURE_SERVICE_REGION!;

// Default assessment parameters
const DEFAULT_REFERENCE_TEXT = "";
const DEFAULT_GRADING_SYSTEM =
  sdk.PronunciationAssessmentGradingSystem.HundredMark;
const DEFAULT_GRANULARITY = sdk.PronunciationAssessmentGranularity.Word;
const DEFAULT_ENABLE_MISCUE = false;

interface PronunciationConfig {
  referenceText: string;
  gradingSystem?: sdk.PronunciationAssessmentGradingSystem;
  granularity?: sdk.PronunciationAssessmentGranularity;
  enableMiscue?: boolean;
}

export interface AssessmentResult {
  recognizedText: string;
  accuracyScore: number;
  pronunciationScore: number;
  fluencyScore: number;
  completenessScore: number;
  rawJson: object;
}

/**
 * Assess pronunciation from a WAV buffer.
 * @param wavBuffer The PCM WAV file buffer (16kHz, 16-bit mono).
 * @param config Optional parameters for assessment.
 */
export async function assessPronunciationFromBuffer(
  wavBuffer: Buffer,
  config: PronunciationConfig
): Promise<AssessmentResult> {
  // Validate WAV buffer before processing
  if (wavBuffer.length < 44) {
    throw new Error("WAV buffer too small - missing header");
  }

  // Check for RIFF header
  const riffHeader = wavBuffer.subarray(0, 4).toString("ascii");
  if (riffHeader !== "RIFF") {
    throw new Error(`Invalid WAV header: expected 'RIFF', got '${riffHeader}'`);
  }

  // Check for WAVE identifier
  const waveHeader = wavBuffer.subarray(8, 12).toString("ascii");
  if (waveHeader !== "WAVE") {
    throw new Error(`Invalid WAV format: expected 'WAVE', got '${waveHeader}'`);
  }

  console.log("WAV validation passed. Buffer size:", wavBuffer.length);

  // Create speech config
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    subscriptionKey,
    serviceRegion
  );
  speechConfig.speechRecognitionLanguage = "en-US";

  // Create audio config from buffer
  let audioConfig: sdk.AudioConfig;
  try {
    audioConfig = sdk.AudioConfig.fromWavFileInput(wavBuffer);
  } catch (error) {
    throw new Error(
      `Failed to create audio config: ${(error as Error).message}`
    );
  }

  // Build pronunciation assessment config
  const pronConfig = new sdk.PronunciationAssessmentConfig(
    config.referenceText || DEFAULT_REFERENCE_TEXT,
    config.gradingSystem ?? DEFAULT_GRADING_SYSTEM,
    config.granularity ?? DEFAULT_GRANULARITY,
    config.enableMiscue ?? DEFAULT_ENABLE_MISCUE
  );

  // Create recognizer and apply config
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
  pronConfig.applyTo(recognizer);

  // Wrap recognizeOnceAsync in a Promise
  return new Promise<AssessmentResult>((resolve, reject) => {
    recognizer.recognizeOnceAsync(
      (result) => {
        try {
          if (result.reason === sdk.ResultReason.NoMatch) {
            recognizer.close();
            reject(new Error("No speech could be recognized from the audio"));
            return;
          }

          if (result.reason === sdk.ResultReason.Canceled) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            recognizer.close();
            reject(
              new Error(
                `Recognition canceled: ${cancellation.reason} - ${cancellation.errorDetails}`
              )
            );
            return;
          }

          const assessment =
            sdk.PronunciationAssessmentResult.fromResult(result);
          const json = JSON.parse(
            result.properties.getProperty(
              sdk.PropertyId.SpeechServiceResponse_JsonResult
            ) || "{}"
          );

          const output: AssessmentResult = {
            recognizedText: result.text,
            accuracyScore: assessment.accuracyScore,
            pronunciationScore: assessment.pronunciationScore,
            fluencyScore: assessment.fluencyScore,
            completenessScore: assessment.completenessScore,
            rawJson: json,
          };

          recognizer.close();
          resolve(output);
        } catch (e) {
          recognizer.close();
          reject(
            new Error(`Assessment processing failed: ${(e as Error).message}`)
          );
        }
      },
      (error) => {
        recognizer.close();
        reject(new Error(`Speech recognition failed: ${error}`));
      }
    );
  });
}

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
  // Create speech config
  const speechConfig = sdk.SpeechConfig.fromSubscription(
    subscriptionKey,
    serviceRegion
  );
  speechConfig.speechRecognitionLanguage = "en-US";

  // Create audio config from buffer
  const audioConfig = sdk.AudioConfig.fromWavFileInput(wavBuffer);

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
          reject(e);
        }
      },
      (error) => {
        recognizer.close();
        reject(error);
      }
    );
  });
}

// azure_pronunciation_assessment.ts
// This sample demonstrates how to use the Microsoft Azure Pronunciation Assessment API in Node.js with TypeScript.
// Prerequisites:
//   1. Node.js and TypeScript installed
//   2. An Azure Speech resource (subscription key + service region)
//   3. Install the Speech SDK: npm install microsoft-cognitiveservices-speech-sdk @types/node
//   4. A mono WAV file (16-bit PCM, 16 kHz) containing the spoken input (e.g., pronunciation_input.wav)

import * as sdk from "microsoft-cognitiveservices-speech-sdk";
import * as fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// TODO: Replace with your Azure Speech subscription key and service region (e.g., "westus2").
const subscriptionKey: string = process.env.AZURE_SUBSCRIPTION_KEY!;
const serviceRegion: string = process.env.AZURE_SERVICE_REGION!;

// The text reference for pronunciation assessment.
const referenceText: string = "The quick brown fox jumps over the lazy dog";
// Grading system: FivePoint or HundredMark
const gradingSystem = sdk.PronunciationAssessmentGradingSystem.FivePoint;
// Granularity: Phoneme, Word, or FullText
const granularity = sdk.PronunciationAssessmentGranularity.Phoneme;
// Enable miscue detection (true/false)
const enableMiscue: boolean = true;

async function assessPronunciation(): Promise<void> {
  // Create SpeechConfig and AudioConfig
  const speechConfig: sdk.SpeechConfig = sdk.SpeechConfig.fromSubscription(
    subscriptionKey,
    serviceRegion
  );
  // (Optional) set the recognition language, defaults to en-US
  speechConfig.speechRecognitionLanguage = "en-US";

  // Load the WAV file into memory
  const fileBuffer: Buffer = fs.readFileSync("pronunciation_input.wav");
  const audioConfig: sdk.AudioConfig =
    sdk.AudioConfig.fromWavFileInput(fileBuffer);

  // Create PronunciationAssessmentConfig
  const pronConfig: sdk.PronunciationAssessmentConfig =
    new sdk.PronunciationAssessmentConfig(
      referenceText,
      gradingSystem,
      granularity,
      enableMiscue
    );

  // Create the recognizer
  const recognizer: sdk.SpeechRecognizer = new sdk.SpeechRecognizer(
    speechConfig,
    audioConfig
  );

  // Apply pronunciation assessment config to the recognizer
  pronConfig.applyTo(recognizer);

  // Perform speech recognition with pronunciation assessment once
  recognizer.recognizeOnceAsync(
    (result: sdk.SpeechRecognitionResult) => {
      console.log(`Recognized Text: ${result.text}`);

      // Parse the assessment result
      const assessmentResult =
        sdk.PronunciationAssessmentResult.fromResult(result);
      console.log(`Accuracy Score: ${assessmentResult.accuracyScore}`);
      console.log(
        `Pronunciation Score: ${assessmentResult.pronunciationScore}`
      );
      console.log(`Fluency Score: ${assessmentResult.fluencyScore}`);
      console.log(`Completeness Score: ${assessmentResult.completenessScore}`);
      console.log(`Total Score: ${assessmentResult.detailResult}`);

      // The full JSON response, including phoneme/word details
      const jsonResult: string = result.properties.getProperty(
        sdk.PropertyId.SpeechServiceResponse_JsonResult
      );
      console.log(`Detailed JSON Result:\n${jsonResult}`);

      recognizer.close();
    },
    (err: any) => {
      console.error("ERROR during recognition:", err);
      recognizer.close();
    }
  );
}

// Run the pronunciation assessment
assessPronunciation().catch((err) => console.error(err));

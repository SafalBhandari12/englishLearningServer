import { Response } from "express";
import prisma from "../utils/database.js";
import { AuthRequest } from "../types/index.js";
import z, { string } from "zod";
import {
  cleanJsonResponseFirstQuestion,
  generateText,
  generateNextQuestion,
} from "src/utils/gemini.js";
import { infoPrompt, nextQuestionPrompt } from "src/utils/prompts.js";
import { BlobServiceClient, BlockBlobClient } from "@azure/storage-blob";
import * as sdk from "microsoft-cognitiveservices-speech-sdk"; // <-- added import
import { assessPronunciationFromBuffer } from "../utils/speechService.js";
import { transcribeWithAssemblyAI } from "../utils/speechRecognizer.js";

const longUrlSchema = z.object({
  longUrl: string(),
});

const shortUrlSchema = z.object({
  shortUrl: string(),
});

const infoSchema = z.object({
  info: z.string(),
});

const {
  AZURE_STORAGE_ACCOUNT_NAME,
  AZURE_STORAGE_CONTAINER,
  AZURE_STORAGE_SAS_TOKEN, // e.g. "?sv=2024-02-..." including the leading “?”
  PORT = 3000,
} = process.env;

if (
  !AZURE_STORAGE_ACCOUNT_NAME ||
  !AZURE_STORAGE_CONTAINER ||
  !AZURE_STORAGE_SAS_TOKEN
) {
  throw new Error("Missing Azure Storage SAS configuration in .env");
}

// Build the service client by appending the SAS token to the endpoint
const blobServiceClient = new BlobServiceClient(
  `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net${AZURE_STORAGE_SAS_TOKEN}`
);

// Point at your container
const containerClient = blobServiceClient.getContainerClient(
  AZURE_STORAGE_CONTAINER
);

export class UserController {
  static async me(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        select: {
          email: true,
          name: true,
          emailVerified: true,
          candidate: {
            select: {
              context: true,
              accuracyScore: true,
              pronounciationScore: true,
              fluencyScore: true,
              completenessScore: true,
              nextQuestion: true,
            },
          },
        },
      });
      console.log(user);
      if (!user) {
        res.status(404).json({ success: false, message: "User not found" });
        return;
      }
      if (!user.candidate) {
        res
          .status(403)
          .json({ success: false, message: "User not registered" });
        return;
      }
      res.json({
        success: true,
        message: "User data fetched sucessfully",
        user,
      });
      return;
    } catch (error) {
      console.error("Error fetching user:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
      return;
    }
  }

  static async completeRegistration(req: AuthRequest, res: Response) {
    const isRegistrationCompleted = await prisma.candidate.findUnique({
      where: { userId: req.user?.userId! },
    });
    if (isRegistrationCompleted) {
      return res
        .status(400)
        .json({ success: false, message: "The user is already Registered" });
    }
    const { info } = infoSchema.parse(req.body);

    const response = await generateText({ prompt: infoPrompt, info });

    const candidateText =
      response.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No candidate text available";

    const jsonResponse = cleanJsonResponseFirstQuestion(candidateText);

    if (jsonResponse.success && jsonResponse.firstQuestion) {
      await prisma.candidate.create({
        data: {
          context: jsonResponse.message,
          nextQuestion: jsonResponse.firstQuestion,
          userId: req.user?.userId!,
        },
      });
    }

    res.status(200).json(cleanJsonResponseFirstQuestion(candidateText));
    return;
  }
  static async sendAnswer(req: AuthRequest, res: Response) {
    const isRegistrationCompleted = await prisma.candidate.findUnique({
      where: { userId: req.user?.userId! },
    });
    if (isRegistrationCompleted === null) {
      return res.status(400).json({
        success: false,
        message: "User registration is not completed",
      });
    }
    console.log(isRegistrationCompleted);

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    // Check file type and audio format
    const ext = req.file.originalname.toLowerCase();
    if (!ext.endsWith(".wav")) {
      return res
        .status(400)
        .json({ success: false, message: "Only .wav files allowed" });
    }

    // Validate audio buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Empty audio file" });
    }

    // Check for minimum file size (very basic validation)
    if (req.file.buffer.length < 1000) {
      return res
        .status(400)
        .json({ success: false, message: "Audio file too small" });
    }

    // 1. Upload WAV to Azure Blob Storage
    const blobName = `audio${Date.now()}.wav`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: { blobContentType: req.file.mimetype },
    });

    // 2. Check AssemblyAI API configuration
    const assemblyAIApiKey = process.env.ASSEMBLYAI_API_KEY;

    if (!assemblyAIApiKey) {
      return res.status(500).json({
        success: false,
        message: "Missing AssemblyAI API configuration",
      });
    }

    // 3. Transcribe audio to text using AssemblyAI
    console.log("Starting speech recognition with AssemblyAI...");
    console.log("Audio buffer size:", req.file.buffer.length);
    console.log("Audio mimetype:", req.file.mimetype);

    let recognizedText = "";
    try {
      recognizedText = await transcribeWithAssemblyAI({
        audio: req.file.buffer,
        apiKey: assemblyAIApiKey,
      });
    } catch {
      return res.status(500).json({
        success: false,
        message:
          "AssemblyAI transcription failed and no Azure fallback configured",
      });
    }

    console.log("Recognized text:", recognizedText);

    // Skip pronunciation assessment if no text was recognized
    if (!recognizedText.trim()) {
      return res.json({
        success: true,
        url: blockBlobClient.url,
        recognizedText: "",
        assessment: null,
        message: "Audio uploaded but no speech was detected",
      });
    }

    // 4. Perform pronunciation assessment using recognized text (if Azure is available)
    let assessment = null;
    const subscriptionKey = process.env.AZURE_SUBSCRIPTION_KEY;
    const serviceRegion = process.env.AZURE_SERVICE_REGION;

    if (subscriptionKey && serviceRegion && recognizedText.trim()) {
      try {
        assessment = await assessPronunciationFromBuffer(req.file.buffer, {
          referenceText: recognizedText,
          gradingSystem: sdk.PronunciationAssessmentGradingSystem.HundredMark,
          granularity: sdk.PronunciationAssessmentGranularity.Word,
          enableMiscue: true,
        });
      } catch (error) {
        console.error("Pronunciation assessment failed:", error);
        // Continue without assessment rather than failing the entire request
      }
    }

    const bot = await prisma.candidate.findUnique({
      where: { userId: req.user?.userId! },
      select: {
        nextQuestion: true,
      },
    });

    if (!bot) {
      res.json(500).json({ success: false, message: "Internal server error" });
      return;
    }

    const conversation = {
      bot: bot.nextQuestion,
      human: recognizedText,
    };

    const user = await prisma.candidate.findUnique({
      where: { userId: req.user?.userId },
    });

    const chatHistory = await prisma.chatHistory.findMany({
      where: { candidateId: req.user?.userId },
      orderBy: { createdAt: "desc" }, // get latest first
      take: 20, // only last 20
    });

    const conversationHistory = chatHistory
      .reverse()
      .map((singleConversation) => {
        return { bot: singleConversation.bot, human: singleConversation.user };
      });

    conversationHistory.push(conversation);
    const context = user?.context;

    const nextQuestion = await generateNextQuestion({
      conversationHistory,
      aboutUser: context!,
      prompt: nextQuestionPrompt,
    });

    console.log("Next Question: ", nextQuestion);
    console.log(conversationHistory);
    console.log(context);
    console.log(assessment);


    await prisma.scores.createMany({
      data: [
        {
          candidateId: req.user?.userId!,
          type: "ACCURACY_SCORE",
          score: assessment?.accuracyScore!,
        },
        {
          candidateId: req.user?.userId!,
          type: "COMPLETENESS_SCORE",
          score: assessment?.completenessScore!,
        },
        {
          candidateId: req.user?.userId!,
          type: "FLEUNCY_SCORE",
          score: assessment?.fluencyScore!,
        },
        {
          candidateId: req.user?.userId!,
          type: "PRONOUNCIATION_SCORE",
          score: assessment?.pronunciationScore!,
        },
      ],
    });

    const pronounciationScore = await prisma.scores.findMany({
      where: { candidateId: req.user?.userId, type: "PRONOUNCIATION_SCORE" },
    });
    const averagePronounciationScore =
      pronounciationScore.length > 0
        ? pronounciationScore.reduce(
            (sum, item) => sum + (item.score || 0),
            0
          ) / pronounciationScore.length
        : 0;

    const fluencyScore = await prisma.scores.findMany({
      where: { candidateId: req.user?.userId, type: "FLEUNCY_SCORE" },
    });
    const averageFluencyScore =
      fluencyScore.length > 0
        ? fluencyScore.reduce((sum, item) => sum + (item.score || 0), 0) /
          fluencyScore.length
        : 0;

    const completenessScore = await prisma.scores.findMany({
      where: { candidateId: req.user?.userId, type: "COMPLETENESS_SCORE" },
    });
    const averageCompletenessScore =
      completenessScore.length > 0
        ? completenessScore.reduce((sum, item) => sum + (item.score || 0), 0) /
          completenessScore.length
        : 0;
    const accuracyScore = await prisma.scores.findMany({
      where: { candidateId: req.user?.userId, type: "ACCURACY_SCORE" },
    });
    const averageAccuracyScore =
      accuracyScore.length > 0
        ? accuracyScore.reduce((sum, item) => sum + (item.score || 0), 0) /
          accuracyScore.length
        : 0;

    // 5. Save assessment scores into database (optional, only if assessment was successful)
    if (assessment) {
      await prisma.candidate.update({
        where: { userId: req.user?.userId! },
        data: {
          accuracyScore: averageAccuracyScore,
          pronounciationScore: averagePronounciationScore,
          fluencyScore: averageFluencyScore,
          completenessScore: averageCompletenessScore,
          chatHistory: {
            create: {
              bot: conversation.bot,
              user: conversation.human,
              userAudio: blockBlobClient.url, // Use Azure Blob Storage URL
            },
          },
          nextQuestion: nextQuestion.nextQuestion,
        },
      });
    }

    // 6. Return response
    res.json({
      success: true,
      url: blockBlobClient.url,
      recognizedText,
      assessment,
    });
    return;
  }
}

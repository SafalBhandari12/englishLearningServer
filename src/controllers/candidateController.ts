import { Response } from "express";
import prisma from "../utils/database.js";
import { AuthRequest } from "../types/index.js";
import z, { string } from "zod";
import { nanoid } from "nanoid";
import { cleanJsonResponse, generateText } from "src/utils/gemini.js";
import { infoPrompt } from "src/utils/prompts.js";

const longUrlSchema = z.object({
  longUrl: string(),
});

const shortUrlSchema = z.object({
  shortUrl: string(),
});

const infoSchema = z.object({
  info: z.string(),
});

export class UserController {
  static async me(req: AuthRequest, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user?.userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          role: true,
          candidate: true,
        },
      });
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
      res.json(user);
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

    const jsonResponse = cleanJsonResponse(candidateText);

    if (jsonResponse.success && jsonResponse.firstQuestion) {
      await prisma.candidate.create({
        data: {
          context: jsonResponse.message,
          nextQuestion: jsonResponse.firstQuestion,
          userId: req.user?.userId!,
        },
      });
    }

    res.status(200).json(cleanJsonResponse(candidateText));
    return;
  }
}

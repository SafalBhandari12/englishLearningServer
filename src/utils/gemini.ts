import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY!;

const genAI = new GoogleGenerativeAI(apiKey);

// Example: Generate text
export async function generateText(data: {
  prompt: string;
  info: string | null;
}) {
  const { prompt, info } = data;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(
    `System Prompt:${prompt}. User information:${info}`
  );
  return result;
}

export function cleanJsonResponse(response: string): {
  success: boolean;
  message: string;
  firstQuestion?: string;
} {
  return JSON.parse(response.replace(/```json|```/g, "").trim());
}

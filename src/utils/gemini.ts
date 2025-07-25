import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";
import { json } from "stream/consumers";

const apiKey = process.env.GEMINI_API_KEY!;

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Example: Generate text
export async function generateText(data: {
  prompt: string;
  info: string | null;
}) {
  const { prompt, info } = data;
  const result = await model.generateContent(
    `System Prompt:${prompt}. User information:${info}`
  );
  console.log(result);
  return result;
}

export async function generateNextQuestion(data: {
  conversationHistory: {
    bot: string;
    human: string;
  }[];
  aboutUser: string;
  prompt: string;
}) {
  const contextJson = {
    conversationHistory: data.conversationHistory,
    aboutUser: data.aboutUser,
  };
  const context = JSON.stringify(contextJson);
  const result = await model.generateContent(
    `System Prompt:${data.prompt}. Data:${context}`
  );
  console.log(result);
  return cleanJsonResponseNexttQuestion(result.response.text());
}

export function cleanJsonResponseFirstQuestion(response: string): {
  success: boolean;
  message: string;
  firstQuestion?: string;
} {
  return JSON.parse(response.replace(/```json|```/g, "").trim());
}
export function cleanJsonResponseNexttQuestion(response: string): {
  success: boolean;
  message: string;
  nextQuestion?: string;
} {
  return JSON.parse(response.replace(/```json|```/g, "").trim());
}

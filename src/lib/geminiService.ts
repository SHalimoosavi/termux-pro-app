import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function analyzeCode(code: string, language: string) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("AI_LINK_INACTIVE: Missing System Key");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const prompt = `You are the Termux Pro AI Core. Analyze this ${language} code.
  Return your analysis in this EXACT format:
  
  [CRITICAL_ERRORS]
  - List any bugs or security risks here (keep it technical).
  
  [OPTIMIZATION_TIPS]
  - How to make it faster or more efficient.
  
  [REFACTORING_SUGGESTION]
  - A brief snippet or logic change.
  
  Code:
  ${code}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeLogEntry = async (logContext: string, type: string): Promise<string> => {
  try {
    const ai = getClient();
    
    const prompt = `
      You are an expert Android System Engineer.
      Analyze the following Android ${type} log snippet.
      
      1. Identify the root cause (what specific exception or blockage occurred).
      2. If it is an ANR, explain what might be blocking the main thread.
      3. If it is a Crash, explain the exception and the likely culprit in the code.
      4. Suggest a potential fix or debugging step.

      Format the output in clean Markdown. Keep it concise but technical.

      Log Snippet:
      \`\`\`
      ${logContext.substring(0, 10000)} 
      \`\`\`
      (Note: Snippet might be truncated)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for log analysis usually
      }
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return `Error analyzing log: ${error instanceof Error ? error.message : String(error)}`;
  }
};
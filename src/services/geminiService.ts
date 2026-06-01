import { GoogleGenAI, Type } from "@google/genai";
import { DailyCheckIn } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateWeeklySummary(checkins: DailyCheckIn[]) {
  const prompt = `
    Analyze the following weekly health check-in data for an elderly person and provide a summary.
    Data: ${JSON.stringify(checkins)}
    
    Identify:
    1. Patterns in mood and pain levels.
    2. Consistency in taking medication and hydration.
    3. Consistency in eating and sleep quality.
    4. Physical activity trends.
    5. Any concerning trends (e.g., correlation between poor sleep and bad mood).
    
    Provide the response in JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "A concise summary of the week's health" },
            recommendations: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Actionable recommendations for the caregiver"
            },
            concernLevel: { 
              type: Type.STRING, 
              enum: ["low", "medium", "high"],
              description: "Overall concern level"
            }
          },
          required: ["summary", "recommendations", "concernLevel"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error generating health summary:", error);
    return null;
  }
}

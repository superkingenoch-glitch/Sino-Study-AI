
import { GoogleGenAI, Type } from "@google/genai";
import { NoteContent, ExamSchedule, QuizSet, QuizSettings } from "../types";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const processStudyNote = async (input: string, imageBase64?: string): Promise<NoteContent> => {
  const ai = getAIClient();
  const model = "gemini-3-flash-preview";
  
  const prompt = `你是一位專業的學習助手。請分析以下內容並生成結構化筆記：
  1. 標題 (title)
  2. 簡短摘要 (summary)
  3. 重點條列 (keyPoints)
  4. 心智圖結構 (mindMap: id, text, children[])
  請務必以純 JSON 格式回應。`;

  const contents: any[] = [{ text: prompt }];
  if (imageBase64) {
    contents.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      }
    });
  }
  if (input) {
    contents.push({ text: `內容：${input}` });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts: contents },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          mindMap: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              text: { type: Type.STRING },
              children: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    text: { type: Type.STRING },
                    children: { 
                      type: Type.ARRAY, 
                      items: { 
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          text: { type: Type.STRING }
                        },
                        required: ["id", "text"]
                      } 
                    }
                  },
                  required: ["id", "text"]
                }
              }
            },
            required: ["id", "text"]
          }
        },
        required: ["title", "summary", "keyPoints", "mindMap"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateExamSchedule = async (goal: string): Promise<ExamSchedule> => {
  const ai = getAIClient();
  const model = "gemini-3-flash-preview";
  const prompt = `請根據以下學習目標生成一份考前規劃時間表：${goal}。包含日期、主題、建議時間和優先順序。`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          planTitle: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                topic: { type: Type.STRING },
                duration: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
              },
              required: ["date", "topic", "duration", "priority"]
            }
          }
        },
        required: ["planTitle", "items"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateQuiz = async (content: string, settings: QuizSettings, imageBase64?: string): Promise<QuizSet> => {
  const ai = getAIClient();
  const model = "gemini-3-flash-preview";
  
  const settingsPrompt = `難度：${settings.difficulty}，年級等級：${settings.level}，題目數量：${settings.questionCount}。`;
  const basePrompt = `你是一位專業的出題教師。請針對提供的內容出題。
  要求：4個選項，有詳細解析，JSON 格式。如果是圖片，請分析圖片中的知識點出題。
  設定：${settingsPrompt}`;

  const parts: any[] = [{ text: basePrompt }];
  if (content) parts.push({ text: `主題或補充說明：${content}` });
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64,
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    const quiz = JSON.parse(response.text);
    quiz.timeLimit = (settings.timeLimit || 10) * 60;
    return quiz;
  } catch (e: any) {
    if (e.message?.includes('permission')) {
      throw new Error("API 權限不足，請確認您的 API Key 設定。");
    }
    throw e;
  }
};

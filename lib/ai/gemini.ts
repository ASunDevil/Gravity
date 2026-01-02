import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' }) : null;

export async function generateMove(prompt: string, gameType: string): Promise<string | null> {
  if (!model) {
    console.warn('Gemini API Key not found. Falling back to simple AI.');
    return null;
  }

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.trim();
  } catch (error) {
    console.error('Error generating AI move:', error);
    return null;
  }
}

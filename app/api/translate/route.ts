import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { word, context } = await req.json();

    if (!word) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    const prompt = `
Analyze the English word or phrase "${word}" (Context sentence: "${context || 'N/A'}").

Provide 3 to 4 common Russian translation options for this word. For each translation option, generate a short, natural English example sentence using the word in that specific sense, along with its Russian translation.

Return ONLY a valid JSON object with the following schema:
{
  "word": "${word}",
  "options": [
    {
      "translation": "Вариант перевода (напр. смесь)",
      "exampleEn": "Add the mix into the bowl.",
      "exampleRu": "Добавьте смесь в миску."
    },
    {
      "translation": "Вариант перевода (напр. смешивать)",
      "exampleEn": "Mix all ingredients together.",
      "exampleRu": "Смешайте все ингредиенты вместе."
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const data = JSON.parse(response.text || '{}');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Translation API error:', error);
    return NextResponse.json({ error: 'Failed to fetch translations' }, { status: 500 });
  }
}
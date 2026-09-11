import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { systemPrompt, history, userMessage } = await req.json();

    // Формируем историю сообщений без пустых или битых элементов
    const formattedHistory = (history || [])
      .filter((msg: { text?: string }) => msg.text && msg.text.trim() !== '')
      .map((msg: { sender: string; text: string }) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

    // Собираем contents
    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents,
      config: {
        systemInstruction: systemPrompt || 'You are a helpful assistant.',
      },
    });

    const reply = response.text || '';
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
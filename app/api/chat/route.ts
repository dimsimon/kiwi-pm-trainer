import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is missing in environment variables');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { systemPrompt, history, userMessage } = await req.json();

    // Формируем историю сообщений
    const formattedHistory = (history || [])
      .filter((msg: { text?: string; content?: string }) => {
        const txt = msg.text || msg.content;
        return txt && txt.trim() !== '';
      })
      .map((msg: { sender?: string; role?: string; text?: string; content?: string }) => ({
        // Исправлено: в Gemini SDK ролями выступают 'user' и 'model'
        role: (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'model',
        parts: [{ text: msg.text || msg.content || '' }],
      }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Исправлено: валидная актуальная модель Gemini
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
import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { scenarioTitle, history, lastAiMessage } = await req.json();

    const prompt = `
      You are a PM mentor assisting a non-native IT Project Manager.
      Current Scenario: "${scenarioTitle}".
      Last AI response: "${lastAiMessage}"
      
      Generate 3 distinct, high-quality professional response options/ideas in English that the user could send next.
      1. Direct & Assertive
      2. Diplomatic & Solution-oriented
      3. Inquiring / Gathering Details

      Return ONLY a JSON array of strings:
      ["Option 1 text", "Option 2 text", "Option 3 text"]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const hints = JSON.parse(response.text || '[]');
    return NextResponse.json({ hints });
  } catch (error) {
    console.error('Hint API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch hints' }, { status: 500 });
  }
}
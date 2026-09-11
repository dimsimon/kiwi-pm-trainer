import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const { history } = await req.json();

    const prompt = `
Analyze the following English conversation history between a Kiwi interviewer and a user learning English.

Find grammar/vocabulary mistakes in the user's responses, suggest natural Kiwi English improvements, and identify key natural collocations AND PHRASAL VERBS used in the context.

CONVERSATION HISTORY:
${JSON.stringify(history, null, 2)}

Return ONLY a valid JSON object matching this schema:
{
  "overallScore": "Short evaluation (e.g. B2 / Good fluency)",
  "corrections": [
    {
      "original": "User text with error",
      "better": "Improved natural Kiwi version",
      "explanation": "Brief explanation of why"
    }
  ],
  "highlightedPhrases": [
    {
      "phrase": "e.g. figure out / sorted out / catch up / kick off",
      "type": "phrasal_verb",
      "translation": "Перевод на русский",
      "explanation": "Контекст применения фразового глагола"
    },
    {
      "phrase": "e.g. sharp learning curve / smooth transition",
      "type": "collocation",
      "translation": "Перевод на русский",
      "explanation": "Контекст применения устойчивого выражения"
    }
  ],
  "kiwiTip": "One practical tip about Kiwi English or culture based on the chat"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || '{}';
    const feedbackData = JSON.parse(jsonText);

    return NextResponse.json(feedbackData);
  } catch (error) {
    console.error('Feedback API error:', error);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { mode, userMessage, scenarioTitle, history } = await req.json();

    if (mode === 'single_message') {
      const prompt = `
You are an English communication coach.
Analyze the following user message: "${userMessage}" in the context of the scenario: "${scenarioTitle}".

1. Improved version: Provide a natural, context-appropriate alternative (keep the same tone — do NOT turn a casual greeting into a formal business email unless it's a formal scenario).
2. Vocabulary suggestions: Provide 1-2 relevant phrase/vocabulary improvements if applicable.

Return JSON in this format:
{
  "improvedVersion": "string",
  "vocabularySuggestions": [
    { "original": "string", "recommended": "string", "reason": "string" }
  ]
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const cleanJson = (response.text || '{}').replace(/```json|```/g, '').trim();
      const data = JSON.parse(cleanJson);
      return NextResponse.json(data);
    } 

    // Full scenario analysis mode
    const prompt = `
      Analyze this PM conversation history for scenario "${scenarioTitle}":
      ${JSON.stringify(history)}

      Return ONLY a JSON object:
      {
        "overallFeedback": "Summary of performance...",
        "strengths": ["Strength 1", "Strength 2"],
        "keyImprovements": ["Improvement 1", "Improvement 2"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const cleanJson = (response.text || '{}').replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanJson);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Feedback API Error:', error);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
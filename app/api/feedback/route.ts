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
        You are an expert Business English & Project Management Communication Coach.
        Analyze the following user message sent in the context of the PM scenario: "${scenarioTitle}".
        User Message: "${userMessage}"

        Return ONLY a JSON object with this exact structure:
        {
          "corrections": ["Grammar/spelling fix 1", "Better phrasing fix 2"],
          "vocabularySuggestions": [
            { "original": "simple word", "recommended": "PM terminology", "reason": "Why it sounds more professional" }
          ],
          "improvedVersion": "A polished, professional alternative version of the entire message."
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const data = JSON.parse(response.text || '{}');
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

    const data = JSON.parse(response.text || '{}');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Feedback API Error:', error);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
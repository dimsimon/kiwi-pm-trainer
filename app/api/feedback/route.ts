import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const { mode, userMessage, scenarioTitle, history, isStarMode } = await req.json();

    if (mode === 'single_message') {
      const prompt = `
You are an English communication coach for IT Product Managers.
Analyze the following user message: "${userMessage}" in the context of scenario: "${scenarioTitle}".

1. Improved version: Provide a natural, context-appropriate alternative (keep tone appropriate).
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
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const cleanJson = (response.text || '{}').replace(/```json|```/g, '').trim();
      return NextResponse.json(JSON.parse(cleanJson));
    }

    // Full Scenario Analysis Mode (Includes STAR breakdown if requested)
    const prompt = isStarMode
      ? `
Analyze this IT PM behavioral interview response history using the STAR framework (Situation, Task, Action, Result) for scenario "${scenarioTitle}":
${JSON.stringify(history)}

Return ONLY JSON format:
{
  "overallFeedback": "Overall performance summary",
  "starFeedback": {
    "situation": "Evaluation of how clearly Situation was set",
    "task": "Evaluation of Task definition",
    "action": "Evaluation of individual Actions taken as PM",
    "result": "Evaluation of quantifiable Results & Lessons learned",
    "score": 85,
    "recommendation": "Key recommendation for next interview"
  }
}
`
      : `
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
    return NextResponse.json(JSON.parse(cleanJson));
  } catch (error) {
    console.error('Feedback API Error:', error);
    return NextResponse.json({ error: 'Failed to generate feedback' }, { status: 500 });
  }
}
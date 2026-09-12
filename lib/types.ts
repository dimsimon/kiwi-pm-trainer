export interface HighlightedPhrase {
  original: string;
  suggestion: string;
  type: 'error' | 'vocabulary' | 'culture';
  explanation: string;
}

export interface FeedbackData {
  overallFeedback?: string;
  summary?: string;
  score?: number;
  highlightedPhrases?: HighlightedPhrase[];
  improvements?: string[];
  vocabularySuggestions?: { original: string; recommended: string; reason: string }[];
  starFeedback?: {
    situation: string;
    task: string;
    action: string;
    result: string;
    score: number;
    recommendation: string;
  };
}

export interface VocabItem {
  id: string;
  word: string;
  translation: string;
  context: string;
  pmExample: string;
  addedAt: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface Scenario {
  id: string;
  title: string;
  category: 'Relocation' | 'Everyday' | 'Social' | 'Work' | 'Interview';
  description: string;
  initialPrompt?: string;
  initialMessage?: string;
  isStarMode?: boolean;
}
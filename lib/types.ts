export interface VocabItem {
  id: string;
  word: string;
  phrase?: string;
  translation: string;
  context?: string;
  exampleEn?: string;
  exampleRu?: string;
  addedAt?: number;
  dateAdded?: string | number;
}

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
}

export interface Scenario {
  id: string;
  title: string;
  category: 'Relocation' | 'Everyday' | 'Social' | 'Work';
  description: string;
  initialPrompt?: string;
  initialMessage?: string;
  systemPrompt?: string;
}

export interface Message {
  role?: 'user' | 'assistant';
  sender?: 'user' | 'ai';
  content?: string;
  text?: string;
}
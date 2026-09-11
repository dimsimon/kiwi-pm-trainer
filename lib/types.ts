export interface VocabItem {
  id: string;
  word: string;
  phrase?: string;
  translation: string;
  context?: string;
  exampleEn?: string;
  exampleRu?: string;
  addedAt?: number;
}

export interface HighlightedPhrase {
  phrase: string;
  explanation: string;
}

export interface FeedbackData {
  grammarScore?: number;
  clarityScore?: number;
  naturalnessScore?: number;
  overallScore?: string;
  feedback?: string;
  improvedVersion?: string;
  corrections?: Array<{
    original: string;
    better: string;
    explanation: string;
  }>;
  highlightedPhrases?: HighlightedPhrase[];
  kiwiTip?: string;
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
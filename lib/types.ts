export interface VocabItem {
  phrase: string;
  translation: string;
  context?: string;
  addedAt?: number;
}

export interface HighlightedPhrase {
  phrase: string;
  explanation: string;
}

export interface FeedbackData {
  grammarScore: number;
  clarityScore: number;
  naturalnessScore: number;
  feedback: string;
  improvedVersion: string;
  highlightedPhrases?: HighlightedPhrase[];
}

export interface Scenario {
  id: string;
  title: string;
  category: 'Relocation' | 'Everyday' | 'Social' | 'Work';
  description: string;
  initialPrompt: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
export interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  category: string;
  systemPrompt: string;
  initialMessage: string;
}

export interface VocabWord {
  id: string;
  word: string;
  translation: string;
  context?: string;
  createdAt: string;
}

export interface FeedbackData {
  corrections: {
    original: string;
    better: string;
    explanation: string;
  }[];
  kiwiTip?: string;
  overallScore?: string;
}
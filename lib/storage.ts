import { Message, VocabItem } from './types';

const STORAGE_KEY_PREFIX = 'kiwi_pm_chat_';
const VOCAB_STORAGE_KEY = 'kiwi_pm_vocab';

export const storage = {
  getChatHistory: (scenarioId: string): Message[] => {
    if (typeof window === 'undefined') return [];
    try {
      const item = localStorage.getItem(`${STORAGE_KEY_PREFIX}${scenarioId}`);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  },

  saveChatHistory: (scenarioId: string, history: Message[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${scenarioId}`, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  },

  getSavedWords: (): VocabItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const item = localStorage.getItem(VOCAB_STORAGE_KEY);
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  },

  saveWord: (wordItem: VocabItem) => {
    if (typeof window === 'undefined') return;
    try {
      const words = storage.getSavedWords();
      const filtered = words.filter((w) => w.word.toLowerCase() !== wordItem.word.toLowerCase());
      const updated = [wordItem, ...filtered];
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save word', e);
    }
  },

  removeWord: (id: string) => {
    if (typeof window === 'undefined') return;
    try {
      const words = storage.getSavedWords();
      const updated = words.filter((w) => w.id !== id);
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to remove word', e);
    }
  },
};
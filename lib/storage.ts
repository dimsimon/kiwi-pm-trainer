import { Message, VocabItem } from './types';

const CHAT_HISTORY_PREFIX = 'kiwi_chat_history_';
const VOCABULARY_KEY = 'kiwi_vocabulary';

export const storage = {
  // История чатов
  getChatHistory: (scenarioId: string): Message[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(`${CHAT_HISTORY_PREFIX}${scenarioId}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading chat history:', e);
      return [];
    }
  },

  saveChatHistory: (scenarioId: string, messages: Message[]) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${CHAT_HISTORY_PREFIX}${scenarioId}`, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
  },

  // Работа со словарем (Vocabulary)
  getVocabulary: (): VocabItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(VOCABULARY_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading vocabulary:', e);
      return [];
    }
  },

  saveVocabItem: (item: VocabItem) => {
    if (typeof window === 'undefined') return;
    try {
      const current = storage.getVocabulary();
      // Предотвращаем дубликаты по слову и переводу
      const filtered = current.filter(
        (v) => !(v.word.toLowerCase() === item.word.toLowerCase() && v.translation === item.translation)
      );
      const updated = [item, ...filtered];
      localStorage.setItem(VOCABULARY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving vocab item:', e);
    }
  },

  deleteVocabItem: (id: string) => {
    if (typeof window === 'undefined') return;
    try {
      const current = storage.getVocabulary();
      const updated = current.filter((item) => item.id !== id);
      localStorage.setItem(VOCABULARY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting vocab item:', e);
    }
  },
};
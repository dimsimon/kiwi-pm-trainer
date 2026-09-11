let currentUtterance: SpeechSynthesisUtterance | null = null;

export const speakText = (text: string, onEnd?: () => void) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  // Если уже что-то зачитывается — останавливаем
  window.speechSynthesis.cancel();

  // Удаляем спецсимволы Markdown перед озвучкой
  const cleanText = text.replace(/[*#_~`]/g, '');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-NZ'; // Приоритет новозеландского акцента
  utterance.rate = 0.95;

  utterance.onend = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    currentUtterance = null;
    if (onEnd) onEnd();
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
};

export const stopSpeech = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

export const isSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
};
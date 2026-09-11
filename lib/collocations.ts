export interface Collocation {
  phrase: string;
  type: 'kiwi' | 'business' | 'general';
  meaning: string;
}

export const COMMON_COLLOCATIONS: Collocation[] = [
  // Kiwi Slang / Local Idioms
  { phrase: 'sweet as', type: 'kiwi', meaning: 'Отлично, без проблем (All good / fine)' },
  { phrase: 'no worries', type: 'kiwi', meaning: 'Не за что / Всё в порядке' },
  { phrase: 'chur bro', type: 'kiwi', meaning: 'Спасибо, братан' },
  { phrase: 'kia ora', type: 'kiwi', meaning: 'Приветствие на маори / Здравствуйте' },
  { phrase: 'reckon', type: 'kiwi', meaning: 'Считать / полагать (I reckon = Я думаю)' },
  { phrase: 'flatting', type: 'kiwi', meaning: 'Совместная аренда жилья' },

  // Business & IT PM Collocations
  { phrase: 'keep in the loop', type: 'business', meaning: 'Держать в курсе событий' },
  { phrase: 'hit the ground running', type: 'business', meaning: 'Быстро включиться в работу' },
  { phrase: 'touch base', type: 'business', meaning: 'Кратко связаться / обсудить статус' },
  { phrase: 'push back', type: 'business', meaning: 'Оспаривать сроки / возражать' },
  { phrase: 'blocker', type: 'business', meaning: 'Препятствие / затыкающая проблема' },
  { phrase: 'trade-off', type: 'business', meaning: 'Компромисс / уступка' },
  { phrase: 'deep dive', type: 'business', meaning: 'Детальный разбор проблемы' },
  { phrase: 'action item', type: 'business', meaning: 'Задача к исполнению' },
];

/**
 * Подсвечивает известные коллокации в тексте специальным тегом
 */
export function highlightCollocations(text: string): string {
  if (!text) return '';
  let result = text;

  COMMON_COLLOCATIONS.forEach((col) => {
    const regex = new RegExp(`\\b(${col.phrase})\\b`, 'gi');
    result = result.replace(regex, (match) => `[[COLL:${match}:${col.meaning}]]`);
  });

  return result;
}
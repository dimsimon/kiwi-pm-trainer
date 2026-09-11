'use client';

import React, { useState, useEffect } from 'react';
import { VocabItem } from '@/lib/types';
import { storage } from '@/lib/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  initialContext?: string;
}

interface TranslationOption {
  translation: string;
  exampleEn: string;
  exampleRu: string;
}

export function VocabularyModal({ isOpen, onClose, initialWord, initialContext }: Props) {
  const [vocab, setVocab] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<TranslationOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<TranslationOption | null>(null);
  const [activeTab, setActiveTab] = useState<'translate' | 'list'>('translate');

  useEffect(() => {
    if (isOpen) {
      setVocab(storage.getVocabulary());
      if (initialWord) {
        setActiveTab('translate');
        fetchTranslationOptions(initialWord, initialContext || '');
      } else {
        setActiveTab('list');
      }
    }
  }, [isOpen, initialWord, initialContext]);

  const fetchTranslationOptions = async (word: string, context: string) => {
    setLoading(true);
    setSelectedOption(null);
    setOptions([]);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, context }),
      });
      const data = await res.json();
      if (data.options) {
        setOptions(data.options);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWord = () => {
    if (!initialWord || !selectedOption) return;

    const newItem: VocabItem = {
      id: Date.now().toString(),
      word: initialWord,
      translation: selectedOption.translation,
      context: initialContext,
      exampleEn: selectedOption.exampleEn,
      exampleRu: selectedOption.exampleRu,
      dateAdded: new Date().toISOString().split('T')[0],
    };

    storage.saveVocabItem(newItem);
    setVocab(storage.getVocabulary());
    setActiveTab('list');
  };

  const handleDeleteItem = (id: string) => {
    storage.deleteVocabItem(id);
    setVocab(storage.getVocabulary());
  };

  // Вспомогательная функция для подсветки слова в предложении
  const highlightWordInText = (text: string, targetWord?: string) => {
    if (!targetWord || !text) return text;
    const parts = text.split(new RegExp(`(${targetWord})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === targetWord.toLowerCase() ? (
        <span key={i} className="bg-emerald-500/30 text-emerald-300 font-bold px-1 rounded">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden text-slate-100 shadow-xl">
        {/* Шапка модалки */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('translate')}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
                activeTab === 'translate'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              🔍 Перевод
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
                activeTab === 'list'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              📖 Мой словарь ({vocab.length})
            </button>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">
            ✕
          </button>
        </div>

        {/* Контент */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'translate' ? (
            <div>
              {initialWord ? (
                <div className="space-y-3">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-2xl font-bold text-emerald-400">{initialWord}</span>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                      ИИ подбирает варианты перевода и примеры...
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400 font-medium">
                        Выберите подходящий перевод:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedOption(opt)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                              selectedOption?.translation === opt.translation
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            👉 {opt.translation}
                          </button>
                        ))}
                      </div>

                      {/* Показ контекстного примера */}
                      {selectedOption && (
                        <div className="mt-4 p-3 bg-slate-950 border border-emerald-800/60 rounded-xl space-y-2 animate-fadeIn">
                          <div className="text-[11px] font-bold text-emerald-400">
                            💡 Пример использования:
                          </div>
                          <div className="text-xs text-slate-200">
                            {highlightWordInText(selectedOption.exampleEn, initialWord)}
                          </div>
                          <div className="text-xs text-slate-400 italic">
                            {selectedOption.exampleRu}
                          </div>

                          <button
                            onClick={handleSaveWord}
                            className="w-full mt-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all"
                          >
                            + Добавить "{initialWord}" ({selectedOption.translation}) в словарь
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  Нажмите на любое слово в диалоге, чтобы перевести его.
                </div>
              )}
            </div>
          ) : (
            /* Список сохраненных слов */
            <div className="space-y-2">
              {vocab.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Словарь пока пуст.
                </div>
              ) : (
                vocab.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-start gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-emerald-400">{item.word}</span>
                        <span className="text-xs text-slate-300">— {item.translation}</span>
                      </div>
                      {item.exampleEn && (
                        <div className="text-[11px] text-slate-400">
                          {highlightWordInText(item.exampleEn, item.word)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-600 hover:text-rose-400 text-xs p-1"
                    >
                      🗑
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { VocabItem } from '@/lib/types';
import { storage } from '@/lib/storage';

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  initialContext?: string;
}

export function VocabularyModal({ isOpen, onClose, initialWord = '', initialContext = '' }: VocabularyModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'saved'>('search');
  const [word, setWord] = useState(initialWord);
  const [context, setContext] = useState(initialContext);
  const [translation, setTranslation] = useState('');
  const [pmExample, setPmExample] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedWords, setSavedWords] = useState<VocabItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setWord(initialWord);
      setContext(initialContext);
      setSavedWords(storage.getSavedWords());
      if (initialWord) {
        setActiveTab('search');
        handleTranslate(initialWord, initialContext);
      }
    }
  }, [isOpen, initialWord, initialContext]);

  const handleTranslate = async (wToTranslate: string, cText: string) => {
    if (!wToTranslate.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: wToTranslate, context: cText }),
      });
      const data = await res.json();
      setTranslation(data.translation || 'Перевод не найден');
      setPmExample(data.pmExample || '');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWord = () => {
    if (!word) return;
    const newItem: VocabItem = {
      id: Date.now().toString(),
      word,
      translation,
      context,
      pmExample,
      addedAt: Date.now(),
    };
    storage.saveWord(newItem);
    setSavedWords(storage.getSavedWords());
    setActiveTab('saved');
  };

  const handleRemoveWord = (id: string) => {
    storage.removeWord(id);
    setSavedWords(storage.getSavedWords());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 text-sm text-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 text-lg"
        >
          ✕
        </button>

        {/* Вкладки */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('search')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'search' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔍 Поиск & Анализ
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
              activeTab === 'saved' ? 'bg-emerald-600 font-bold text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            📚 Мой словарь ({savedWords.length})
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Слово / Фраза</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm w-full focus:outline-none focus:border-emerald-500"
                  placeholder="Например, trade-off"
                />
                <button
                  onClick={() => handleTranslate(word, context)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-semibold"
                >
                  Найти
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-xs text-slate-400 italic text-center py-4">Анализ лексики...</div>
            ) : (
              translation && (
                <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-emerald-400 uppercase font-bold block">Перевод</span>
                    <p className="text-slate-200 font-semibold">{translation}</p>
                  </div>
                  {pmExample && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Пример в IT/PM</span>
                      <p className="text-xs text-slate-300 italic">"{pmExample}"</p>
                    </div>
                  )}
                  <button
                    onClick={handleSaveWord}
                    className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs py-2 rounded-xl font-bold transition-all"
                  >
                    ⭐ Сохранить в карточки
                  </button>
                </div>
              )
            )}
          </div>
        ) : (
          /* Вкладка сохраненных карточек */
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {savedWords.length === 0 ? (
              <div className="text-center text-xs text-slate-500 py-6">В словаре пока нет сохраненных слов</div>
            ) : (
              savedWords.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1 relative group">
                  <button
                    onClick={() => handleRemoveWord(item.id)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-rose-400 text-xs"
                  >
                    🗑
                  </button>
                  <div className="font-bold text-emerald-400">{item.word}</div>
                  <div className="text-xs text-slate-200">{item.translation}</div>
                  {item.pmExample && <div className="text-[11px] text-slate-400 italic">"{item.pmExample}"</div>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
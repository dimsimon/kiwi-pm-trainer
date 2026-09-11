'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SCENARIOS as scenarios } from '@/lib/scenarios';
import { Scenario, Message, FeedbackData, HighlightedPhrase } from '@/lib/types';
import AudioRecorder from '@/components/AudioRecorder';
import { speakText, stopSpeech } from '@/lib/speech';
import { storage } from '@/lib/storage';
import { VocabularyModal } from '@/components/VocabularyModal';

interface SingleFeedback {
  corrections?: string[];
  vocabularySuggestions?: { original: string; recommended: string; reason: string }[];
  improvedVersion?: string;
}

export default function HomePage() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState<number | null>(null);

  // Фильтрация категорий
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Скролл вниз
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Модалка словаря
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedContext, setSelectedContext] = useState('');

  // Разбор ошибок по сценарию и по сообщениям
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [singleFeedbacks, setSingleFeedbacks] = useState<Record<number, SingleFeedback>>({});
  const [loadingSingleFeedbackIdx, setLoadingSingleFeedbackIdx] = useState<number | null>(null);

  // Подсказки (Hints)
  const [hints, setHints] = useState<string[]>([]);
  const [isHintLoading, setIsHintLoading] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [draftText, setDraftText] = useState('');

  const categories = ['All', 'Relocation', 'Everyday', 'Social', 'Work'];

  const filteredScenarios = scenarios.filter(
    (s) => selectedCategory === 'All' || s.category === selectedCategory
  );

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setSingleFeedbacks({});
    setHints([]);
    setShowHints(false);
    const saved = storage.getChatHistory(scenario.id);
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      const initial: Message = { role: 'assistant', content: scenario.initialPrompt };
      setMessages([initial]);
      storage.saveChatHistory(scenario.id, [initial]);
    }
  };

  const handleResetChat = () => {
    if (!selectedScenario) return;
    if (confirm('Сбросить историю этого диалога?')) {
      stopSpeech();
      setSpeakingMsgIdx(null);
      const initial: Message = { role: 'assistant', content: selectedScenario.initialPrompt };
      setMessages([initial]);
      storage.saveChatHistory(selectedScenario.id, [initial]);
      setFeedback(null);
      setSingleFeedbacks({});
      setHints([]);
      setShowHints(false);
    }
  };

  const handleToggleSpeech = (text: string, idx: number) => {
    if (speakingMsgIdx === idx) {
      stopSpeech();
      setSpeakingMsgIdx(null);
    } else {
      setSpeakingMsgIdx(idx);
      speakText(text, () => setSpeakingMsgIdx(null));
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!selectedScenario || !text.trim()) return;

    stopSpeech();
    setSpeakingMsgIdx(null);
    setShowHints(false);

    const userMsg: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    storage.saveChatHistory(selectedScenario.id, updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: selectedScenario.description,
          history: messages,
          userMessage: text,
        }),
      });

      const data = await response.json();
      const aiReply = data.reply || "Sorry, I couldn't process that.";

      const finalMessages: Message[] = [...updatedMessages, { role: 'assistant', content: aiReply }];
      setMessages(finalMessages);
      storage.saveChatHistory(selectedScenario.id, finalMessages);

      const newIdx = finalMessages.length - 1;
      setSpeakingMsgIdx(newIdx);
      speakText(aiReply, () => setSpeakingMsgIdx(null));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSingleMessageFeedback = async (msgContent: string, idx: number) => {
    if (!selectedScenario) return;
    setLoadingSingleFeedbackIdx(idx);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single_message',
          scenarioTitle: selectedScenario.title,
          userMessage: msgContent,
        }),
      });
      const data = await res.json();
      setSingleFeedbacks((prev) => ({ ...prev, [idx]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSingleFeedbackIdx(null);
    }
  };

  const handleGetHints = async () => {
    if (!selectedScenario || messages.length === 0) return;
    setIsHintLoading(true);
    setShowHints(true);

    const lastAiMsg = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';

    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle: selectedScenario.title,
          history: messages,
          lastAiMessage: lastAiMsg,
        }),
      });
      const data = await res.json();
      setHints(data.hints || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsHintLoading(false);
    }
  };

  const handleGetFeedback = async () => {
    if (messages.length < 2) return;
    setIsFeedbackLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full_scenario',
          scenarioTitle: selectedScenario?.title,
          history: messages,
        }),
      });
      const data = await res.json();
      setFeedback(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Шапка */}
      <header className="p-4 border-b border-slate-800 flex justify-between items-center max-w-md mx-auto w-full">
        <div>
          <h1 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            Kiwi PM Trainer 🇳🇿
          </h1>
          <p className="text-xs text-slate-400">Relocation & IT PM Voice Simulator</p>
        </div>
        <button
          onClick={() => {
            setSelectedWord('');
            setSelectedContext('');
            setIsVocabOpen(true);
          }}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5"
        >
          📖 Словарь
        </button>
      </header>

      {/* Список сценариев */}
      {!selectedScenario ? (
        <main className="flex-1 p-4 max-w-md mx-auto w-full space-y-3 overflow-y-auto">
          {/* Категории */}
          <div className="space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Выберите тему
            </h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 border-emerald-500 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat === 'All' ? 'Все' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Карточки */}
          <div className="space-y-3 pt-1">
            {filteredScenarios.map((scenario) => {
              const hasHistory = storage.getChatHistory(scenario.id).length > 1;
              return (
                <div
                  key={scenario.id}
                  onClick={() => handleSelectScenario(scenario)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block mb-0.5">
                        {scenario.category}
                      </span>
                      <h3 className="font-bold text-base text-slate-100">{scenario.title}</h3>
                    </div>
                    {hasHistory && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/50">
                        В процессе
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">{scenario.description}</p>
                </div>
              );
            })}
          </div>
        </main>
      ) : (
        /* Экран активного чата */
        <main className="flex-1 max-w-md mx-auto w-full flex flex-col p-4 relative overflow-hidden">
          <div className="flex justify-between items-center mb-2 text-xs">
            <button
              onClick={() => {
                stopSpeech();
                setSelectedScenario(null);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              ← Все сценарии
            </button>
            <button
              onClick={handleResetChat}
              className="text-rose-400/80 hover:text-rose-400 bg-rose-950/30 px-2.5 py-1 rounded-lg border border-rose-900/40"
            >
              🔄 Начать заново
            </button>
          </div>

          <h2 className="text-sm font-bold text-slate-200 mb-2">{selectedScenario.title}</h2>

          {/* Диалог */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3 scroll-smooth"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-900/60 text-emerald-100 border border-emerald-700/50'
                      : 'bg-slate-900 text-slate-200 border border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2 mb-1.5">
                    <span className="font-bold text-xs opacity-60">
                      {msg.role === 'assistant' ? 'AI Partner' : 'You'}
                    </span>
                    {msg.role === 'assistant' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleSpeech(msg.content || '', idx)}
                        className={`text-xs flex items-center gap-1 font-medium ${
                          speakingMsgIdx === idx
                            ? 'text-rose-400 animate-pulse'
                            : 'text-slate-400 hover:text-emerald-400'
                        }`}
                      >
                        {speakingMsgIdx === idx ? '⏹ Стоп' : '🔊 Прослушать'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSingleMessageFeedback(msg.content || '', idx)}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 bg-slate-950/50 px-2 py-0.5 rounded border border-emerald-800/40"
                      >
                        {loadingSingleFeedbackIdx === idx ? 'Анализ...' : '✨ Анализ'}
                      </button>
                    )}
                  </div>

                  {/* Кликабельные слова */}
                  <p className="flex flex-wrap gap-x-1 gap-y-0.5">
                    {(msg.content || '').split(' ').map((w: string, wIdx: number) => (
                      <span
                        key={wIdx}
                        onClick={() => {
                          const cleanWord = w.replace(/^[^\w]+|[^\w]+$/g, '');
                          if (cleanWord) {
                            setSelectedWord(cleanWord);
                            setSelectedContext(msg.content || '');
                            setIsVocabOpen(true);
                          }
                        }}
                        className="cursor-pointer hover:bg-slate-800 hover:text-emerald-300 rounded px-0.5 transition-colors active:bg-emerald-800/50"
                      >
                        {w}
                      </span>
                    ))}
                  </p>
                </div>

                {/* Карточка мгновенного фидбека для конкретного сообщения */}
                {singleFeedbacks[idx] && (
                  <div className="mt-1.5 max-w-[88%] bg-slate-900 border border-emerald-800/50 rounded-xl p-3 text-xs space-y-2">
                    {singleFeedbacks[idx].improvedVersion && (
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold">Улучшенная версия:</div>
                        <div className="text-emerald-300">{singleFeedbacks[idx].improvedVersion}</div>
                      </div>
                    )}
                    {singleFeedbacks[idx].vocabularySuggestions && singleFeedbacks[idx].vocabularySuggestions!.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-slate-400 font-semibold">PM лексика:</div>
                        {singleFeedbacks[idx].vocabularySuggestions!.map((item, vIdx) => (
                          <div key={vIdx} className="text-[11px] text-slate-300 bg-slate-950/60 p-1.5 rounded">
                            <span className="line-through text-rose-400">{item.original}</span> →{' '}
                            <span className="font-bold text-emerald-400">{item.recommended}</span>
                            <div className="text-[10px] text-slate-400">{item.reason}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="p-3 rounded-xl text-xs max-w-[85%] bg-slate-900 border border-slate-800 text-slate-400 italic">
                Kiwi ИИ генерирует ответ...
              </div>
            )}
          </div>

          {/* Плавающая кнопка скролла вниз */}
          {showScrollBottom && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-24 right-6 bg-emerald-600 hover:bg-emerald-500 text-white p-2.5 rounded-full shadow-lg transition-all animate-bounce z-20"
              title="Спуститься вниз"
            >
              ↓
            </button>
          )}

          {/* Подсказки (Hint Dropdown) */}
          {showHints && (
            <div className="mb-2 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-semibold text-emerald-400">💡 Идеи ответов (PM Hints):</span>
                <button onClick={() => setShowHints(false)} className="hover:text-slate-200">✕</button>
              </div>
              {isHintLoading ? (
                <div className="text-slate-500 italic">Генерация вариантов...</div>
              ) : (
                <div className="space-y-1.5">
                  {hints.map((hint, hIdx) => (
                    <button
                      key={hIdx}
                      onClick={() => {
                        setDraftText(hint);
                        setShowHints(false);
                      }}
                      className="w-full text-left bg-slate-950 hover:bg-emerald-950/40 p-2 rounded-lg border border-slate-800 text-slate-200 transition-colors"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Панель управляющих кнопок */}
          <div className="mb-2 flex justify-between items-center text-xs">
            <button
              onClick={handleGetHints}
              className="bg-slate-900 hover:bg-slate-800 text-amber-400 px-3 py-1.5 rounded-xl border border-slate-800 font-medium flex items-center gap-1"
            >
              💡 Подсказка
            </button>
            <button
              onClick={handleGetFeedback}
              disabled={isFeedbackLoading || messages.length < 2}
              className="bg-slate-900 hover:bg-slate-800 text-emerald-400 px-3 py-1.5 rounded-xl border border-slate-800 disabled:opacity-50 font-medium"
            >
              {isFeedbackLoading ? 'Анализ...' : '📊 Отчет по сценарию'}
            </button>
          </div>

          {/* Разбор ошибок всего сценария */}
          {feedback && (
            <div className="mb-3 p-3 bg-slate-900 border border-emerald-800/60 rounded-2xl space-y-3 text-xs max-h-52 overflow-y-auto">
              <div className="font-bold text-emerald-400 flex justify-between items-center">
                <span>📊 Итоговый отчет сценария</span>
              </div>
              {feedback.overallFeedback && (
                <p className="text-slate-300 leading-relaxed">{feedback.overallFeedback}</p>
              )}
            </div>
          )}

          {/* Запись аудио и подстановка draftText */}
          <div className="mt-auto pt-2 border-t border-slate-800">
            <AudioRecorder
              onSendMessage={handleSendMessage}
              initialText={draftText}
              autoSubmitTimeout={2000}
            />
          </div>
        </main>
      )}

      {/* Модальное окно словаря */}
      <VocabularyModal
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
        initialWord={selectedWord}
        initialContext={selectedContext}
      />
    </div>
  );
}
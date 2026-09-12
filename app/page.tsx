'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SCENARIOS } from '@/lib/scenarios';
import { Scenario, Message, FeedbackData } from '@/lib/types';
import { storage } from '@/lib/storage';
import { VocabularyModal } from '@/components/VocabularyModal';

export default function Home() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Feedback & Hints states
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [singleMessageFeedback, setSingleMessageFeedback] = useState<any>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [isHintsLoading, setIsHintsLoading] = useState(false);

  // Vocabulary Modal state
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedWordContext, setSelectedWordContext] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const categories = ['All', 'Relocation', 'Everyday', 'Social', 'Work', 'Interview'];

  const filteredScenarios = selectedCategory === 'All'
    ? SCENARIOS
    : SCENARIOS.filter((s) => s.category === selectedCategory);

  // Синхронизация истории при выборе нового сценария
  useEffect(() => {
    const history = storage.getChatHistory(selectedScenario.id);
    if (history.length > 0) {
      setMessages(history);
    } else {
      const startText = selectedScenario.initialPrompt || selectedScenario.initialMessage || selectedScenario.systemPrompt || selectedScenario.description;
      const initialMsgs: Message[] = [
        { role: 'assistant', content: startText }
      ];
      setMessages(initialMsgs);
      storage.saveChatHistory(selectedScenario.id, initialMsgs);
    }
    setFeedback(null);
    setSingleMessageFeedback(null);
    setHints([]);
  }, [selectedScenario]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, singleMessageFeedback]);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setIsSidebarOpen(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);
    setSingleMessageFeedback(null);

    try {
      const systemPrompt = selectedScenario.systemPrompt || selectedScenario.initialPrompt || selectedScenario.description;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt,
          history: newMessages.slice(0, -1),
          userMessage: text,
        }),
      });

      const data = await res.json();
      if (data.reply) {
        const updatedMsgs: Message[] = [...newMessages, { role: 'assistant', content: data.reply }];
        setMessages(updatedMsgs);
        storage.saveChatHistory(selectedScenario.id, updatedMsgs);
      }
    } catch (err) {
      console.error('Chat Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeLastMessage = async () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    setIsFeedbackLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'single_message',
          userMessage: lastUserMsg.content,
          scenarioTitle: selectedScenario.title,
        }),
      });
      const data = await res.json();
      setSingleMessageFeedback(data);
    } catch (err) {
      console.error('Single Feedback Error:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const handleGetFullFeedback = async () => {
    if (messages.length < 2) return;
    setIsFeedbackLoading(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'full_scenario',
          scenarioTitle: selectedScenario.title,
          history: messages,
          isStarMode: selectedScenario.isStarMode,
        }),
      });
      const data = await res.json();
      setFeedback(data);
    } catch (err) {
      console.error('Full Feedback Error:', err);
    } finally {
      setIsFeedbackLoading(false);
    }
  };

  const handleGetHints = async () => {
    setIsHintsLoading(true);
    try {
      const res = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioTitle: selectedScenario.title,
          history: messages,
        }),
      });
      const data = await res.json();
      setHints(data.hints || []);
    } catch (err) {
      console.error('Hint Error:', err);
    } finally {
      setIsHintsLoading(false);
    }
  };

  const handleOpenDictForWord = (word: string, contextText: string) => {
    setSelectedWord(word);
    setSelectedWordContext(contextText);
    setIsVocabOpen(true);
  };

  return (
    <main className="flex h-[100dvh] bg-slate-950 text-slate-100 font-sans overflow-hidden relative">
      {/* Боковая панель */}
      <aside
        className={`fixed md:relative z-50 inset-y-0 left-0 w-80 bg-slate-900 border-r border-slate-800 flex flex-col p-4 space-y-4 transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
            🥝 Kiwi PM Trainer
          </h1>
          <button
            onClick={() => {
              setSelectedWord('');
              setSelectedWordContext('');
              setIsVocabOpen(true);
            }}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-all"
          >
            📚 Словарь
          </button>
        </div>

        {/* Категории */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Список сценариев */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredScenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelectScenario(s)}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                selectedScenario.id === s.id
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-xs text-slate-200">{s.title}</span>
                {s.isStarMode && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                    STAR
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2">{s.description}</p>
            </div>
          ))}
        </div>
      </aside>

      {/* Оверлей мобильного меню */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
        />
      )}

      {/* Основной чат */}
      <section className="flex-1 flex flex-col bg-slate-950 min-w-0 h-full">
        {/* Шапка */}
        <header className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/30">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              ☰
            </button>
            <div className="truncate">
              <h2 className="font-bold text-sm text-slate-100 truncate">{selectedScenario.title}</h2>
              <p className="text-xs text-slate-400 truncate">{selectedScenario.description}</p>
            </div>
          </div>
          <button
            onClick={handleGetFullFeedback}
            disabled={isFeedbackLoading || messages.length < 2}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ml-2"
          >
            {isFeedbackLoading ? 'Анализ...' : '📊 Итоговый отчёт'}
          </button>
        </header>

        {/* Область диалога */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Итоговый отчёт сценария */}
          {feedback && (
            <div className="p-4 bg-slate-900 border border-emerald-800/60 rounded-2xl space-y-3 text-xs max-h-72 overflow-y-auto">
              <div className="font-bold text-emerald-400 flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-sm">📊 Итоговый отчёт сценария</span>
                {feedback.starFeedback?.score !== undefined && (
                  <span className="bg-emerald-950 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-800/80">
                    STAR Score: {feedback.starFeedback.score}/100
                  </span>
                )}
              </div>

              {feedback.starFeedback ? (
                <div className="space-y-2.5 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">Situation (Ситуация)</strong>
                    <p className="text-slate-300">{feedback.starFeedback.situation}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">Task (Задача)</strong>
                    <p className="text-slate-300">{feedback.starFeedback.task}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">Action (Действия PM)</strong>
                    <p className="text-slate-300">{feedback.starFeedback.action}</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <strong className="text-amber-400 block mb-0.5">Result (Результат)</strong>
                    <p className="text-slate-300">{feedback.starFeedback.result}</p>
                  </div>
                  
                  {feedback.starFeedback.recommendation && (
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-200 mt-2">
                      💡 <strong>Рекомендация:</strong> {feedback.starFeedback.recommendation}
                    </div>
                  )}
                </div>
              ) : (
                ((feedback as any).overallFeedback || (feedback as any).summary) && (
                  <p className="text-slate-300 leading-relaxed">
                    {(feedback as any).overallFeedback || (feedback as any).summary}
                  </p>
                )
              )}
            </div>
          )}

          {/* Сообщения */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
              
              {msg.role === 'user' && idx === messages.length - 1 && (
                <button
                  onClick={handleAnalyzeLastMessage}
                  disabled={isFeedbackLoading}
                  className="mt-1 text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                >
                  ⚡ Разбор фразы
                </button>
              )}
            </div>
          ))}

          {/* Оверлей разбора сообщения */}
          {singleMessageFeedback && (
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-200">
              <div className="font-semibold text-emerald-400">✨ Улучшенная версия:</div>
              <p className="text-slate-300 italic">"{singleMessageFeedback.improvedVersion}"</p>
              
              {singleMessageFeedback.vocabularySuggestions?.length > 0 && (
                <div className="pt-2 border-t border-slate-800 space-y-1">
                  <div className="text-[11px] text-slate-400 font-bold">PM Лексика:</div>
                  {singleMessageFeedback.vocabularySuggestions.map((v: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-[11px]">
                      <span>
                        <strong className="text-rose-400 line-through mr-1">{v.original}</strong> →{' '}
                        <strong className="text-emerald-400">{v.recommended}</strong>
                      </span>
                      <button
                        onClick={() => handleOpenDictForWord(v.recommended, singleMessageFeedback.improvedVersion)}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300"
                      >
                        + В словарь
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hints */}
          {hints.length > 0 && (
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-amber-400">💡 Идеи ответов (PM Hints):</div>
              {hints.map((hint, hIdx) => (
                <div
                  key={hIdx}
                  onClick={() => handleSendMessage(hint)}
                  className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-lg cursor-pointer text-slate-300 transition-all text-[11px]"
                >
                  {hint}
                </div>
              ))}
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Форма ввода */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/40 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleGetHints}
              disabled={isHintsLoading}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1"
            >
              💡 Подсказка
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Напишите ответ..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500 text-slate-100 min-w-0"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all"
            >
              Отправить
            </button>
          </div>
        </div>
      </section>

      {/* Словарь */}
      <VocabularyModal
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
        initialWord={selectedWord}
        initialContext={selectedWordContext}
      />
    </main>
  );
}
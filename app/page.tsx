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
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const handleToggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Голосовой ввод не поддерживается вашим браузером');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage((prev: string) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognitionRef.current = recognition;
    recognition.start();
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
    <main className="fixed inset-0 h-dvh w-full bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden select-none">
      {/* Drawer Menu */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[85%] max-w-sm bg-slate-900 border-r border-slate-800 flex flex-col p-5 space-y-4 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg text-emerald-400 flex items-center gap-2">
            🥝 Kiwi Trainer
          </h1>
          <button
            onClick={() => {
              setSelectedWord('');
              setSelectedWordContext('');
              setIsVocabOpen(true);
            }}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl border border-slate-700 active:scale-95 transition-all"
          >
            📚 Словарь
          </button>
        </div>

        {/* Категории */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Список сценариев */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredScenarios.map((s) => (
            <div
              key={s.id}
              onClick={() => handleSelectScenario(s)}
              className={`p-3.5 rounded-2xl cursor-pointer border transition-all ${
                selectedScenario.id === s.id
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
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

      {/* Оверлей меню */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/70 z-40 transition-opacity"
        />
      )}

      {/* iOS Header */}
      <header className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80 backdrop-blur-md shrink-0">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 active:scale-95 transition-transform flex items-center justify-center text-lg"
        >
          ☰
        </button>

        <div className="flex-1 text-center px-3 truncate">
          <h2 className="font-bold text-sm text-slate-100 truncate">{selectedScenario.title}</h2>
          <p className="text-[11px] text-slate-400 truncate">{selectedScenario.category}</p>
        </div>

        <button
          onClick={handleGetFullFeedback}
          disabled={isFeedbackLoading || messages.length < 2}
          className="w-10 h-10 bg-emerald-600 disabled:opacity-40 text-white rounded-xl active:scale-95 transition-transform flex items-center justify-center text-base"
          title="Итоговый отчёт"
        >
          {isFeedbackLoading ? '⌛' : '📊'}
        </button>
      </header>

      {/* Диалоговая зона */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Итоговый отчёт */}
        {feedback && (
          <div className="p-4 bg-slate-900 border border-emerald-800/60 rounded-2xl space-y-3 text-xs">
            <div className="font-bold text-emerald-400 flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-sm">📊 Итоговый отчёт</span>
              {feedback.starFeedback?.score !== undefined && (
                <span className="bg-emerald-950 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-800/80">
                  STAR: {feedback.starFeedback.score}/100
                </span>
              )}
            </div>

            {feedback.starFeedback ? (
              <div className="space-y-2.5 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <strong className="text-amber-400 block mb-0.5">Situation</strong>
                  <p className="text-slate-300">{feedback.starFeedback.situation}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <strong className="text-amber-400 block mb-0.5">Task</strong>
                  <p className="text-slate-300">{feedback.starFeedback.task}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <strong className="text-amber-400 block mb-0.5">Action</strong>
                  <p className="text-slate-300">{feedback.starFeedback.action}</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <strong className="text-amber-400 block mb-0.5">Result</strong>
                  <p className="text-slate-300">{feedback.starFeedback.result}</p>
                </div>
              </div>
            ) : (
              ((feedback as any).overallFeedback || (feedback as any).summary) && (
                <p className="text-slate-300 leading-relaxed text-sm">
                  {(feedback as any).overallFeedback || (feedback as any).summary}
                </p>
              )
            )}
          </div>
        )}

        {/* Сообщения (Бабблы) */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-xs'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
              }`}
            >
              {msg.content}
            </div>

            {msg.role === 'user' && idx === messages.length - 1 && (
              <button
                onClick={handleAnalyzeLastMessage}
                disabled={isFeedbackLoading}
                className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1 active:opacity-70 font-medium"
              >
                ⚡ Разбор фразы
              </button>
            )}
          </div>
        ))}

        {/* Разбор последнего сообщения */}
        {singleMessageFeedback && (
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="font-semibold text-emerald-400">✨ Улучшенная версия:</div>
            <p className="text-slate-300 italic text-sm">"{singleMessageFeedback.improvedVersion}"</p>

            {singleMessageFeedback.vocabularySuggestions?.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Лексика:</div>
                {singleMessageFeedback.vocabularySuggestions.map((v: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span>
                      <strong className="text-rose-400 line-through mr-1">{v.original}</strong> →{' '}
                      <strong className="text-emerald-400">{v.recommended}</strong>
                    </span>
                    <button
                      onClick={() => handleOpenDictForWord(v.recommended, singleMessageFeedback.improvedVersion)}
                      className="text-[11px] bg-slate-800 px-2.5 py-1 rounded-lg text-slate-300 active:scale-95"
                    >
                      + В словарь
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Подсказки */}
        {hints.length > 0 && (
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2 text-xs">
            <div className="font-bold text-amber-400">💡 Подсказки:</div>
            {hints.map((hint, hIdx) => (
              <div
                key={hIdx}
                onClick={() => handleSendMessage(hint)}
                className="p-3 bg-slate-950 active:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs leading-snug"
              >
                {hint}
              </div>
            ))}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Bottom Action Bar (iPhone 17 Pro Max Safe Zone) */}
      <footer className="p-3.5 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0 pb-8">
        <div className="flex gap-2.5 items-center">
          {/* Подсказка */}
          <button
            onClick={handleGetHints}
            disabled={isHintsLoading}
            className="w-11 h-11 bg-slate-800 active:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 flex items-center justify-center shrink-0 text-lg active:scale-95 transition-transform"
          >
            💡
          </button>

          {/* Голос */}
          <button
            onClick={handleToggleVoice}
            className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 text-lg active:scale-95 transition-transform ${
              isListening
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800 active:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            🎤
          </button>

          {/* Инпут */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isListening ? 'Слушаю...' : 'Напишите ответ...'}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 h-11 text-base focus:outline-none focus:border-emerald-500 text-slate-100 min-w-0"
          />

          {/* Отправить */}
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !inputMessage.trim()}
            className="w-11 h-11 bg-emerald-600 active:bg-emerald-500 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center shrink-0 text-lg font-bold active:scale-95 transition-transform"
          >
            ➔
          </button>
        </div>
      </footer>

      {/* Модалка словаря */}
      <VocabularyModal
        isOpen={isVocabOpen}
        onClose={() => setIsVocabOpen(false)}
        initialWord={selectedWord}
        initialContext={selectedWordContext}
      />
    </main>
  );
}
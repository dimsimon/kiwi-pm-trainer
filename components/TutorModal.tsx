'use client';

import React, { useState, useEffect, useRef } from 'react';

interface TutorMessage {
  sender: 'user' | 'tutor';
  text: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onWordClick: (word: string, context: string) => void;
}

const STORAGE_KEY = 'kiwi_tutor_chat_history';

export function TutorModal({ isOpen, onClose, onWordClick }: Props) {
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setMessages([
        {
          sender: 'tutor',
          text: "Kia ora! I'm your AI Language & PM Tutor. Ask me anything about English phrases, grammar, Kiwi slang, or how to say something properly in a workplace context!",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: TutorMessage = { sender: 'user', text: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are an expert English Language Tutor and IT Mentor specializing in New Zealand English (Kiwi slang), IT Project Management terminology, and professional relocation advice. Help the user with translation, grammar explanations, alternative phrasing, and vocabulary breakdown. Keep responses direct, friendly, concise, and helpful.`,
          history: updated.map((m) => ({
            sender: m.sender === 'user' ? 'user' : 'ai',
            text: m.text,
          })),
          userMessage: userMsg.text,
        }),
      });

      const data = await res.json();
      setMessages([...updated, { sender: 'tutor', text: data.reply || 'Sorry, I got stuck.' }]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (confirm('Очистить историю общения с AI Tutor?')) {
      const initial: TutorMessage[] = [
        {
          sender: 'tutor',
          text: "Kia ora! Ask me anything about grammar, translation, or Kiwi phrases!",
        },
      ];
      setMessages(initial);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Шапка */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div>
            <h3 className="font-bold text-slate-100 flex items-center gap-2 text-sm sm:text-base">
              🤖 AI Tutor & Assistant
            </h3>
            <p className="text-[11px] text-slate-400">
              Вопросы по грамматике, переводу и Kiwi-сленгу
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 rounded"
              title="Очистить чат"
            >
              🗑
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 text-lg font-bold px-2"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Чат */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl p-3 text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-emerald-900/60 text-emerald-100 border border-emerald-700/50'
                    : 'bg-slate-950 text-slate-200 border border-slate-800'
                }`}
              >
                <div className="font-bold text-[10px] text-slate-400 mb-1">
                  {msg.sender === 'user' ? 'You' : 'AI Tutor'}
                </div>
                {/* Кликабельные слова во всех ответах */}
                <div className="flex flex-wrap gap-x-1 gap-y-0.5">
                  {msg.text.split(' ').map((word, wIdx) => {
                    const clean = word.replace(/^[^\w]+|[^\w]+$/g, '');
                    return (
                      <span
                        key={wIdx}
                        onClick={() => clean && onWordClick(clean, msg.text)}
                        className="cursor-pointer hover:bg-slate-800 hover:text-emerald-300 rounded px-0.5 transition-colors"
                        title="Нажмите, чтобы сохранить слово в словарь"
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-xs text-slate-400 italic bg-slate-950 p-2 rounded-xl border border-slate-800">
              AI Tutor печатает ответ...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Форма ввода */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите перевод, правило или 'Как сказать...?'"
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs px-4 py-2 rounded-xl font-bold"
          >
            Отправить
          </button>
        </form>
      </div>
    </div>
  );
}
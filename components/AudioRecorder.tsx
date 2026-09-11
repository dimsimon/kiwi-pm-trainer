'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AudioRecorderProps {
  onSendMessage: (text: string) => void;
  initialText?: string;
  autoSubmitTimeout?: number;
}

export default function AudioRecorder({
  onSendMessage,
  initialText = '',
  autoSubmitTimeout = 2000,
}: AudioRecorderProps) {
  const [text, setText] = useState(initialText);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText(transcript);

        // Перезапускаем таймер авто-отправки при речи
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (transcript.trim()) {
            stopRecording();
            onSendMessage(transcript.trim());
            setText('');
          }
        }, autoSubmitTimeout);
      };

      recognitionRef.current.onerror = (err: any) => {
        console.error('Speech Recognition Error:', err);
        setIsRecording(false);
      };
    }
  }, [autoSubmitTimeout, onSendMessage]);

  const startRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
      if (isRecording) stopRecording();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-3 rounded-2xl transition-all ${
          isRecording
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
        }`}
        title={isRecording ? 'Остановить запись' : 'Начать голосовой ввод'}
      >
        {isRecording ? '⏹' : '🎙️'}
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Напишите или наговорите ответ..."
        className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
      />

      <button
        type="submit"
        disabled={!text.trim()}
        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white p-3 rounded-2xl font-bold transition-all"
      >
        ➔
      </button>
    </form>
  );
}
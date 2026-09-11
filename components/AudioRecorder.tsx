'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Props {
  onSendMessage: (text: string) => void;
}

export default function AudioRecorder({ onSendMessage }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [interimText, setInterimText] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Инициализация браузерного Web Speech API для мгновенного отклика
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setInterimText(currentText);
      };

      recognition.onerror = (e: any) => {
        console.warn('SpeechRecognition fallback to server:', e.error);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startRecording = async () => {
    setInterimText('');
    setInputText('');

    // Попытка запуска быстрого браузерного распознавания
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        return;
      } catch (e) {
        console.warn('Browser speech recognition failed, falling back to MediaRecorder', e);
      }
    }

    // Запасной серверный вариант (MediaRecorder)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || 'audio/webm',
        });
        stream.getTracks().forEach((track) => track.stop());
        await processAudioServer(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Нет доступа к микрофону.');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (interimText.trim()) {
        onSendMessage(interimText.trim());
        setInterimText('');
      }
      return;
    }

    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudioServer = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'rec.webm');

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        onSendMessage(data.text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="space-y-2">
      {/* Живой текст при записи */}
      {interimText && (
        <div className="text-xs text-emerald-400 italic bg-slate-900 p-2 rounded-xl border border-slate-800 animate-pulse">
          🗣 {interimText}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`flex-1 py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isRecording
              ? 'bg-rose-600 animate-pulse text-white'
              : isProcessing
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isProcessing
            ? '⏳ Расшифровка...'
            : isRecording
            ? '⏹ Завершить запись'
            : '🎙 Нажмите и говорите'}
        </button>
      </div>

      <form onSubmit={handleTextSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Или введите текст..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          className="bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700"
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
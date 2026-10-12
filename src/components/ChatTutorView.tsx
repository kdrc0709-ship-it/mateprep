import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const ChatTutorView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const typewriterIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
      }
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : input).trim();
    if (!text || isLoading) return;

    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }

    if (textToSend === undefined) {
      setInput('');
    }
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMessageId = Date.now().toString();
    const assistantMessageId = (Date.now() + 1).toString();

    const newMessages: Message[] = [
      ...messages,
      { id: userMessageId, sender: 'user', text, timestamp: new Date() },
      { id: assistantMessageId, sender: 'assistant', text: '', timestamp: new Date() }
    ];

    setMessages(newMessages);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ 
        apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: text,
      });

      const fullReply = response.text || '¡Hola! ¿En qué te puedo ayudar hoy?';

      let currentIdx = 0;
      const chunkSize = fullReply.length > 300 ? 12 : 6;
      typewriterIntervalRef.current = window.setInterval(() => {
        currentIdx += chunkSize;
        const currentSlice = fullReply.slice(0, currentIdx);

        setMessages((prev) => 
          prev.map((m) => 
            m.id === assistantMessageId ? { ...m, text: currentSlice } : m
          )
        );

        if (currentIdx >= fullReply.length) {
          if (typewriterIntervalRef.current) {
            clearInterval(typewriterIntervalRef.current);
            typewriterIntervalRef.current = null;
          }
          setIsLoading(false);
        }
      }, 20);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        return;
      }
      console.error("Error al conectar con Gemini:", err);
      
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, text: 'Lo siento, hubo un problema temporal al procesar tu solicitud.' }
            : m
        )
      );
      setIsLoading(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg ${
              m.sender === 'user'
                ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                : 'bg-gray-700 text-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-700 resize-none"
          rows={1}
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
    </div>
  );
};

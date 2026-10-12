import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Camera,
  X,
  Sparkles,
  Plus,
  Square,
  Lightbulb,
  CheckCircle2,
  PenTool,
  HelpCircle,
  Pause,
} from 'lucide-react';
import { MathText } from '../utils/katexRenderer';
import { MathSymbolBar } from './MathSymbolBar';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
  mimeType?: string;
  timestamp: string;
  isPaused?: boolean;
}

interface ChatTutorViewProps {
  onOpenScratchpad: () => void;
  presetText?: string;
}

const STARTER_PROMPTS = [
  '¡Hola profe! ¿Cómo estás?',
  '¿Cómo resuelvo 2x² + 5x - 3 = 0 paso a paso?',
  'Explícame las leyes de Newton con ejemplos cotidianos',
  'Ayúdame con el límite de (x² - 4)/(x - 2) cuando x tiende a 2',
  '¿Cuáles son las fases de la división celular (mitosis y meiosis)?',
  'Dame consejos para preparar mi examen de admisión',
];

const INITIAL_WELCOME_TEXT = `¡Hola! Soy tu **Tutor y Asistente de MatePrep** 🎓.\n\nEstoy aquí para ayudarte con **todo lo que necesites**:
- 📐 **Matemáticas a fondo:** Álgebra, Geometría, Trigonometría, Geometría Analítica, Cálculo y Probabilidad.
- 🔬 **Ciencias & Humanidades:** Física, Química, Biología, Historia, Literatura, Filosofía, Programación y Computación.
- 💡 **Exámenes y dudas diarias:** Consejos para CENEVAL EXANI-II, UNAM, IPN o cualquier curiosidad cotidiana.

✨ **Metodología:** Si me pides resolver un ejercicio matemático o subes una foto, te guiaré **paso a paso** para que aprendas el porqué de cada procedimiento. Si solo quieres platicar, saludar o preguntar algo de otra materia, ¡te responderé con todo gusto!

¿Qué tema, ejercicio o duda quieres ver hoy?`;

export const ChatTutorView: React.FC<ChatTutorViewProps> = ({
  onOpenScratchpad,
  presetText,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: INITIAL_WELCOME_TEXT,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputText, setInputText] = useState(presetText || '');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedMime, setAttachedMime] = useState<string>('image/jpeg');
  const [isLoading, setIsLoading] = useState(false);
  const [showSymbolBar, setShowSymbolBar] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const typewriterIntervalRef = useRef<number | null>(null);

  // Auto-scroll ONLY inside the chat container element (never scrolls the outer window or page)
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // If presetText changes, insert it in input
  useEffect(() => {
    if (presetText) {
      setInputText(presetText);
      textareaRef.current?.focus();
    }
  }, [presetText]);

  // Fast client-side image compression to speed up network transfer & AI processing
  const compressImageFile = (file: File): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const rawBase64 = ev.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1200;
          let width = img.width;
          let height = img.height;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            resolve({ base64: compressed, mimeType: 'image/jpeg' });
            return;
          }
          resolve({ base64: rawBase64, mimeType: file.type || 'image/jpeg' });
        };
        img.onerror = () => resolve({ base64: rawBase64, mimeType: file.type || 'image/jpeg' });
        img.src = rawBase64;
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle file select
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }

    const { base64, mimeType } = await compressImageFile(file);
    setAttachedImage(base64);
    setAttachedMime(mimeType);
  };

  // Clipboard paste support for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const { base64, mimeType } = await compressImageFile(file);
            setAttachedImage(base64);
            setAttachedMime(mimeType);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Stop / Pause generation
  const handlePauseGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }
    setIsLoading(false);
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role === 'assistant') {
        return [
          ...prev.slice(0, -1),
          { ...last, isPaused: true, text: last.text || '(Respuesta pausada)' },
        ];
      }
      return prev;
    });
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text && !attachedImage) return;

    // Abort previous generation if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (typewriterIntervalRef.current) {
      clearInterval(typewriterIntervalRef.current);
      typewriterIntervalRef.current = null;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: text,
      imageBase64: attachedImage || undefined,
      mimeType: attachedImage ? attachedMime : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Prepare assistant placeholder message
    const assistantMessageId = `msg-ai-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedHistory = [...messages, userMessage];
    setMessages([...updatedHistory, assistantPlaceholder]);

    setInputText('');
    const currentImg = attachedImage;
    const currentMime = attachedMime;
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/math/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          messages: updatedHistory.slice(-7, -1), // Recent context only for speed
          currentInput: text,
          imageBase64: currentImg,
          mimeType: currentMime,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error de conexión con el tutor.');
      }

      const data = await response.json();
      const fullReply = data.reply || '¡Hola! ¿En qué te puedo ayudar hoy?';

      // Typewriter progressive reveal (fast & smooth)
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
        // Paused by user
        return;
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? {
                ...m,
                text: 'Lo siento, hubo un problema temporal al procesar tu solicitud. Por favor intenta enviarla de nuevo.',
              }
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

  const handleInsertSymbol = (symbol: string) => {
    setInputText((prev) => prev + symbol);
    textareaRef.current?.focus();
  };

  // Start new chat session
  const handleStartNewChat = () => {
    if (isLoading) {
      handlePauseGeneration();
    }
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'assistant',
        text: `¡Nuevo chat iniciado! 🎓\n\nPuedes preguntarme **cualquier tipo de pregunta** (matemáticas, física, química, historia, programación o consejos) o subir una foto. ¿Qué te gustaría aprender o resolver?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setAttachedImage(null);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Chat Header */}
      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/80 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                MatePrep • Tutor IA
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0">
                Bachillerato
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              Matemáticas • Ciencias • Preparatoria • Exámenes
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleStartNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-bold border border-indigo-200/80 dark:border-indigo-800/80 transition-colors cursor-pointer shadow-2xs"
            title="Iniciar un nuevo chat desde cero"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo chat</span>
          </button>

          {/* Scratchpad Button */}
          <button
            type="button"
            onClick={onOpenScratchpad}
            title="Abrir pizarra de borrador"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">Pizarra</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs space-y-2 ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-750'
                }`}
              >
                {/* Attached image if any */}
                {msg.imageBase64 && (
                  <div className="rounded-xl overflow-hidden max-h-64 bg-black/10">
                    <img
                      src={msg.imageBase64}
                      alt="Imagen enviada"
                      className="w-full h-auto object-contain max-h-64"
                    />
                  </div>
                )}

                {/* Text Content with KaTeX */}
                {msg.text ? (
                  <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : ''}`}>
                    <MathText
                      content={msg.text}
                      className={isUser ? '[&_*]:text-white!' : ''}
                    />
                  </div>
                ) : (
                  isLoading && !isUser && (
                    <div className="flex items-center gap-2 py-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                      <span>El tutor está preparando tu respuesta...</span>
                    </div>
                  )
                )}

                {/* Paused indicator */}
                {msg.isPaused && (
                  <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 pt-1">
                    <Pause className="w-3 h-3" />
                    <span>Respuesta pausada</span>
                  </div>
                )}

                <div
                  className={`text-[10px] text-right font-medium ${
                    isUser ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>

                {/* Pedagogical quick action chips below AI answers */}
                {!isUser && msg.id !== 'msg-welcome' && msg.text && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('¿Me puedes dar una pista para resolver esto?')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-600 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-600"
                    >
                      <Lightbulb className="w-3 h-3 text-amber-500" />
                      <span>Pista</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('¿Por qué funciona esto? Explícame el concepto con una analogía.')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-600 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-600"
                    >
                      <HelpCircle className="w-3 h-3 text-indigo-500" />
                      <span>¿Por qué funciona?</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Ya intenté resolverlo, por favor muéstrame el procedimiento formal completo y la comprobación.')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-slate-600 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-600"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>Ver solución & comprobación</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Starter Topics (visible when only 1 message) */}
      {messages.length === 1 && (
        <div className="px-5 py-2.5 bg-slate-50/50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Sugerencias rápidas:
            </span>
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition-colors cursor-pointer shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attached Image Preview Bar */}
      {attachedImage && (
        <div className="px-5 py-2 bg-indigo-50 dark:bg-indigo-950/40 border-t border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={attachedImage}
              alt="Foto adjunta"
              className="w-12 h-12 object-cover rounded-lg border border-indigo-300 dark:border-indigo-700"
            />
            <div className="text-xs">
              <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                Foto adjunta
              </span>
              <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                La IA analizará el problema al enviar tu mensaje.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="p-1.5 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 cursor-pointer"
            title="Quitar foto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsible Math Symbol Bar */}
      {showSymbolBar && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <MathSymbolBar onInsert={handleInsertSymbol} />
        </div>
      )}

      {/* Floating Pause / Stop Button when generating */}
      {isLoading && (
        <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-center animate-in fade-in">
          <button
            type="button"
            onClick={handlePauseGeneration}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-transform hover:scale-105 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Pausar / Detener respuesta</span>
          </button>
        </div>
      )}

      {/* Bottom Sticky Chat Input Bar */}
      <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          {/* Action icon buttons: Image & Symbols */}
          <div className="flex items-center gap-1 pb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Adjuntar imagen de tu libreta o libro"
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              title="Tomar foto con la cámara"
              className="p-2.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer hidden sm:block"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSymbolBar(!showSymbolBar)}
              title="Símbolos matemáticos (√x, x², π, etc.)"
              className={`p-2.5 rounded-xl font-serif text-sm font-bold transition-colors cursor-pointer ${
                showSymbolBar
                  ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              √x
            </button>
          </div>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta lo que sea (matemáticas, física, historia, consejos...)"
              rows={1}
              className="w-full px-4 py-3 max-h-32 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none transition-all placeholder:text-slate-400 leading-relaxed block"
            />
          </div>

          {/* Send or Pause Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={handlePauseGeneration}
              title="Pausar respuesta"
              className="px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none"
            >
              <Square className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Pausar</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim() && !attachedImage}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0 select-none"
            >
              <span>Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

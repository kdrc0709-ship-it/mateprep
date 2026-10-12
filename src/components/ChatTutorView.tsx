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
  'Dame consejos para preparar mi examen de matemáticas',
];

const INITIAL_WELCOME_TEXT = `¡Hola! Soy tu **Tutor y Asistente de MatePrep** 🎓.\n\nEstoy aquí para ayudarte con **todo lo que necesites**:
- 📐 **Matemáticas a fondo:** Álgebra, Geometría, Trigonometría, Geometría Analítica, Cálculo y Probabilidad.
- 🔬 **Ciencias & Humanidades:** Física, Química, Biología, Historia, Literatura, Filosofía, Programación y Computación.
- 💡 **Exámenes y dudas diarias:** Consejos para exámenes de preparatoria o cualquier curiosidad cotidiana.

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
    <div className="flex flex-col flex-1 h-[calc(100vh-12rem)] min-h-[500px] max-w-4xl w-full mx-auto bg-white dark:bg-black rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-colors">
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
      <div className="px-4 sm:px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-sm shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-neutral-400 dark:bg-neutral-500 ring-2 ring-white dark:ring-black" />
          </div>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-black dark:text-white truncate">
                MatePrep • Tutor IA
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white shrink-0">
                Bachillerato
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer shadow-xs"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer"
          >
            <PenTool className="w-3.5 h-3.5 text-black dark:text-white" />
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
                <div className="w-8 h-8 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 shadow-xs space-y-2 ${
                  isUser
                    ? 'bg-black text-white dark:bg-neutral-900 dark:text-white rounded-tr-xs border border-black dark:border-neutral-700'
                    : 'bg-neutral-100 dark:bg-neutral-900/90 text-black dark:text-white rounded-tl-xs border border-neutral-200 dark:border-neutral-800'
                }`}
              >
                {/* Attached image if any */}
                {msg.imageBase64 && (
                  <div className="rounded-xl overflow-hidden max-h-64 bg-neutral-200 dark:bg-neutral-800">
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
                    <div className="flex items-center gap-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="w-2 h-2 rounded-full bg-black dark:bg-white animate-bounce" />
                      <span>El tutor está preparando tu respuesta...</span>
                    </div>
                  )
                )}

                {/* Paused indicator */}
                {msg.isPaused && (
                  <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 flex items-center gap-1 pt-1">
                    <Pause className="w-3 h-3" />
                    <span>Respuesta pausada</span>
                  </div>
                )}

                <div
                  className={`text-[10px] text-right font-medium ${
                    isUser ? 'text-neutral-300' : 'text-neutral-400'
                  }`}
                >
                  {msg.timestamp}
                </div>

                {/* Pedagogical quick action chips below AI answers */}
                {!isUser && msg.id !== 'msg-welcome' && msg.text && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSendMessage('¿Me puedes dar una pista para resolver esto?')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
                    >
                      <Lightbulb className="w-3 h-3 text-black dark:text-white" />
                      <span>Pista</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('¿Por qué funciona esto? Explícame el concepto con una analogía.')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
                    >
                      <HelpCircle className="w-3 h-3 text-black dark:text-white" />
                      <span>¿Por qué funciona?</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendMessage('Ya intenté resolverlo, por favor muéstrame el procedimiento formal completo y la comprobación.')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer border border-neutral-300 dark:border-neutral-700"
                    >
                      <CheckCircle2 className="w-3 h-3 text-black dark:text-white" />
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
        <div className="px-5 py-2.5 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider whitespace-nowrap">
              Sugerencias rápidas:
            </span>
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 text-black dark:text-white text-xs font-medium border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-colors cursor-pointer shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attached Image Preview Bar */}
      {attachedImage && (
        <div className="px-5 py-2 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={attachedImage}
              alt="Foto adjunta"
              className="w-12 h-12 object-cover rounded-lg border border-neutral-300 dark:border-neutral-700"
            />
            <div className="text-xs">
              <span className="font-bold text-black dark:text-white block">
                Foto adjunta
              </span>
              <span className="text-[11px] text-neutral-600 dark:text-neutral-400">
                La IA analizará el problema al enviar tu mensaje.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAttachedImage(null)}
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-black dark:text-white cursor-pointer"
            title="Quitar foto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsible Math Symbol Bar */}
      {showSymbolBar && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <MathSymbolBar onInsert={handleInsertSymbol} />
        </div>
      )}

      {/* Floating Pause / Stop Button when generating */}
      {isLoading && (
        <div className="px-4 py-2 bg-neutral-50/95 dark:bg-neutral-950/95 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-center animate-in fade-in">
          <button
            type="button"
            onClick={handlePauseGeneration}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-bold shadow-md transition-transform hover:scale-105 cursor-pointer border border-neutral-300 dark:border-neutral-700"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Pausar / Detener respuesta</span>
          </button>
        </div>
      )}

      {/* Bottom Sticky Chat Input Bar */}
      <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black">
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
              className="p-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              title="Tomar foto con la cámara"
              className="p-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer hidden sm:block"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSymbolBar(!showSymbolBar)}
              title="Símbolos matemáticos (√x, x², π, etc.)"
              className={`p-2.5 rounded-xl font-serif text-sm font-bold transition-colors cursor-pointer ${
                showSymbolBar
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900'
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
              className="w-full px-4 py-3 max-h-32 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white resize-none transition-all placeholder:text-neutral-400 leading-relaxed block"
            />
          </div>

          {/* Send or Pause Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={handlePauseGeneration}
              title="Pausar respuesta"
              className="px-4 py-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black hover:opacity-85 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 select-none border border-neutral-300 dark:border-neutral-700"
            >
              <Square className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline">Pausar</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputText.trim() && !attachedImage}
              className="px-5 py-3 rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-600 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shrink-0 select-none border border-black dark:border-white"
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

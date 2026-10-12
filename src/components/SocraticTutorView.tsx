import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Unlock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  BookOpen,
  PenTool,
  Bookmark,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathText, FormulaBadge } from '../utils/katexRenderer';
import { MathSymbolBar } from './MathSymbolBar';
import { ImageUploader } from './ImageUploader';
import { GuidedProblem, StepFeedback, FullSolution } from '../types/math';

interface SocraticTutorViewProps {
  onOpenScratchpad: () => void;
  onSaveToHistory: (problem: GuidedProblem) => void;
  presetProblemText?: string;
}

const PREPA_EXERCISES = [
  {
    title: 'Ecuación Cuadrática',
    text: 'Resuelve la ecuación cuadrática: 2x^2 + 5x - 3 = 0 y determina sus raíces.',
    topic: 'Álgebra II',
  },
  {
    title: 'Límite Indeterminado 0/0',
    text: 'Calcula el límite: \\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2} eliminando la indeterminación.',
    topic: 'Cálculo Diferencial',
  },
  {
    title: 'Regla de la Cadena',
    text: 'Encuentra la derivada de la función compuesta f(x) = (3x^2 - 5)^4 paso a paso.',
    topic: 'Cálculo Diferencial',
  },
  {
    title: 'Ecuación de la Recta',
    text: 'Halla la ecuación de la recta que pasa por los puntos A(2, 3) y B(6, 11) en forma ordinaria (y = mx + b).',
    topic: 'Geometría Analítica',
  },
  {
    title: 'Teorema de Pitágoras & Trig',
    text: 'Un triángulo rectángulo tiene un cateto de 6 cm y una hipotenusa de 10 cm. Halla el otro cateto y el seno del ángulo opuesto a él.',
    topic: 'Trigonometría',
  },
  {
    title: 'Integral por Sustitución',
    text: 'Calcula la integral indefinida \\int 2x \\sqrt{x^2 + 1} \\, dx explicando la elección de u y du.',
    topic: 'Cálculo Integral',
  },
];

export const SocraticTutorView: React.FC<SocraticTutorViewProps> = ({
  onOpenScratchpad,
  onSaveToHistory,
  presetProblemText,
}) => {
  const [problemInput, setProblemInput] = useState(presetProblemText || '');
  const [imageBase64, setImageBase64] = useState<string | undefined>(undefined);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [topicHint, setTopicHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active guided problem state
  const [currentProblem, setCurrentProblem] = useState<GuidedProblem | null>(null);

  // Current step interaction
  const [activeStepInput, setActiveStepInput] = useState('');
  const [isEvaluatingStep, setIsEvaluatingStep] = useState(false);
  const [revealedStepExplanations, setRevealedStepExplanations] = useState<Record<number, boolean>>({});

  // Full solution reveal
  const [isLoadingFullSolution, setIsLoadingFullSolution] = useState(false);

  // Insert symbol helper
  const handleInsertSymbol = (symbol: string) => {
    if (currentProblem) {
      setActiveStepInput((prev) => prev + symbol);
    } else {
      setProblemInput((prev) => prev + symbol);
    }
  };

  // Start guided problem
  const handleStartGuiding = async (overrideText?: string) => {
    const textToUse = overrideText || problemInput;
    if (!textToUse.trim() && !imageBase64) {
      setErrorMessage('Por favor escribe tu ejercicio o sube una imagen con el problema.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/math/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: textToUse,
          imageBase64: imageBase64,
          mimeType: mimeType,
          topicHint: topicHint,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo procesar el problema.');
      }

      const data = await response.json();

      const newProblem: GuidedProblem = {
        id: `prob-${Date.now()}`,
        createdAt: new Date().toISOString(),
        originalInputText: textToUse,
        originalImagePreview: imageBase64,
        topic: data.topic || 'Matemáticas de Preparatoria',
        difficulty: data.difficulty || 'Intermedio',
        identifiedProblemLatex: data.identifiedProblemLatex || textToUse,
        learningObjective: data.learningObjective || 'Resolver paso a paso comprendiendo los fundamentos.',
        prerequisites: data.prerequisites || [],
        keyFormulas: data.keyFormulas || [],
        steps: data.steps || [],
        commonPitfalls: data.commonPitfalls || [],
        finalReflectionPrompt: data.finalReflectionPrompt || '',
        currentStepIndex: 0,
        completedSteps: [],
        userStepAttempts: {},
      };

      setCurrentProblem(newProblem);
      setActiveStepInput('');
      setRevealedStepExplanations({});
      onSaveToHistory(newProblem);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión con el tutor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Evaluate student's attempt on active step
  const handleCheckStepAttempt = async () => {
    if (!currentProblem || !activeStepInput.trim()) return;

    const currentStep = currentProblem.steps[currentProblem.currentStepIndex];
    if (!currentStep) return;

    setIsEvaluatingStep(true);

    try {
      const res = await fetch('/api/math/step-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemLatex: currentProblem.identifiedProblemLatex,
          currentStep: currentStep,
          studentInput: activeStepInput,
        }),
      });

      if (!res.ok) throw new Error('Error al evaluar la respuesta.');
      const feedback: StepFeedback = await res.json();

      const stepNum = currentStep.stepNumber;
      const isOk = feedback.isCorrect === true || feedback.isCorrect === 'partial';

      const updatedAttempts = {
        ...currentProblem.userStepAttempts,
        [stepNum]: {
          input: activeStepInput,
          feedback,
        },
      };

      let updatedCompleted = [...currentProblem.completedSteps];
      if (feedback.isCorrect === true && !updatedCompleted.includes(stepNum)) {
        updatedCompleted.push(stepNum);
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      }

      // If correct and there is a next step, allow advancing
      const nextIndex =
        feedback.isCorrect === true && currentProblem.currentStepIndex < currentProblem.steps.length - 1
          ? currentProblem.currentStepIndex + 1
          : currentProblem.currentStepIndex;

      const updatedProblem: GuidedProblem = {
        ...currentProblem,
        completedSteps: updatedCompleted,
        userStepAttempts: updatedAttempts,
        currentStepIndex: nextIndex,
      };

      setCurrentProblem(updatedProblem);
      if (feedback.isCorrect === true) {
        setActiveStepInput('');
      }
      onSaveToHistory(updatedProblem);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsEvaluatingStep(false);
    }
  };

  // Reveal step explanation if student is stuck
  const toggleRevealStep = (stepNumber: number) => {
    setRevealedStepExplanations((prev) => ({
      ...prev,
      [stepNumber]: !prev[stepNumber],
    }));
  };

  // Reveal full solution and verification
  const handleRevealFullSolution = async () => {
    if (!currentProblem) return;
    setIsLoadingFullSolution(true);

    try {
      const res = await fetch('/api/math/reveal-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemLatex: currentProblem.identifiedProblemLatex,
          steps: currentProblem.steps,
        }),
      });

      if (!res.ok) throw new Error('Error al generar la solución completa.');
      const solution: FullSolution = await res.json();

      const updated: GuidedProblem = {
        ...currentProblem,
        revealedSolution: solution,
      };

      setCurrentProblem(updated);
      onSaveToHistory(updated);

      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.7 },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFullSolution(false);
    }
  };

  const handleReset = () => {
    setCurrentProblem(null);
    setProblemInput('');
    setImageBase64(undefined);
    setActiveStepInput('');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6">
      {!currentProblem ? (
        /* Problem Input Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
          {/* Hero Banner inside Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Tutor Socrático de Matemáticas (Prepa)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Aprende el procedimiento paso a paso sin respuestas secas: comprende cada paso para dominar tus exámenes.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenScratchpad}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors text-xs font-semibold cursor-pointer"
            >
              <PenTool className="w-4 h-4 text-indigo-500" />
              <span>Abrir Pizarra de Borrador</span>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Escribe tu problema o ejercicio:
              </label>
              <textarea
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                placeholder="Ejemplo: Resuelve 3x^2 - 12x + 9 = 0 usando factorización o fórmula general..."
                rows={3}
                className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Math Symbol Toolbar */}
            <MathSymbolBar onInsert={handleInsertSymbol} />

            {/* Image Uploader */}
            <div className="pt-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                O carga una foto de tu libro o libreta:
              </label>
              <ImageUploader
                currentImageBase64={imageBase64}
                onImageSelected={(base64, mime) => {
                  setImageBase64(base64);
                  setMimeType(mime);
                }}
                onClear={() => setImageBase64(undefined)}
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleStartGuiding()}
                disabled={isLoading || (!problemInput.trim() && !imageBase64)}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Analizando ejercicio y preparando guía paso a paso...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-indigo-200" />
                    <span>Iniciar Resolución Guiada (Modo Socrático)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Ejercicios típicos de examen para practicar:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {PREPA_EXERCISES.map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  onClick={() => {
                    setProblemInput(ex.text);
                    handleStartGuiding(ex.text);
                  }}
                  className="text-left p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    {ex.topic}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 mt-0.5 line-clamp-1">
                    {ex.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {ex.text}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Active Guided Problem Breakdown View */
        <div className="space-y-6">
          {/* Top Bar with Topic & Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  {currentProblem.topic}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  Dificultad: {currentProblem.difficulty}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenScratchpad}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Pizarra</span>
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Nuevo problema</span>
                </button>
              </div>
            </div>

            {/* Identified Problem Statement */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/70 rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Enunciado del problema:
              </span>
              <MathText
                content={currentProblem.identifiedProblemLatex}
                className="text-base font-semibold text-slate-900 dark:text-white"
              />
              {currentProblem.originalImagePreview && (
                <div className="mt-3">
                  <img
                    src={currentProblem.originalImagePreview}
                    alt="Foto original del ejercicio"
                    className="max-h-40 rounded-xl border border-slate-200 dark:border-slate-700 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Objective & Prerequisites */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                <span className="font-bold text-indigo-700 dark:text-indigo-300 block mb-0.5">
                  Objetivo Pedagógico:
                </span>
                <p className="text-slate-700 dark:text-slate-300">
                  {currentProblem.learningObjective}
                </p>
              </div>

              {currentProblem.prerequisites.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                    Conceptos previos necesarios:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {currentProblem.prerequisites.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] border border-slate-200 dark:border-slate-600"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key Formulas */}
            {currentProblem.keyFormulas.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Fórmulas clave aplicables a este problema:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {currentProblem.keyFormulas.map((f, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/70 dark:border-slate-800"
                    >
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        {f.name}
                      </div>
                      <div className="py-1">
                        <FormulaBadge formula={f.formula} displayMode={true} className="text-indigo-600 dark:text-indigo-300 font-semibold" />
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <MathText content={f.whyItWorks} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Socratic Step by Step Journey */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ruta de Resolución Guiada</span>
                <span className="text-xs font-normal text-slate-500">
                  (Paso {currentProblem.currentStepIndex + 1} de {currentProblem.steps.length})
                </span>
              </h3>
            </div>

            {currentProblem.steps.map((step, idx) => {
              const isCurrent = idx === currentProblem.currentStepIndex;
              const isCompleted = currentProblem.completedSteps.includes(step.stepNumber);
              const isPast = idx < currentProblem.currentStepIndex;
              const stepAttempt = currentProblem.userStepAttempts[step.stepNumber];
              const isExplanationRevealed = !!revealedStepExplanations[step.stepNumber];

              return (
                <div
                  key={step.stepNumber}
                  className={`rounded-3xl p-6 border transition-all ${
                    isCurrent
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                      : isCompleted
                      ? 'bg-white/80 dark:bg-slate-900/70 border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200/70 dark:border-slate-800/50 opacity-80'
                  }`}
                >
                  {/* Step Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : step.stepNumber}
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {step.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Meta de esta etapa: {step.goal}
                        </p>
                      </div>
                    </div>

                    {isCompleted && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                        ¡Completado!
                      </span>
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="mt-4 space-y-3.5 pl-12">
                    {/* Guiding Hint / Explanation */}
                    <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                        <Lightbulb className="w-4 h-4 text-indigo-500" />
                        <span>Pista guía para pensar este paso:</span>
                      </div>
                      <MathText
                        content={step.guidingHint}
                        className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                      />
                    </div>

                    {/* Check Question (Socratic Checkpoint) */}
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Punto de control para ti:
                      </span>
                      <MathText
                        content={step.checkQuestion}
                        className="text-sm font-semibold text-slate-800 dark:text-slate-200"
                      />
                    </div>

                    {/* Interactive Input for Active Step */}
                    {isCurrent && (
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Escribe tu avance, cálculo o respuesta para este paso:
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={activeStepInput}
                              onChange={(e) => setActiveStepInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCheckStepAttempt();
                              }}
                              placeholder="Escribe tu deducción o número aquí..."
                              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={handleCheckStepAttempt}
                              disabled={isEvaluatingStep || !activeStepInput.trim()}
                              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                            >
                              {isEvaluatingStep ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Comprobar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Helper actions for current step */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleRevealStep(step.stepNumber)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            <Unlock className="w-3 h-3" />
                            {isExplanationRevealed ? 'Ocultar explicación formal' : '¿Atorado? Revelar explicación de este paso'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Previous attempts / feedback */}
                    {stepAttempt?.feedback && (
                      <div
                        className={`p-4 rounded-2xl border ${
                          stepAttempt.feedback.isCorrect === true
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                            : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs mb-1">
                          {stepAttempt.feedback.isCorrect === true ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-800 dark:text-emerald-300">
                                {stepAttempt.feedback.encouragingMessage}
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-amber-800 dark:text-amber-300">
                                {stepAttempt.feedback.encouragingMessage}
                              </span>
                            </>
                          )}
                        </div>

                        <MathText
                          content={stepAttempt.feedback.detailedFeedback}
                          className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-1"
                        />

                        {stepAttempt.feedback.hintIfStuck && (
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                            <span className="font-bold">Pista:</span> {stepAttempt.feedback.hintIfStuck}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Revealed Detailed Explanation */}
                    {isExplanationRevealed && (
                      <div className="p-4 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 animate-in fade-in">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          Explicación pedagógica formal de este paso:
                        </span>
                        <MathText
                          content={step.pedagogicalExplanation}
                          className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                        />
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <strong>Meta alcanzada en este paso:</strong> {step.intermediateResultDescription}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Common Pitfalls Card */}
          {currentProblem.commonPitfalls.length > 0 && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-3xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Errores típicos de preparatoria a evitar en este tema:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs text-slate-700 dark:text-slate-300 pl-1">
                {currentProblem.commonPitfalls.map((pitfall, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <MathText content={pitfall} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Full Solution & Mathematical Verification Section */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {!currentProblem.revealedSolution ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                  ¿Has completado tus pasos o deseas contrastar tu procedimiento con la resolución formal y la verificación matemática completa?
                </p>
                <button
                  type="button"
                  onClick={handleRevealFullSolution}
                  disabled={isLoadingFullSolution}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  {isLoadingFullSolution ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generando comprobación matemática formal...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-indigo-200" />
                      <span>Ver Solución Formal Completa & Comprobación</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Resolución Formal & Verificación Matemática</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold">
                    Verificado
                  </span>
                </div>

                {/* Final Answer Banner */}
                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-center">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                    Resultado Final:
                  </span>
                  <FormulaBadge formula={currentProblem.revealedSolution.finalAnswerLatex} displayMode={true} className="text-xl font-bold text-indigo-950 dark:text-indigo-100" />
                </div>

                {/* Full Breakdown Steps */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Procedimiento Formal Detallado:
                  </span>
                  {currentProblem.revealedSolution.fullStepByStepBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-1"
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Paso {item.step}: {item.title}
                      </div>
                      <div className="py-1">
                        <MathText content={item.work} className="text-sm font-medium text-indigo-700 dark:text-indigo-300" />
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        <MathText content={item.explanation} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Mathematical Verification */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    ¿Por qué es correcta la respuesta? (Comprobación matemática):
                  </span>
                  <MathText
                    content={currentProblem.revealedSolution.verificationMethod}
                    className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                  />
                </div>

                {/* Geometric insight & golden rule */}
                {currentProblem.revealedSolution.geometricOrRealLifeInsight && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                    <strong className="text-slate-800 dark:text-slate-200 block mb-0.5">
                      Interpretación geométrica / gráfica:
                    </strong>
                    <MathText
                      content={currentProblem.revealedSolution.geometricOrRealLifeInsight}
                      className="text-slate-600 dark:text-slate-400"
                    />
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-indigo-600 text-white text-xs font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0 text-indigo-200" />
                  <span>
                    <strong>Regla de oro para tu examen:</strong> {currentProblem.revealedSolution.takeawayRule}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

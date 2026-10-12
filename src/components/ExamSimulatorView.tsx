import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  RotateCcw,
  PenTool,
  ChevronRight,
  ChevronLeft,
  Trophy,
  ArrowRight,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathText, FormulaBadge } from '../utils/katexRenderer';
import { Exam, ExamQuestion, ExamAttempt } from '../types/math';

interface ExamSimulatorViewProps {
  onOpenScratchpad: () => void;
  onSendToTutor: (problemText: string) => void;
  onSaveExamAttempt: (attempt: ExamAttempt) => void;
}

const PREPA_EXAM_PRESETS = [
  {
    title: 'Examen de Admisión UNAM / IPN / EXANI-II',
    topic: 'Razonamiento Matemático & Temas Clave de Prepa',
    desc: 'Preguntas representativas de ingreso a nivel superior (Álgebra, Geometría, Cálculo básico).',
  },
  {
    title: 'Álgebra II: Cuadráticas & Factorización',
    topic: 'Álgebra II',
    desc: 'Productos notables, simplificación algebraica y raíces de polinomios.',
  },
  {
    title: 'Cálculo Diferencial: Límites & Derivadas',
    topic: 'Cálculo Diferencial',
    desc: 'Límites indeterminados, regla de la cadena y problemas de máximos y mínimos.',
  },
  {
    title: 'Geometría Analítica & Cónicas',
    topic: 'Geometría Analítica',
    desc: 'Rectas, parábolas, circunferencias y distancias en el plano.',
  },
  {
    title: 'Trigonometría & Triángulos',
    topic: 'Trigonometría',
    desc: 'Ley de senos, cosenos, identidades fundamentales y razones trigonométricas.',
  },
  {
    title: 'Reto de Pasatiempo: Ingenio Matemático',
    topic: 'Desafíos Lógicos y Olimpiada Prepa',
    desc: 'Problemas que ponen a prueba tu pensamiento lateral y belleza matemática.',
  },
];

export const ExamSimulatorView: React.FC<ExamSimulatorViewProps> = ({
  onOpenScratchpad,
  onSendToTutor,
  onSaveExamAttempt,
}) => {
  // Config state
  const [topic, setTopic] = useState('Álgebra y Razonamiento Matemático');
  const [customPrompt, setCustomPrompt] = useState('');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<string>('Intermedio');
  const [examType, setExamType] = useState<string>('prep_standard'); // 'prep_standard' | 'pasatiempo'

  // Exam runtime state
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});

  // Timer state
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  // Generate exam from server
  const handleGenerateExam = async (presetTopic?: string) => {
    setIsGenerating(true);
    setCurrentExam(null);
    setIsExamCompleted(false);
    setUserAnswers({});
    setRevealedHints({});

    const selectedTopic = presetTopic || topic;

    try {
      const res = await fetch('/api/exam/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          customPrompt: customPrompt,
          numQuestions: numQuestions,
          difficulty: difficulty,
          examType: examType,
        }),
      });

      if (!res.ok) throw new Error('Error al generar el simulacro.');
      const data = await res.json();

      const newExam: Exam = {
        id: `exam-${Date.now()}`,
        createdAt: new Date().toISOString(),
        examTitle: data.examTitle || `Simulacro: ${selectedTopic}`,
        description: data.description || 'Evaluación diagnóstica con explicaciones paso a paso.',
        topic: selectedTopic,
        difficulty: difficulty,
        targetTimeMinutes: data.targetTimeMinutes || numQuestions * 3,
        questions: data.questions || [],
      };

      setCurrentExam(newExam);
      setCurrentQuestionIdx(0);
      setSecondsLeft((newExam.targetTimeMinutes || 15) * 60);
      setTimeSpentSeconds(0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!currentExam || isExamCompleted) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentExam, isExamCompleted]);

  // Finish exam
  const handleFinishExam = () => {
    if (!currentExam) return;
    setIsExamCompleted(true);

    // Calculate score
    let correctCount = 0;
    currentExam.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    });

    const scorePercentage = Math.round((correctCount / currentExam.questions.length) * 100);

    const attempt: ExamAttempt = {
      id: `att-${Date.now()}`,
      examId: currentExam.id,
      examTitle: currentExam.examTitle,
      topic: currentExam.topic,
      date: new Date().toISOString(),
      timeSpentSeconds,
      answers: userAnswers,
      score: scorePercentage,
      totalQuestions: currentExam.questions.length,
      correctCount,
    };

    onSaveExamAttempt(attempt);

    if (scorePercentage >= 70) {
      confetti({
        particleCount: 70,
        spread: 90,
        origin: { y: 0.6 },
      });
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {!currentExam ? (
        /* Configuration & Generator Card */
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Simulador de Exámenes Personalizado (Prepa)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Prepárate para tus parciales o exámenes de admisión (UNAM, IPN, EXANI-II) o ponte a prueba por pasatiempo.
                </p>
              </div>
            </div>
          </div>

          {/* Config Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Materia o Tema Principal:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="ej. Cálculo: Derivadas y Optimización, Álgebra II, Geometría Analítica..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Propósito del Simulador:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExamType('prep_standard')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    examType === 'prep_standard'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Estudiar para un Examen
                </button>
                <button
                  type="button"
                  onClick={() => setExamType('pasatiempo')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    examType === 'pasatiempo'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                  Gusto / Pasatiempo
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Cantidad de Preguntas:
              </label>
              <div className="flex gap-2">
                {[3, 5, 8, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNumQuestions(num)}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      numQuestions === num
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    {num} preguntas
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Nivel de Dificultad:
              </label>
              <div className="flex gap-2">
                {['Básico', 'Intermedio', 'Avanzado', 'Olimpiada'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                      difficulty === d
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Instrucción o Énfasis Específico (Opcional):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="ej. Enfatizar problemas aplicados de optimización y preguntas con gráficas de funciones"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => handleGenerateExam()}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generando simulacro con reactivos y explicaciones...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-indigo-200" />
                <span>Crear y Comenzar Examen con IA</span>
              </>
            )}
          </button>

          {/* Quick Presets */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Plantillas de simulacro preparadas:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PREPA_EXAM_PRESETS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    setTopic(p.topic);
                    handleGenerateExam(p.topic);
                  }}
                  className="text-left p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {p.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : !isExamCompleted ? (
        /* Exam in Progress View */
        <div className="space-y-5">
          {/* Top Bar with Timer & Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {currentExam.topic}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {currentExam.examTitle}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Timer */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>

              {/* Scratchpad button */}
              <button
                type="button"
                onClick={onOpenScratchpad}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Pizarra</span>
              </button>

              {/* Finish Exam Button */}
              <button
                type="button"
                onClick={handleFinishExam}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Finalizar Examen
              </button>
            </div>
          </div>

          {/* Question Navigator Dots */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {currentExam.questions.map((q, idx) => {
              const isAnswered = !!userAnswers[q.id];
              const isSelected = idx === currentQuestionIdx;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={`w-9 h-9 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer flex items-center justify-center ${
                    isSelected
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-slate-900'
                      : isAnswered
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Question Card */}
          {(() => {
            const currentQ = currentExam.questions[currentQuestionIdx];
            if (!currentQ) return null;

            return (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Pregunta {currentQuestionIdx + 1} de {currentExam.questions.length} • {currentQ.topic}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRevealedHints((prev) => ({
                        ...prev,
                        [currentQ.id]: !prev[currentQ.id],
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{revealedHints[currentQ.id] ? 'Ocultar pista' : 'Ver pista pedagógica'}</span>
                  </button>
                </div>

                {/* Statement */}
                <div className="text-base text-slate-900 dark:text-white font-medium leading-relaxed">
                  <MathText content={currentQ.questionLatex} />
                </div>

                {/* Pedagogical Hint if opened */}
                {revealedHints[currentQ.id] && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block mb-0.5">Pista orientativa:</strong>
                      <MathText content={currentQ.pedagogicalHint} />
                    </div>
                  </div>
                )}

                {/* Options (A, B, C, D) */}
                <div className="space-y-3 pt-2">
                  {currentQ.options.map((opt) => {
                    const isSelected = userAnswers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          setUserAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: opt.id,
                          }))
                        }
                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-600 dark:border-indigo-500 shadow-xs'
                            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <div className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">
                          <MathText content={opt.text} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx((prev) => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIdx === 0}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  {currentQuestionIdx < currentExam.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                      className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinishExam}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Entregar Examen
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        /* Exam Results & Step-by-Step Diagnostic Review */
        <div className="space-y-6 animate-in fade-in">
          {/* Score Header Card */}
          {(() => {
            let correctCount = 0;
            currentExam.questions.forEach((q) => {
              if (userAnswers[q.id] === q.correctOptionId) correctCount++;
            });
            const score = Math.round((correctCount / currentExam.questions.length) * 100);
            const gradeOutOf10 = ((score / 100) * 10).toFixed(1);

            return (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-3xl flex items-center justify-center font-bold text-2xl shadow-sm ${
                        score >= 80
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : score >= 60
                          ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                      }`}
                    >
                      {gradeOutOf10}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                        {score >= 80
                          ? '¡Excelente dominio matemático!'
                          : score >= 60
                          ? '¡Buen intento! Reforcemos algunos detalles'
                          : 'Oportunidad ideal para repasar los conceptos'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Acertaste {correctCount} de {currentExam.questions.length} preguntas ({score}%).
                        Tiempo empleado: {Math.floor(timeSpentSeconds / 60)} min {timeSpentSeconds % 60} seg.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentExam(null);
                      setIsExamCompleted(false);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Hacer otro simulacro</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Detailed Question by Question Diagnostic Review */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Revisión Detallada & Explicación Paso a Paso de Cada Pregunta:
            </h3>

            {currentExam.questions.map((q, idx) => {
              const selectedOptionId = userAnswers[q.id];
              const isCorrect = selectedOptionId === q.correctOptionId;

              return (
                <div
                  key={q.id}
                  className={`rounded-3xl p-6 border transition-all ${
                    isCorrect
                      ? 'bg-white dark:bg-slate-900 border-emerald-300 dark:border-emerald-800/60'
                      : 'bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          isCorrect
                            ? 'bg-emerald-500 text-white'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Correcta
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          Incorrecta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Latex */}
                  <div className="py-3 text-sm font-semibold text-slate-900 dark:text-white">
                    <MathText content={q.questionLatex} />
                  </div>

                  {/* Options status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                    {q.options.map((opt) => {
                      const isUserChoice = selectedOptionId === opt.id;
                      const isActualCorrect = opt.id === q.correctOptionId;

                      let badgeClass = 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                      if (isActualCorrect) {
                        badgeClass = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold';
                      } else if (isUserChoice && !isActualCorrect) {
                        badgeClass = 'bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-700 text-rose-800 dark:text-rose-200';
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${badgeClass}`}
                        >
                          <span className="font-bold">{opt.id})</span>
                          <div className="flex-1">
                            <MathText content={opt.text} />
                          </div>
                          {isActualCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                          {isUserChoice && !isActualCorrect && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step-by-Step Pedagogical Explanation */}
                  <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>Procedimiento formal paso a paso (¿Por qué es esa la respuesta?):</span>
                    </div>
                    <MathText
                      content={q.stepByStepExplanation}
                      className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed"
                    />

                    {q.commonMistake && (
                      <div className="pt-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                        <strong>Error común en exámenes:</strong> {q.commonMistake}
                      </div>
                    )}
                  </div>

                  {/* Action to Practice in Socratic Tutor */}
                  <div className="mt-3 pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSendToTutor(q.questionLatex)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer"
                    >
                      <span>Estudiar este problema a fondo con el Tutor Socrático</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

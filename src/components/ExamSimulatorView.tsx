import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RotateCcw,
  PenTool,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MathText } from '../utils/katexRenderer';
import { Exam, ExamAttempt } from '../types/math';

interface ExamSimulatorViewProps {
  onOpenScratchpad: () => void;
  onSendToTutor: (problemText: string) => void;
  onSaveExamAttempt: (attempt: ExamAttempt) => void;
}

const PREPA_EXAM_PRESETS = [
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
          customPrompt,
          numQuestions,
          difficulty,
          examType,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al generar el simulacro de examen.');
      }

      const examData: Exam = await res.json();
      setCurrentExam(examData);
      setCurrentQuestionIdx(0);
      setSecondsLeft((examData.targetTimeMinutes || numQuestions * 3) * 60);
      setTimeSpentSeconds(0);
    } catch (err: any) {
      alert(err.message || 'Error al conectar con el generador de exámenes.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!currentExam || isExamCompleted) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentExam, isExamCompleted]);

  // Finish exam and compute score
  const handleFinishExam = () => {
    if (!currentExam) return;
    setIsExamCompleted(true);

    let correctCount = 0;
    currentExam.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctOptionId) {
        correctCount++;
      }
    });

    const scorePercentage = Math.round((correctCount / currentExam.questions.length) * 100);

    // Save attempt record
    const attempt: ExamAttempt = {
      id: `attempt-${Date.now()}`,
      examId: currentExam.id,
      examTitle: currentExam.examTitle,
      topic: currentExam.topic,
      date: new Date().toLocaleDateString(),
      answers: userAnswers,
      score: scorePercentage,
      totalQuestions: currentExam.questions.length,
      correctCount,
      timeSpentSeconds,
    };
    onSaveExamAttempt(attempt);

    // Subtle celebration for high scores
    if (scorePercentage >= 80) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#000000', '#666666', '#cccccc'],
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
        <div className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white">
                  Simulador de Exámenes Personalizado (Prepa)
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Prepárate para tus parciales o ponte a prueba por pasatiempo.
                </p>
              </div>
            </div>
          </div>

          {/* Config Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Materia o Tema Principal:
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="ej. Cálculo: Derivadas y Optimización, Álgebra II, Geometría Analítica..."
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
                Propósito del Simulador:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExamType('prep_standard')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    examType === 'prep_standard'
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900'
                  }`}
                >
                  Estudiar para un Examen
                </button>
                <button
                  type="button"
                  onClick={() => setExamType('pasatiempo')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    examType === 'pasatiempo'
                      ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 inline mr-1" />
                  Gusto / Pasatiempo
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
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
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                        : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900'
                    }`}
                  >
                    {num} preguntas
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
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
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-xs'
                        : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-900'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1.5">
              Instrucción o Énfasis Específico (Opcional):
            </label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="ej. Enfatizar problemas aplicados de optimización y preguntas con gráficas de funciones"
              className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <button
            type="button"
            onClick={() => handleGenerateExam()}
            disabled={isGenerating}
            className="w-full py-3.5 px-6 rounded-2xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed border border-black dark:border-white"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Generando simulacro con reactivos y explicaciones...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Crear y Comenzar Examen con IA</span>
              </>
            )}
          </button>

          {/* Quick Presets */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
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
                  className="text-left p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:border-black dark:hover:border-white transition-all cursor-pointer group"
                >
                  <div className="text-xs font-bold text-black dark:text-white">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
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
          <div className="bg-white dark:bg-black rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
                {currentExam.topic}
              </span>
              <h3 className="text-base font-bold text-black dark:text-white mt-1">
                {currentExam.examTitle}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Timer */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white text-xs font-mono font-bold border border-neutral-200 dark:border-neutral-800">
                <Clock className="w-4 h-4 text-black dark:text-white" />
                <span>{formatTimer(secondsLeft)}</span>
              </div>

              {/* Scratchpad button */}
              <button
                type="button"
                onClick={onOpenScratchpad}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Pizarra</span>
              </button>

              {/* Finish Exam Button */}
              <button
                type="button"
                onClick={handleFinishExam}
                className="px-4 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold transition-all shadow-xs cursor-pointer border border-black dark:border-white"
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
                      ? 'bg-black text-white dark:bg-white dark:text-black ring-2 ring-neutral-400'
                      : isAnswered
                      ? 'bg-neutral-300 text-black dark:bg-neutral-700 dark:text-white'
                      : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-700'
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
              <div className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
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
                    className="inline-flex items-center gap-1 text-xs font-medium text-black dark:text-white underline cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{revealedHints[currentQ.id] ? 'Ocultar pista' : 'Ver pista pedagógica'}</span>
                  </button>
                </div>

                {/* Statement */}
                <div className="text-base text-black dark:text-white font-medium leading-relaxed">
                  <MathText content={currentQ.questionLatex} />
                </div>

                {/* Pedagogical Hint if opened */}
                {revealedHints[currentQ.id] && (
                  <div className="p-3.5 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-black dark:text-white flex items-start gap-2.5 animate-in fade-in">
                    <Sparkles className="w-4 h-4 text-black dark:text-white shrink-0 mt-0.5" />
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
                            ? 'bg-neutral-100 dark:bg-neutral-900 border-black dark:border-white shadow-xs'
                            : 'bg-white dark:bg-neutral-950 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-black text-white dark:bg-white dark:text-black'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white border border-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          {opt.id}
                        </div>
                        <div className="flex-1 text-sm font-medium text-black dark:text-white">
                          <MathText content={opt.text} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIdx((prev) => Math.max(prev - 1, 0))}
                    disabled={currentQuestionIdx === 0}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-400 disabled:opacity-40 cursor-pointer flex items-center gap-1 hover:text-black dark:hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>

                  {currentQuestionIdx < currentExam.questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
                      className="px-5 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs border border-black dark:border-white"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinishExam}
                      className="px-5 py-2 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold cursor-pointer shadow-xs border border-black dark:border-white"
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
              <div className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-3xl flex items-center justify-center font-bold text-2xl shadow-sm bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
                      {gradeOutOf10}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-black dark:text-white">
                        {score >= 80
                          ? '¡Excelente dominio matemático!'
                          : score >= 60
                          ? '¡Buen intento! Reforcemos algunos detalles'
                          : 'Oportunidad ideal para repasar los conceptos'}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-xs font-bold cursor-pointer transition-colors border border-black dark:border-white"
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
            <h3 className="text-base font-bold text-black dark:text-white">
              Revisión Detallada & Explicación Paso a Paso de Cada Pregunta:
            </h3>

            {currentExam.questions.map((q, idx) => {
              const selectedOptionId = userAnswers[q.id];
              const isCorrect = selectedOptionId === q.correctOptionId;

              return (
                <div
                  key={q.id}
                  className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 transition-all shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-black text-white dark:bg-white dark:text-black">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-neutral-500">
                        {q.topic}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrect ? (
                        <span className="text-xs font-bold text-black dark:text-white flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Correcta
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-neutral-500 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          Incorrecta
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Latex */}
                  <div className="py-3 text-sm font-semibold text-black dark:text-white">
                    <MathText content={q.questionLatex} />
                  </div>

                  {/* Options status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                    {q.options.map((opt) => {
                      const isUserChoice = selectedOptionId === opt.id;
                      const isActualCorrect = opt.id === q.correctOptionId;

                      let badgeClass = 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300';
                      if (isActualCorrect) {
                        badgeClass = 'bg-neutral-200 dark:bg-neutral-800 border-black dark:border-white text-black dark:text-white font-bold ring-1 ring-black dark:ring-white';
                      } else if (isUserChoice && !isActualCorrect) {
                        badgeClass = 'bg-neutral-100 dark:bg-neutral-900 border-neutral-400 dark:border-neutral-600 text-neutral-500 line-through';
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
                          {isActualCorrect && <CheckCircle2 className="w-4 h-4 text-black dark:text-white shrink-0" />}
                          {isUserChoice && !isActualCorrect && <XCircle className="w-4 h-4 text-neutral-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Step-by-Step Pedagogical Explanation */}
                  <div className="mt-4 p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      <span>Procedimiento formal paso a paso (¿Por qué es esa la respuesta?):</span>
                    </div>
                    <MathText
                      content={q.stepByStepExplanation}
                      className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed"
                    />

                    {q.commonMistake && (
                      <div className="pt-2 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                        <strong>Error común en exámenes:</strong> {q.commonMistake}
                      </div>
                    )}
                  </div>

                  {/* Action to Practice in Socratic Tutor */}
                  <div className="mt-3 pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onSendToTutor(q.questionLatex)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-black dark:text-white underline hover:opacity-75 cursor-pointer"
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

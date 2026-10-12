import React from 'react';
import { History, Award, BookOpen, Trash2, ArrowRight, Calendar, Clock } from 'lucide-react';
import { MathText } from '../utils/katexRenderer';
import { GuidedProblem, ExamAttempt } from '../types/math';

interface HistoryViewProps {
  guidedProblems: GuidedProblem[];
  examAttempts: ExamAttempt[];
  onOpenProblem: (problem: GuidedProblem) => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  guidedProblems,
  examAttempts,
  onOpenProblem,
  onClearHistory,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-black dark:text-white">
              Historial de Estudio & Progreso
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Guardado automáticamente en tu dispositivo (sin necesidad de cuenta ni registro).
            </p>
          </div>
        </div>

        {(guidedProblems.length > 0 || examAttempts.length > 0) && (
          <button
            type="button"
            onClick={onClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-xs font-semibold cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Borrar Historial</span>
          </button>
        )}
      </div>

      {/* Grid: 2 columns for Guided Problems and Exam Attempts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Guided Problems */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-black dark:text-white" />
            <span>Ejercicios Trabajados en el Tutor ({guidedProblems.length})</span>
          </h3>

          {guidedProblems.length === 0 ? (
            <div className="bg-white dark:bg-black rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
              Aún no has resuelto ejercicios. ¡Empieza en la pestaña de Tutor Socrático!
            </div>
          ) : (
            <div className="space-y-3">
              {guidedProblems.map((prob) => {
                const dateStr = new Date(prob.createdAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                });

                return (
                  <div
                    key={prob.id}
                    className="bg-white dark:bg-black rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-white transition-all flex flex-col justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-black dark:text-white">
                          {prob.topic}
                        </span>
                        <span className="text-neutral-400">{dateStr}</span>
                      </div>

                      <div className="text-xs font-medium text-black dark:text-white line-clamp-2">
                        <MathText content={prob.identifiedProblemLatex} />
                      </div>

                      <div className="mt-2 text-[11px] text-neutral-500">
                        Pasos completados: {prob.completedSteps.length} de {prob.steps.length}
                        {prob.revealedSolution && ' • Solución formal desbloqueada'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => onOpenProblem(prob)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-black dark:text-white underline hover:opacity-75 cursor-pointer"
                      >
                        <span>Revisar procedimiento</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: Exam Attempts */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
            <Award className="w-4 h-4 text-black dark:text-white" />
            <span>Simulacros de Exámenes Realizados ({examAttempts.length})</span>
          </h3>

          {examAttempts.length === 0 ? (
            <div className="bg-white dark:bg-black rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
              Aún no has completado ningún simulacro. Pon a prueba tus habilidades en la pestaña de Exámenes.
            </div>
          ) : (
            <div className="space-y-3">
              {examAttempts.map((att) => {
                const dateStr = new Date(att.date).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={att.id}
                    className="bg-white dark:bg-black rounded-2xl p-4 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-black dark:text-white">
                        {att.examTitle}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {dateStr}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {Math.floor(att.timeSpentSeconds / 60)}m {att.timeSpentSeconds % 60}s
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 font-medium">
                        {att.correctCount} de {att.totalQuestions} aciertos
                      </div>
                    </div>

                    <div className="text-lg font-bold px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
                      {att.score}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

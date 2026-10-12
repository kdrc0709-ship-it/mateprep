import React, { useState, useEffect } from 'react';
import { Header, ActiveTab } from './components/Header';
import { ChatTutorView } from './components/ChatTutorView';
import { ExamSimulatorView } from './components/ExamSimulatorView';
import { FormulaSheetView } from './components/FormulaSheetView';
import { GraphingCalculator } from './components/GraphingCalculator';
import { ScratchpadModal } from './components/ScratchpadModal';
import { ExamAttempt } from './types/math';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('math_prepa_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Navigation tab (defaults to simple conversational chat)
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');

  // Scratchpad modal
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Cross-tab transfer text for chat tutor
  const [presetTutorText, setPresetTutorText] = useState<string>('');

  // Local storage history for exam attempts
  const [examAttempts, setExamAttempts] = useState<ExamAttempt[]>(() => {
    try {
      const saved = localStorage.getItem('math_exam_attempts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Apply dark mode class to root HTML
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('math_prepa_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('math_prepa_theme', 'light');
    }
  }, [isDarkMode]);

  // Save exam attempt
  const handleSaveExamAttempt = (attempt: ExamAttempt) => {
    setExamAttempts((prev) => {
      const updated = [attempt, ...prev];
      localStorage.setItem('math_exam_attempts', JSON.stringify(updated.slice(0, 30)));
      return updated;
    });
  };

  // Bridge from Exam or Formula sheet to Tutor
  const handleSendToTutor = (problemText: string) => {
    setPresetTutorText(problemText);
    setActiveTab('chat');
  };

  const handlePracticeTopic = (topicName: string) => {
    setPresetTutorText(`Quiero practicar un ejercicio representativo de preparatoria sobre: ${topicName}. Por favor guíame paso a paso.`);
    setActiveTab('chat');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'chat') setPresetTutorText('');
        }}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        onOpenScratchpad={() => setIsScratchpadOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-3 flex flex-col">
        {activeTab === 'chat' && (
          <ChatTutorView
            key={presetTutorText}
            presetText={presetTutorText}
            onOpenScratchpad={() => setIsScratchpadOpen(true)}
          />
        )}

        {activeTab === 'exam' && (
          <ExamSimulatorView
            onOpenScratchpad={() => setIsScratchpadOpen(true)}
            onSendToTutor={handleSendToTutor}
            onSaveExamAttempt={handleSaveExamAttempt}
          />
        )}

        {activeTab === 'formulas' && (
          <FormulaSheetView onPracticeTopic={handlePracticeTopic} />
        )}

        {activeTab === 'grapher' && <GraphingCalculator />}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              MatePrep
            </span>{' '}
            — Tutor IA paso a paso • Sin respuestas secas • Exámenes simulados
          </div>
          <div className="flex items-center gap-4">
            <span>Sin cuenta • Modo Oscuro / Blanco</span>
            <button
              type="button"
              onClick={() => setIsScratchpadOpen(true)}
              className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Pizarra
            </button>
          </div>
        </div>
      </footer>

      {/* Interactive Scratchpad Modal */}
      <ScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

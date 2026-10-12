export type MathDifficulty = 'Básico' | 'Intermedio' | 'Avanzado' | 'Olimpiada / Examen Admisión';

export interface KeyFormula {
  name: string;
  formula: string;
  whyItWorks: string;
}

export interface GuidedStep {
  stepNumber: number;
  title: string;
  goal: string;
  pedagogicalExplanation: string;
  guidingHint: string;
  checkQuestion: string;
  intermediateResultDescription: string;
}

export interface GuidedProblem {
  id: string;
  createdAt: string;
  originalInputText?: string;
  originalImagePreview?: string;
  topic: string;
  difficulty: MathDifficulty;
  identifiedProblemLatex: string;
  learningObjective: string;
  prerequisites: string[];
  keyFormulas: KeyFormula[];
  steps: GuidedStep[];
  commonPitfalls: string[];
  finalReflectionPrompt: string;
  // User progress
  currentStepIndex: number;
  completedSteps: number[]; // step numbers
  userStepAttempts: Record<number, {
    input: string;
    feedback?: StepFeedback;
  }>;
  revealedSolution?: FullSolution;
}

export interface StepFeedback {
  isCorrect: boolean | 'partial';
  encouragingMessage: string;
  detailedFeedback: string;
  suggestedNextAction: string;
  hintIfStuck: string;
}

export interface FullSolution {
  finalAnswerLatex: string;
  fullStepByStepBreakdown: {
    step: number;
    title: string;
    work: string;
    explanation: string;
  }[];
  verificationMethod: string;
  geometricOrRealLifeInsight?: string;
  takeawayRule: string;
}

export interface ExamOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

export interface ExamQuestion {
  id: string;
  questionNumber: number;
  topic: string;
  questionLatex: string;
  options: ExamOption[];
  correctOptionId: 'A' | 'B' | 'C' | 'D';
  pedagogicalHint: string;
  stepByStepExplanation: string;
  commonMistake: string;
}

export interface Exam {
  id: string;
  createdAt: string;
  examTitle: string;
  description: string;
  topic: string;
  difficulty: string;
  targetTimeMinutes: number;
  questions: ExamQuestion[];
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  topic: string;
  date: string;
  timeSpentSeconds: number;
  answers: Record<string, 'A' | 'B' | 'C' | 'D'>;
  score: number; // percentage (0 - 100)
  totalQuestions: number;
  correctCount: number;
}

export interface ConceptExplanation {
  conceptName: string;
  intuitiveAnalogy: string;
  formalFormula: string;
  whyItWorks: string;
  quickExample: {
    problem: string;
    solutionSteps: string[];
    result: string;
  };
  examTip: string;
}

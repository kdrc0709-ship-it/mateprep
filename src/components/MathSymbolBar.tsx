import React from 'react';

interface MathSymbolBarProps {
  onInsert: (symbol: string) => void;
}

const SYMBOLS = [
  { label: '√x', insert: '\\sqrt{x}', title: 'Raíz cuadrada' },
  { label: 'x²', insert: '^2', title: 'Potencia al cuadrado' },
  { label: 'xⁿ', insert: '^{n}', title: 'Potencia general' },
  { label: 'a/b', insert: '\\frac{a}{b}', title: 'Fracción' },
  { label: '±', insert: '\\pm', title: 'Más o menos' },
  { label: 'π', insert: '\\pi', title: 'Pi' },
  { label: 'θ', insert: '\\theta', title: 'Ángulo theta' },
  { label: '∫', insert: '\\int ', title: 'Integral' },
  { label: 'd/dx', insert: '\\frac{d}{dx}', title: 'Derivada' },
  { label: 'lim', insert: '\\lim_{x \\to 0}', title: 'Límite' },
  { label: '≤', insert: '\\le', title: 'Menor o igual' },
  { label: '≥', insert: '\\ge', title: 'Mayor o igual' },
  { label: '≠', insert: '\\neq', title: 'Diferente' },
  { label: '∞', insert: '\\infty', title: 'Infinito' },
  { label: 'sin', insert: '\\sin(', title: 'Seno' },
  { label: 'cos', insert: '\\cos(', title: 'Coseno' },
  { label: 'tan', insert: '\\tan(', title: 'Tangente' },
  { label: 'log', insert: '\\log(', title: 'Logaritmo' },
  { label: 'ln', insert: '\\ln(', title: 'Logaritmo natural' },
  { label: '∑', insert: '\\sum_{i=1}^{n}', title: 'Sumatoria' },
];

export const MathSymbolBar: React.FC<MathSymbolBarProps> = ({ onInsert }) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mr-1 select-none flex items-center gap-1">
        <span>Símbolos:</span>
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {SYMBOLS.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => onInsert(s.insert)}
            title={s.title}
            className="px-2 py-1 text-xs font-mono font-medium rounded-md bg-white dark:bg-black text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 shadow-2xs transition-colors cursor-pointer select-none"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};

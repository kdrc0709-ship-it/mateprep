import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  inlineOnly?: boolean;
}

/**
 * Parses mixed text containing LaTeX formulas:
 * $$...$$ for display math
 * $...$ or \(...\) or \[...\] for inline/block math
 */
export const MathText: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split by $$...$$ and $...$
  const parts: React.ReactNode[] = [];
  
  // Regex to match block math $$...$$, \[...\], and inline math $...$, \(...\)
  const regex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\$(?:\\.|[^$\\\n])+\$|\\\([\s\S]*?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      const textChunk = content.substring(lastIndex, match.index);
      parts.push(renderFormattedText(textChunk, `txt-${lastIndex}`));
    }

    const matchedStr = match[0];
    const key = `math-${match.index}`;

    let isDisplay = false;
    let mathExpr = '';

    if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      isDisplay = true;
      mathExpr = matchedStr.slice(2, -2).trim();
    } else if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      isDisplay = true;
      mathExpr = matchedStr.slice(2, -2).trim();
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      isDisplay = false;
      mathExpr = matchedStr.slice(1, -1).trim();
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      isDisplay = false;
      mathExpr = matchedStr.slice(2, -2).trim();
    }

    try {
      const html = katex.renderToString(mathExpr, {
        displayMode: isDisplay,
        throwOnError: false,
        strict: false,
      });

      if (isDisplay) {
        parts.push(
          <div
            key={key}
            className="my-3 overflow-x-auto py-1 text-center font-serif text-slate-800 dark:text-slate-100"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } else {
        parts.push(
          <span
            key={key}
            className="mx-0.5 inline-block font-serif text-slate-900 dark:text-slate-100 align-baseline"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    } catch {
      // Fallback
      parts.push(
        <code key={key} className="rounded bg-slate-100 px-1 py-0.5 text-xs text-rose-600 dark:bg-slate-800 dark:text-rose-400">
          {mathExpr}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text
  if (lastIndex < content.length) {
    parts.push(renderFormattedText(content.substring(lastIndex), `txt-${lastIndex}`));
  }

  return <div className={`math-content leading-relaxed ${className}`}>{parts}</div>;
};

/**
 * Helper to render bold **text**, bullet points, linebreaks cleanly
 */
function renderFormattedText(text: string, baseKey: string): React.ReactNode {
  const lines = text.split('\n');
  return (
    <span key={baseKey}>
      {lines.map((line, lIdx) => {
        // Simple bold parser
        const boldRegex = /\*\*(.*?)\*\*/g;
        const subParts: React.ReactNode[] = [];
        let subLast = 0;
        let bMatch: RegExpExecArray | null;

        while ((bMatch = boldRegex.exec(line)) !== null) {
          if (bMatch.index > subLast) {
            subParts.push(line.substring(subLast, bMatch.index));
          }
          subParts.push(
            <strong key={`b-${lIdx}-${bMatch.index}`} className="font-semibold text-slate-900 dark:text-white">
              {bMatch[1]}
            </strong>
          );
          subLast = boldRegex.lastIndex;
        }

        if (subLast < line.length) {
          subParts.push(line.substring(subLast));
        }

        return (
          <React.Fragment key={`line-${lIdx}`}>
            {subParts}
            {lIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </span>
  );
}

/**
 * Pure formula renderer (e.g. for badges, chips, formulas)
 */
export const FormulaBadge: React.FC<{ formula: string; displayMode?: boolean; className?: string }> = ({
  formula,
  displayMode = false,
  className = '',
}) => {
  // Strip outer $ or $$ if provided
  let clean = formula.trim();
  if (clean.startsWith('$$') && clean.endsWith('$$')) {
    clean = clean.slice(2, -2);
    displayMode = true;
  } else if (clean.startsWith('$') && clean.endsWith('$')) {
    clean = clean.slice(1, -1);
  }

  try {
    const html = katex.renderToString(clean, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
    return (
      <span
        className={`inline-block font-serif ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return <span className={`font-mono text-xs ${className}`}>{clean}</span>;
  }
};

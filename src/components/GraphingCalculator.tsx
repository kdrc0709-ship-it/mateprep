import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, LineChart, HelpCircle } from 'lucide-react';
import { MathSymbolBar } from './MathSymbolBar';

interface GraphingCalculatorProps {
  initialExpression?: string;
}

export const GraphingCalculator: React.FC<GraphingCalculatorProps> = ({
  initialExpression = 'x^2 - 4',
}) => {
  const [expression, setExpression] = useState(initialExpression);
  const [scale, setScale] = useState(40); // pixels per unit
  const [centerX, setCenterX] = useState(0); // center offset in units
  const [centerY, setCenterY] = useState(0);
  const [evaluateX, setEvaluateX] = useState<number>(2);
  const [evaluatedY, setEvaluatedY] = useState<number | null>(null);
  const [showTangent, setShowTangent] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Safe mathematical parser for high school expressions (x, numbers, +, -, *, /, ^, sin, cos, tan, sqrt, abs, log, ln)
  const evaluateMath = (exprStr: string, xVal: number): number => {
    try {
      let sanitized = exprStr
        .replace(/\^/g, '**')
        .replace(/(\d)(x)/g, '$1*$2') // 2x -> 2*x
        .replace(/\)(\()/g, ')*(')
        .replace(/(\d)\(/g, '$1*(')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/abs\(/g, 'Math.abs(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/pi/gi, 'Math.PI')
        .replace(/e\b/gi, 'Math.E');

      // Substitute variable x safely
      const fn = new Function('x', `with(Math) { return ${sanitized}; }`);
      const val = fn(xVal);
      return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : NaN;
    } catch {
      return NaN;
    }
  };

  // Numerical derivative for tangent
  const numericalDerivative = (exprStr: string, xVal: number): number => {
    const h = 0.0001;
    const y1 = evaluateMath(exprStr, xVal + h);
    const y0 = evaluateMath(exprStr, xVal - h);
    return (y1 - y0) / (2 * h);
  };

  useEffect(() => {
    const yVal = evaluateMath(expression, evaluateX);
    setEvaluatedY(isNaN(yVal) ? null : yVal);
  }, [expression, evaluateX]);

  // Render plot
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const originX = width / 2 - centerX * scale;
    const originY = height / 2 + centerY * scale;

    // Draw Grid
    const isDark = document.documentElement.classList.contains('dark');
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;

    const startXUnit = Math.floor(-originX / scale);
    const endXUnit = Math.ceil((width - originX) / scale);

    const startYUnit = Math.floor(-(height - originY) / scale);
    const endYUnit = Math.ceil(originY / scale);

    ctx.beginPath();
    for (let u = startXUnit; u <= endXUnit; u++) {
      const px = originX + u * scale;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, height);
    }
    for (let u = startYUnit; u <= endYUnit; u++) {
      const py = originY - u * scale;
      ctx.moveTo(0, py);
      ctx.lineTo(width, py);
    }
    ctx.stroke();

    // Draw Axes
    ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // X Axis
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    // Y Axis
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Axis Labels & Numbers
    ctx.fillStyle = isDark ? '#cbd5e1' : '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';

    const step = scale < 25 ? 5 : scale < 50 ? 2 : 1;

    for (let u = startXUnit; u <= endXUnit; u++) {
      if (u === 0 || u % step !== 0) continue;
      const px = originX + u * scale;
      ctx.fillText(`${u}`, px, Math.min(Math.max(originY + 14, 14), height - 4));
    }

    ctx.textAlign = 'right';
    for (let u = startYUnit; u <= endYUnit; u++) {
      if (u === 0 || u % step !== 0) continue;
      const py = originY - u * scale;
      ctx.fillText(`${u}`, Math.min(Math.max(originX - 6, 20), width - 4), py + 4);
    }

    // Plot function
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let isDrawingLine = false;

    for (let px = 0; px <= width; px += 1.5) {
      const xVal = (px - originX) / scale;
      const yVal = evaluateMath(expression, xVal);

      if (isNaN(yVal) || Math.abs(yVal) > 500) {
        isDrawingLine = false;
        continue;
      }

      const py = originY - yVal * scale;

      if (!isDrawingLine) {
        ctx.moveTo(px, py);
        isDrawingLine = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // Point evaluated
    if (evaluatedY !== null) {
      const ptX = originX + evaluateX * scale;
      const ptY = originY - evaluatedY * scale;

      // Draw point
      ctx.fillStyle = isDark ? '#ffffff' : '#000000';
      ctx.beginPath();
      ctx.arc(ptX, ptY, 5, 0, Math.PI * 2);
      ctx.fill();

      // Tangent line if toggled
      if (showTangent) {
        const m = numericalDerivative(expression, evaluateX);
        if (!isNaN(m)) {
          ctx.strokeStyle = isDark ? '#aaaaaa' : '#555555';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          const tLength = 4;
          const xA = evaluateX - tLength;
          const yA = evaluatedY - m * tLength;
          const xB = evaluateX + tLength;
          const yB = evaluatedY + m * tLength;
          ctx.moveTo(originX + xA * scale, originY - yA * scale);
          ctx.lineTo(originX + xB * scale, originY - yB * scale);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
  }, [expression, scale, centerX, centerY, evaluateX, evaluatedY, showTangent]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = (e.clientX - dragStartRef.current.x) / scale;
    const dy = (e.clientY - dragStartRef.current.y) / scale;
    setCenterX((prev) => prev - dx);
    setCenterY((prev) => prev + dy);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const PRESETS = [
    { label: 'Parábola: x² - 4', expr: 'x^2 - 4' },
    { label: 'Recta: 2x - 1', expr: '2*x - 1' },
    { label: 'Cúbica: x³ - 3x', expr: 'x^3 - 3*x' },
    { label: 'Seno: sin(x)', expr: 'sin(x)' },
    { label: 'Coseno: cos(2x)', expr: 'cos(2*x)' },
    { label: 'Exponencial: 2^x', expr: '2^x' },
    { label: 'Racional: 1/x', expr: '1/x' },
  ];

  return (
    <div className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <LineChart className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-black dark:text-white">
              Graficador Matemático Interactivo (Prepa)
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Visualiza funciones, analiza raíces, vértices y rectas tangentes para Cálculo y Geometría Analítica.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s * 1.25, 120))}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s / 1.25, 15))}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setScale(40);
              setCenterX(0);
              setCenterY(0);
            }}
            className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition-colors cursor-pointer"
            title="Restablecer vista centrada"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expression input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-serif italic font-bold text-black dark:text-white text-lg">
            f(x) =
          </span>
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="ej. x^2 - 4, sin(x), 2x + 3"
            className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-black dark:text-white font-mono text-sm focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mr-1">
            Ejemplos:
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setExpression(p.expr)}
              className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shadow-inner">
        <canvas
          ref={canvasRef}
          width={720}
          height={380}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-[380px] cursor-grab active:cursor-grabbing block"
        />

        {/* Floating Controls inside canvas */}
        <div className="absolute bottom-3 left-3 bg-white/95 dark:bg-black/95 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs flex flex-wrap items-center gap-3 shadow-md text-black dark:text-white">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-neutral-600 dark:text-neutral-400">Evaluar x:</span>
            <input
              type="number"
              value={evaluateX}
              onChange={(e) => setEvaluateX(parseFloat(e.target.value) || 0)}
              step="0.5"
              className="w-14 px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono text-center text-xs text-black dark:text-white"
            />
          </div>

          <div className="font-mono text-black dark:text-white font-bold">
            f({evaluateX}) = {evaluatedY !== null ? evaluatedY.toFixed(3) : 'Indefinido'}
          </div>

          <label className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showTangent}
              onChange={(e) => setShowTangent(e.target.checked)}
              className="rounded accent-black dark:accent-white cursor-pointer"
            />
            <span>Recta tangente (Derivada)</span>
          </label>
        </div>
      </div>
    </div>
  );
};

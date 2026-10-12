import React, { useState } from 'react';
import { BookOpen, Search, Sparkles, Lightbulb, ChevronRight, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { MathText, FormulaBadge } from '../utils/katexRenderer';
import { ConceptExplanation } from '../types/math';

interface FormulaSheetViewProps {
  onPracticeTopic: (topicName: string) => void;
}

interface FormulaItem {
  id: string;
  name: string;
  category: string;
  latex: string;
  description: string;
  keyUse: string;
}

const PREPA_FORMULAS: FormulaItem[] = [
  // Álgebra
  {
    id: 'alg-1',
    name: 'Fórmula General para Ecuaciones Cuadráticas',
    category: 'Álgebra',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    description: 'Resuelve cualquier ecuación de la forma $ax^2 + bx + c = 0$. El discriminante $\\Delta = b^2 - 4ac$ indica si hay dos soluciones reales, una doble o complejas.',
    keyUse: 'Ecuaciones de segundo grado y cálculo de raíces en parábolas.',
  },
  {
    id: 'alg-2',
    name: 'Diferencia de Cuadrados',
    category: 'Álgebra',
    latex: 'a^2 - b^2 = (a - b)(a + b)',
    description: 'Factorización fundamental para simplificar fracciones algebraicas y calcular límites indeterminados $\\frac{0}{0}$.',
    keyUse: 'Factorización rápida y racionalización de denominadores con conjugados.',
  },
  {
    id: 'alg-3',
    name: 'Binomio al Cuadrado (Trinomio Cuadrado Perfecto)',
    category: 'Álgebra',
    latex: '(a \\pm b)^2 = a^2 \\pm 2ab + b^2',
    description: 'El cuadrado del primer término, más o menos el doble producto del primero por el segundo, más el cuadrado del segundo.',
    keyUse: 'Completar el cuadrado para transformar ecuaciones canónicas de cónicas.',
  },
  {
    id: 'alg-4',
    name: 'Leyes de los Exponentes y Radicales',
    category: 'Álgebra',
    latex: 'x^a \\cdot x^b = x^{a+b}, \\quad \\frac{x^a}{x^b} = x^{a-b}, \\quad (x^a)^b = x^{ab}, \\quad \\sqrt[n]{x^m} = x^{\\frac{m}{n}}',
    description: 'Propiedades esenciales para simplificar potencias y preparar expresiones para ser derivadas o integradas.',
    keyUse: 'Simplificación algebraica y conversión de raíces a potencias fraccionarias.',
  },

  // Trigonometría & Geometría
  {
    id: 'trig-1',
    name: 'Teorema de Pitágoras',
    category: 'Geometría y Trigonometría',
    latex: 'c^2 = a^2 + b^2 \\implies c = \\sqrt{a^2 + b^2}',
    description: 'En todo triángulo rectángulo, el cuadrado de la hipotenusa es igual a la suma de los cuadrados de los catetos.',
    keyUse: 'Cálculo de distancias, vectores y módulos.',
  },
  {
    id: 'trig-2',
    name: 'Razones Trigonométricas Fundamentales (SOH CAH TOA)',
    category: 'Geometría y Trigonometría',
    latex: '\\sin(\\theta) = \\frac{\\text{Opuesto}}{\\text{Hip}}, \\quad \\cos(\\theta) = \\frac{\\text{Adyacente}}{\\text{Hip}}, \\quad \\tan(\\theta) = \\frac{\\text{Opuesto}}{\\text{Adyacente}}',
    description: 'Relación entre los ángulos agudos y los lados de un triángulo rectángulo.',
    keyUse: 'Problemas de sombras, alturas inaccesibles y descomposición de fuerzas.',
  },
  {
    id: 'trig-3',
    name: 'Identidad Pitagórica Fundamental',
    category: 'Geometría y Trigonometría',
    latex: '\\sin^2(\\theta) + \\cos^2(\\theta) = 1',
    description: 'Se deriva directamente de la circunferencia unitaria ($x^2 + y^2 = 1$).',
    keyUse: 'Simplificación de identidades trigonométricas y sustitución en integrales.',
  },
  {
    id: 'trig-4',
    name: 'Ley de Senos y Ley de Cosenos',
    category: 'Geometría y Trigonometría',
    latex: '\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)} = \\frac{c}{\\sin(C)}, \\quad c^2 = a^2 + b^2 - 2ab\\cos(C)',
    description: 'Para resolver triángulos oblicuángulos (que no tienen ningún ángulo recto).',
    keyUse: 'Navegación, topografía y exámenes de admisión universitaria.',
  },

  // Geometría Analítica
  {
    id: 'geo-1',
    name: 'Distancia entre dos Puntos y Pendiente',
    category: 'Geometría Analítica',
    latex: 'd = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}, \\quad m = \\frac{y_2 - y_1}{x_2 - x_1}',
    description: 'La pendiente $m$ representa la inclinación o razón de cambio entre los dos puntos.',
    keyUse: 'Ecuación de la recta y paralelismo ($m_1 = m_2$) o perpendicularidad ($m_1 \\cdot m_2 = -1$).',
  },
  {
    id: 'geo-2',
    name: 'Ecuación de la Recta Punto-Pendiente y Canónica',
    category: 'Geometría Analítica',
    latex: 'y - y_1 = m(x - x_1) \\iff y = mx + b',
    description: 'Permite modelar fenómenos lineales y encontrar la recta tangente a una curva.',
    keyUse: 'Modelación lineal y rectas tangentes en Cálculo.',
  },
  {
    id: 'geo-3',
    name: 'Ecuación Ordinaria de la Circunferencia',
    category: 'Geometría Analítica',
    latex: '(x - h)^2 + (y - k)^2 = r^2',
    description: 'Circunferencia con centro en $C(h, k)$ y radio $r$.',
    keyUse: 'Geometría analítica de las secciones cónicas.',
  },
  {
    id: 'geo-4',
    name: 'Ecuación de la Parábola con Vértice (h, k)',
    category: 'Geometría Analítica',
    latex: '(x - h)^2 = 4p(y - k) \\quad \\text{o} \\quad (y - k)^2 = 4p(x - h)',
    description: 'Donde $p$ es la distancia focal del vértice al foco y a la directriz.',
    keyUse: 'Tiro parabólico en física y optimización cuadrática.',
  },

  // Cálculo Diferencial
  {
    id: 'calc-1',
    name: 'Definición de Derivada y Regla de la Potencia',
    category: 'Cálculo Diferencial',
    latex: 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}, \\quad \\frac{d}{dx}[x^n] = n x^{n-1}',
    description: 'La derivada mide la tasa de cambio instantánea y la pendiente de la recta tangente.',
    keyUse: 'Velocidad instantánea, cálculo de derivadas inmediatas y polinomios.',
  },
  {
    id: 'calc-2',
    name: 'Regla de la Cadena',
    category: 'Cálculo Diferencial',
    latex: '\\frac{d}{dx}[f(g(x))] = f\'(g(x)) \\cdot g\'(x)',
    description: 'Derivada de una función compuesta: "deriva lo de afuera evaluado en lo de adentro por la derivada de lo de adentro".',
    keyUse: 'Derivar funciones trigonométricas con argumento compuesto o potencias complejas.',
  },
  {
    id: 'calc-3',
    name: 'Criterio de la Primera y Segunda Derivada (Máximos y Mínimos)',
    category: 'Cálculo Diferencial',
    latex: 'f\'(x) = 0 \\implies x_c \\text{ (punto crítico)}; \\quad f\'\'(x_c) > 0 \\implies \\text{Mínimo}, \\quad f\'\'(x_c) < 0 \\implies \\text{Máximo}',
    description: 'Permite optimizar recursos (minimizar costos o maximizar áreas/volúmenes).',
    keyUse: 'Problemas de optimización de preparatoria y trazado de curvas.',
  },

  // Cálculo Integral
  {
    id: 'int-1',
    name: 'Teorema Fundamental del Cálculo e Integral Inmediata',
    category: 'Cálculo Integral',
    latex: '\\int x^n \\, dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1), \\quad \\int_a^b f(x)\\,dx = F(b) - F(a)',
    description: 'Relaciona la antiderivada con el cálculo exacto del área bajo la curva.',
    keyUse: 'Cálculo de áreas, trabajo físico y acumulación.',
  },
  {
    id: 'int-2',
    name: 'Integración por Partes (Método de la Vaca)',
    category: 'Cálculo Integral',
    latex: '\\int u \\, dv = u v - \\int v \\, du',
    description: 'Nemotecnia clásica: "Un Día Vi Una Vaca Vestida De Uniforme". Útil cuando hay producto de funciones distintas (polinomio con exponencial o trigonométrica).',
    keyUse: 'Integrales con polinomios multiplicados por $\\sin$, $\\cos$, $e^x$ o $\\ln(x)$.',
  },

  // Probabilidad
  {
    id: 'prob-1',
    name: 'Permutaciones y Combinaciones',
    category: 'Probabilidad y Estadística',
    latex: 'P(n, r) = \\frac{n!}{(n-r)!}, \\quad C(n, r) = \\binom{n}{r} = \\frac{n!}{r!(n-r)!}',
    description: 'En las permutaciones importa el orden (ej. clave de acceso); en las combinaciones no importa el orden (ej. equipo de personas o mano de cartas).',
    keyUse: 'Conteo en probabilidad clásica y problemas de selección.',
  },
];

export const FormulaSheetView: React.FC<FormulaSheetViewProps> = ({ onPracticeTopic }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [explainingConcept, setExplainingConcept] = useState<string | null>(null);
  const [conceptData, setConceptData] = useState<ConceptExplanation | null>(null);
  const [isLoadingConcept, setIsLoadingConcept] = useState(false);

  const categories = ['Todas', 'Álgebra', 'Geometría y Trigonometría', 'Geometría Analítica', 'Cálculo Diferencial', 'Cálculo Integral', 'Probabilidad y Estadística'];

  const filtered = PREPA_FORMULAS.filter((f) => {
    const matchesCategory = selectedCategory === 'Todas' || f.category === selectedCategory;
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.keyUse.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAskAIConcept = async (formula: FormulaItem) => {
    setExplainingConcept(formula.name);
    setIsLoadingConcept(true);
    setConceptData(null);

    try {
      const res = await fetch('/api/math/concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptQuery: `${formula.name} (${formula.category}): ${formula.latex}. Explica su significado intuitivo para un estudiante de preparatoria.`,
        }),
      });

      if (!res.ok) throw new Error('Error al conectar con la IA');
      const data = await res.json();
      setConceptData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConcept(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-black rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-black text-white dark:bg-white dark:text-black">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-black dark:text-white">
                Formulario Oficial & Biblioteca de Conceptos de Prepa
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Todas las fórmulas esenciales de bachillerato con explicaciones conceptuales del «por qué» y práctica socrática.
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por fórmula, tema (ej. Pitágoras, Cuadrática, Cadena, Integrales)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-black dark:focus:ring-white cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Concept Explanation Modal / Drawer */}
      {explainingConcept && (
        <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-3xl p-6 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-300 dark:border-neutral-700">
            <div className="flex items-center gap-2 text-black dark:text-white font-bold">
              <Sparkles className="w-5 h-5 text-black dark:text-white" />
              <span>Explicación Intuitiva de la IA: {explainingConcept}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setExplainingConcept(null);
                setConceptData(null);
              }}
              className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-black text-black dark:text-white border border-neutral-300 dark:border-neutral-700 hover:opacity-80 cursor-pointer"
            >
              Cerrar explicación
            </button>
          </div>

          {isLoadingConcept ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-black dark:text-white">
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Generando analogía visual y explicación paso a paso...</p>
            </div>
          ) : conceptData ? (
            <div className="mt-4 space-y-4">
              <div className="p-3.5 bg-white dark:bg-black rounded-2xl border border-neutral-300 dark:border-neutral-700">
                <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 mb-1">
                  <Lightbulb className="w-4 h-4" />
                  Analogía de la vida real (¿Cómo entenderlo fácilmente?)
                </span>
                <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {conceptData.intuitiveAnalogy}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 bg-white dark:bg-black rounded-2xl border border-neutral-300 dark:border-neutral-700">
                  <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    ¿Por qué funciona matemáticamente?
                  </span>
                  <MathText content={conceptData.whyItWorks} className="text-xs text-neutral-800 dark:text-neutral-200" />
                </div>

                <div className="p-3.5 bg-white dark:bg-black rounded-2xl border border-neutral-300 dark:border-neutral-700">
                  <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Consejo clave para exámenes de Prepa
                  </span>
                  <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    {conceptData.examTip}
                  </p>
                </div>
              </div>

              {conceptData.quickExample && (
                <div className="p-4 bg-white dark:bg-black rounded-2xl border border-neutral-300 dark:border-neutral-700 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
                    Mini-ejemplo resuelto paso a paso:
                  </span>
                  <MathText content={conceptData.quickExample.problem} className="text-sm font-medium text-black dark:text-white" />
                  <div className="space-y-1 pl-3 border-l-2 border-black dark:border-white">
                    {conceptData.quickExample.solutionSteps.map((step, idx) => (
                      <div key={idx} className="text-xs text-neutral-700 dark:text-neutral-300">
                        <MathText content={step} />
                      </div>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-black dark:text-white pt-1">
                    <MathText content={`Resultado: ${conceptData.quickExample.result}`} />
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((formula) => (
          <div
            key={formula.id}
            className="bg-white dark:bg-black rounded-3xl p-5 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-black dark:hover:border-white transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-black dark:text-white border border-neutral-300 dark:border-neutral-700">
                    {formula.category}
                  </span>
                  <h3 className="text-base font-bold text-black dark:text-white mt-1.5">
                    {formula.name}
                  </h3>
                </div>
              </div>

              {/* Formula Display with KaTeX */}
              <div className="my-3 p-3 bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center overflow-x-auto text-black dark:text-white">
                <FormulaBadge formula={formula.latex} displayMode={true} className="text-lg text-black dark:text-white font-semibold" />
              </div>

              {/* Description */}
              <div className="space-y-2 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                <MathText content={formula.description} />
                <p className="text-[11px] text-neutral-500">
                  <strong className="text-black dark:text-white">Se aplica en:</strong> {formula.keyUse}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => handleAskAIConcept(formula)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-black dark:text-white underline hover:opacity-75 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                ¿Por qué funciona? (IA)
              </button>

              <button
                type="button"
                onClick={() => onPracticeTopic(formula.name)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors cursor-pointer border border-black dark:border-white"
              >
                <span>Practicar en Tutor</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

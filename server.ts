import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MATH_MODELS = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];

// Helper to generate content with automatic model fallback in case of high demand (503)
async function generateContentWithFallback(params: { contents: any[]; config?: any }) {
  let lastError: any = null;
  for (const model of MATH_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed, trying next model in cascade... Error:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo conectar con los modelos de IA.');
}

// Helper to generate stream with automatic model fallback in case of high demand (503)
async function generateStreamWithFallback(params: { contents: any[]; config?: any }) {
  let lastError: any = null;
  for (const model of MATH_MODELS) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { stream, model };
    } catch (err: any) {
      console.warn(`Stream with model ${model} failed, trying next model in cascade... Error:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo iniciar el flujo con los modelos de IA.');
}

// System prompt enforcing Socratic, high-school math tutoring
const SOCRATIC_TUTOR_PROMPT = `
Eres un profesor y mentor de matemáticas experto en educación media superior / preparatoria (bachillerato en México y Latinoamérica, alumnos de 15 a 18 años).
Tu objetivo pedagógico primordial es:
1. NUNCA dar la respuesta final numérica/algebraica definitiva de forma directa y seca en el primer contacto.
2. GUIAR al alumno paso a paso para que comprenda qué está pasando, qué conceptos están en juego y cómo pensar el problema.
3. Descomponer el problema en etapas lógicas y amigables con explicaciones claras, lenguaje cercano y respetuoso, sin tecnicismos excesivos pero con rigor matemático.
4. Para cada paso, proporcionar una pregunta guía o punto de control para que el estudiante piense el siguiente movimiento.
5. Incluir fórmulas relevantes en formato LaTeX (entre signos $...$ o $$...$$) y destacar errores comunes que suelen cometer los estudiantes en ese tipo de problema.
6. Responder siempre en español.
`;

// Endpoint 1: Conversational Chat Tutor with multi-model fallback and streaming/json support
app.post('/api/math/chat', async (req, res) => {
  try {
    const { messages, currentInput, imageBase64, mimeType, stream = false } = req.body;

    if (!currentInput && !imageBase64) {
      return res.status(400).json({ error: 'Debes escribir un mensaje o adjuntar una imagen.' });
    }

    // Convert recent prior conversation messages to Gemini format (last 8 turns for speed)
    const contents: any[] = [];

    if (Array.isArray(messages) && messages.length > 0) {
      const recentMessages = messages.slice(-8);
      for (const msg of recentMessages) {
        const parts: any[] = [];
        if (msg.imageBase64) {
          parts.push({
            inlineData: {
              mimeType: msg.mimeType || 'image/jpeg',
              data: msg.imageBase64.replace(/^data:image\/\w+;base64,/, ''),
            },
          });
        }
        if (msg.text) {
          parts.push({ text: msg.text });
        }
        if (parts.length > 0) {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts,
          });
        }
      }
    }

    // Add current user turn
    const currentParts: any[] = [];
    if (imageBase64) {
      currentParts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }
    if (currentInput) {
      currentParts.push({ text: currentInput });
    }

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const systemInstruction = `
Eres un tutor y mentor inteligente, sumamente amable, paciente y empático para estudiantes de preparatoria y cualquier persona con dudas académicas o cotidianas.

PERSONALIDAD Y TONO:
- Sé siempre educado, cálido, positivo y motivador. Haz que el estudiante se sienta en total confianza.
- SI EL USUARIO TE SALUDA (ej. "hola", "buenas", "qué tal", "oli", "buenos días", "que onda", "hello"): responde con mucha calidez y simpatía, salúdalo amablemente y pregúntale con entusiasmo en qué le puedes ayudar hoy.
- ENTIENDE PERFECTAMENTE ABREVIATURAS Y MODISMOS de chat (ej. "q" o "k" por que, "pq" o "pk" por por qué, "xfa" o "pls" por por favor, "kiero" por quiero, "dnd" por dónde, "cto" por cuánto, "tmb" o "tb" por también, "grax" por gracias, "profe", "ola", "wey", etc.). Interpreta su significado natural sin corregir al alumno ni molestarte.

ÁREAS DE CONOCIMIENTO (RESPONDE CUALQUIER PREGUNTA):
- Responde TODO tipo de preguntas: Matemáticas, Física, Química, Biología, Historia, Filosofía, Literatura, Computación, Programación, Cultura general, Consejos de estudio para exámenes (UNAM, IPN, CENEVAL EXANI-II) o cualquier duda diaria.

METODOLOGÍA PEDAGÓGICA PARA EJERCICIOS MATEMÁTICOS O ACADÉMICOS:
1. Si el usuario plantea un problema o sube una imagen de un ejercicio:
   - NO des la respuesta final numérica o algebraica de golpe en el primer mensaje.
   - Transcribe el problema formalmente con fórmulas en LaTeX ($...$ para fórmulas inline y $$...$$ para fórmulas en bloque).
   - Explica la estrategia o fórmula inicial y plantea el PASO 1 con una pregunta guía sencilla para que el alumno piense y participe.
2. Si el usuario te responde con su cálculo o intento:
   - Valora con amabilidad su esfuerzo. Si tuvo un error de signo o despeje, señálalo con afecto y explica por qué. Si acertó, felicítalo y dale el siguiente paso.
3. Si el usuario te pide expresamente "dame la respuesta", "solución completa", o completó los pasos:
   - Entrega el desarrollo formal completo, la solución definitiva y la comprobación matemática con la regla de oro para exámenes.
4. Para cualquier otra pregunta (teórica, histórica, científica o cotidiana), explica con claridad, precisión y ejemplos cercanos.
5. Siempre responde en español con formato Markdown limpio (negritas, viñetas, fórmulas matemáticas nítidas).
`;

    // If client requested SSE streaming
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let isClientDisconnected = false;
      req.on('close', () => {
        isClientDisconnected = true;
      });

      const { stream: responseStream } = await generateStreamWithFallback({
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      for await (const chunk of responseStream) {
        if (isClientDisconnected) break;
        const textChunk = chunk.text;
        if (textChunk) {
          res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        }
      }

      if (!isClientDisconnected) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    }

    // Default fast & resilient JSON response
    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    const replyText = response.text || '¡Hola! ¿En qué te puedo ayudar hoy?';
    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error('Error in /api/math/chat:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Error en el chat.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Error durante la generación.' })}\n\n`);
      res.end();
    }
  }
});

// Endpoint 1: Guided step-by-step problem initialization
app.post('/api/math/guide', async (req, res) => {
  try {
    const { problemText, imageBase64, mimeType, topicHint } = req.body;

    if (!problemText && !imageBase64) {
      return res.status(400).json({ error: 'Debes proporcionar un problema en texto o una imagen.' });
    }

    const contents: any[] = [];

    if (imageBase64) {
      contents.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    const promptText = `
Analiza con cuidado el siguiente problema o ejercicio de matemáticas para preparatoria.
${problemText ? `Texto del usuario: "${problemText}"` : ''}
${topicHint ? `Tema especificado: "${topicHint}"` : ''}

IMPORTANTE: Diseña una guía pedagógica paso a paso para que el estudiante aprenda a resolverlo por sí mismo.
NO des la respuesta final directamente en el resumen inicial. En su lugar, guía la mente del estudiante paso a paso.

Genera una respuesta en formato JSON con la siguiente estructura exacta:
{
  "topic": "Nombre del tema (ej. Álgebra: Ecuaciones cuadráticas, Cálculo: Derivadas por regla de la cadena, etc.)",
  "difficulty": "Básico" | "Intermedio" | "Avanzado" | "Olimpiada / Examen Admisión",
  "identifiedProblemLatex": "El enunciado del problema formalmente redactado con fórmulas en LaTeX ($...$)",
  "learningObjective": "Qué habilidad o concepto aprenderá el estudiante al resolver esto",
  "prerequisites": ["Concepto 1", "Concepto 2"],
  "keyFormulas": [
    {
      "name": "Nombre de la fórmula/propiedad",
      "formula": "Fórmula en LaTeX ej. $x = \\\\frac{-b \\\\pm \\\\sqrt{b^2 - 4ac}}{2a}$",
      "whyItWorks": "Explicación intuitiva de por qué se usa aquí"
    }
  ],
  "steps": [
    {
      "stepNumber": 1,
      "title": "Título del paso (ej. Paso 1: Identificar datos y coeficientes)",
      "goal": "¿Qué queremos lograr en esta etapa?",
      "pedagogicalExplanation": "Explicación clara del razonamiento de este paso",
      "guidingHint": "Una pista o reflexión para que el estudiante intente resolver esta parte",
      "checkQuestion": "Pregunta de control para el estudiante (ej. '¿Cuáles son los valores de a, b y c en tu ecuación?')",
      "intermediateResultDescription": "Descripción de lo que debe obtenerse al terminar este paso (sin revelar la respuesta final del problema completo)"
    }
  ],
  "commonPitfalls": [
    "Error común 1 que cometen estudiantes de preparatoria en este tipo de ejercicio",
    "Error común 2"
  ],
  "finalReflectionPrompt": "Pregunta de comprobación para cuando terminen (ej. '¿Cómo puedes verificar sustituyendo el valor en la ecuación original?')"
}
`;
    contents.push({ text: promptText });

    const response = await generateContentWithFallback({
      contents,
      config: {
        systemInstruction: SOCRATIC_TUTOR_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/math/guide:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar el ejercicio de matemáticas.' });
  }
});

// Endpoint 2: Socratic feedback on student's attempt for a specific step
app.post('/api/math/step-feedback', async (req, res) => {
  try {
    const { problemLatex, currentStep, studentInput, previousHistory } = req.body;

    const prompt = `
Problema original: ${problemLatex}
Paso actual del estudiante:
- Título: ${currentStep.title}
- Objetivo: ${currentStep.goal}
- Pregunta de control: ${currentStep.checkQuestion}

Respuesta o intento del estudiante de preparatoria:
"${studentInput}"

Evalúa el intento del estudiante con paciencia y calidez pedagógica:
1. ¿El razonamiento o cálculo del estudiante en este paso es correcto, parcialmente correcto o incorrecto?
2. Si comete un error, señala amablemente en qué parte (ej. signo, despeje, propiedad) sin regañar ni frustrar.
3. Si está bien, felicítalo y dale la bienvenida al siguiente paso.
4. NUNCA le des la respuesta final definitiva del problema completo si aún faltan pasos.

Devuelve JSON con la estructura:
{
  "isCorrect": true | false | "partial",
  "encouragingMessage": "Mensaje motivador y cálido",
  "detailedFeedback": "Explicación detallada de su razonamiento con fórmulas en LaTeX ($...$)",
  "suggestedNextAction": "¿Qué debe hacer ahora el estudiante?",
  "hintIfStuck": "Una pista adicional en caso de que siga con dudas"
}
`;

    const response = await generateContentWithFallback({
      contents: [{ text: prompt }],
      config: {
        systemInstruction: SOCRATIC_TUTOR_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/math/step-feedback:', error);
    return res.status(500).json({ error: error.message || 'Error al evaluar el paso.' });
  }
});

// Endpoint 3: Reveal full step-by-step solution and mathematical verification
app.post('/api/math/reveal-solution', async (req, res) => {
  try {
    const { problemLatex, steps } = req.body;

    const prompt = `
Problema: ${problemLatex}

El estudiante ha trabajado en el problema o solicita ver la resolución completa y formal explicada con sumo detalle pedagógico para estudiar y cotejar su propio trabajo.

Desarrolla la solución completa:
1. Procedimiento formal paso a paso con fórmulas en LaTeX.
2. Respuesta final claramente enmarcada.
3. Comprobación o prueba matemática (por qué la respuesta es esa, demostrando cómo sustituirla o validarla lógicamente).
4. Interpretación gráfica o geométrica si aplica (por ejemplo, intersección con ejes, vértice de parábola, pendiente, área, etc.).

Devuelve JSON con:
{
  "finalAnswerLatex": "Resultado final formal (ej. $x_1 = 3, x_2 = -5$)",
  "fullStepByStepBreakdown": [
    {
      "step": 1,
      "title": "Título",
      "work": "Desarrollo algebraico con LaTeX ($...$)",
      "explanation": "Por qué se hizo este paso"
    }
  ],
  "verificationMethod": "Comprobación formal sustituyendo o verificando el resultado",
  "geometricOrRealLifeInsight": "Qué significa este resultado en una gráfica o en la vida real",
  "takeawayRule": "Regla de oro para recordar en tus exámenes"
}
`;

    const response = await generateContentWithFallback({
      contents: [{ text: prompt }],
      config: {
        systemInstruction: SOCRATIC_TUTOR_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/math/reveal-solution:', error);
    return res.status(500).json({ error: error.message || 'Error al obtener la solución.' });
  }
});

// Endpoint 4: Custom Exam Simulator generator
app.post('/api/exam/generate', async (req, res) => {
  try {
    const {
      topic,
      customPrompt,
      numQuestions = 5,
      difficulty = 'Intermedio',
      examType = 'prep_standard', // 'prep_standard', 'admision_universidad', 'olimpiada_reto', 'pasatiempo'
    } = req.body;

    const prompt = `
Genera un simulacro de examen de matemáticas para preparatoria (bachillerato).
Parámetros:
- Tema principal: "${topic || 'Matemáticas Generales de Preparatoria'}"
- Petición específica del usuario: "${customPrompt || 'Preguntas variadas representativas'}"
- Cantidad de preguntas: ${numQuestions}
- Dificultad: ${difficulty}
- Enfoque: ${examType}

Requisitos pedagógicos estrictos:
- Cada pregunta debe ser relevante para estudiantes de preparatoria (Álgebra, Trigonometría, Geometría Analítica, Cálculo o Probabilidad según el tema solicitado).
- Cada pregunta debe tener 4 opciones de respuesta (A, B, C, D) con fórmulas en LaTeX ($...$).
- Incluir un "hint" (pista) pedagógica que oriente sin regalar la respuesta.
- Incluir una explicación detallada paso a paso ("stepByStepExplanation") que justifique POR QUÉ la opción correcta es la que es y por qué los distractores son errores comunes.
- El examen debe ser estimulante, educativo y realista para exámenes como CENEVAL EXANI-II, UNAM, IPN o exámenes parciales de preparatoria.

Devuelve JSON con la estructura:
{
  "examTitle": "Título del Simulador de Examen",
  "description": "Breve descripción de los temas evaluados y recomendaciones",
  "targetTimeMinutes": ${numQuestions * 3},
  "questions": [
    {
      "id": "q1",
      "questionNumber": 1,
      "topic": "Subtema específico",
      "questionLatex": "Enunciado del problema con LaTeX ($...$)",
      "options": [
        { "id": "A", "text": "Opción A en LaTeX", "isCorrect": false },
        { "id": "B", "text": "Opción B en LaTeX", "isCorrect": true },
        { "id": "C", "text": "Opción C en LaTeX", "isCorrect": false },
        { "id": "D", "text": "Opción D en LaTeX", "isCorrect": false }
      ],
      "correctOptionId": "B",
      "pedagogicalHint": "Pista conceptual para guiar al estudiante",
      "stepByStepExplanation": "Explicación detallada de cómo resolver el problema paso a paso y por qué B es la correcta",
      "commonMistake": "El error que cometen los que eligen los distractores"
    }
  ]
}
`;

    const response = await generateContentWithFallback({
      contents: [{ text: prompt }],
      config: {
        systemInstruction: SOCRATIC_TUTOR_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/exam/generate:', error);
    return res.status(500).json({ error: error.message || 'Error al generar el simulacro de examen.' });
  }
});

// Endpoint 5: Explain Math Concept intuitively
app.post('/api/math/concept', async (req, res) => {
  try {
    const { conceptQuery } = req.body;

    const prompt = `
Explica el siguiente concepto matemático para un estudiante de preparatoria:
"${conceptQuery}"

Requisitos:
1. Explícalo con una analogía visual o de la vida cotidiana.
2. Muestra la definición o fórmula formal en LaTeX.
3. Explica "Por qué funciona" de forma intuitiva, no solo memoria.
4. Da un mini ejemplo de aplicación resuelto paso a paso.
5. Da un consejo rápido para no equivocarse en un examen.

Devuelve JSON con:
{
  "conceptName": "Nombre",
  "intuitiveAnalogy": "Analogía cotidiana",
  "formalFormula": "Fórmulas en LaTeX ($...$)",
  "whyItWorks": "Por qué tiene sentido matemático",
  "quickExample": {
    "problem": "Ejemplo en LaTeX",
    "solutionSteps": ["Paso 1...", "Paso 2..."],
    "result": "Resultado"
  },
  "examTip": "Consejo para el examen"
}
`;

    const response = await generateContentWithFallback({
      contents: [{ text: prompt }],
      config: {
        systemInstruction: SOCRATIC_TUTOR_PROMPT,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error in /api/math/concept:', error);
    return res.status(500).json({ error: error.message || 'Error al explicar concepto.' });
  }
});

// Vite Middleware for development / Static file serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Sparkles } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  onClear: () => void;
  currentImageBase64?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  onClear,
  currentImageBase64,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg('La imagen es demasiado pesada. El tamaño máximo recomendado es 15MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelected(result, file.type || 'image/jpeg');
      }
    };
    reader.onerror = () => {
      setErrorMsg('Hubo un error al leer la imagen.');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {currentImageBase64 ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-neutral-400 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-900 p-3 flex flex-col items-center">
          <div className="relative max-h-72 w-full flex items-center justify-center bg-black/5 dark:bg-black/30 rounded-xl overflow-hidden">
            <img
              src={currentImageBase64}
              alt="Foto del ejercicio"
              className="max-h-64 object-contain rounded-lg"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black text-white hover:opacity-80 shadow-md transition-transform hover:scale-105 cursor-pointer"
              title="Quitar imagen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-xs font-medium text-black dark:text-white">
            <Sparkles className="w-4 h-4 text-black dark:text-white" />
            <span>Foto cargada: la IA transcribirá las fórmulas y guiará la resolución paso a paso.</span>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) processFile(file);
          }}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
            isDragging
              ? 'border-black bg-neutral-100 dark:bg-neutral-900 dark:border-white scale-[0.99]'
              : 'border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white bg-neutral-50 dark:bg-neutral-950'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-black dark:text-white shadow-xs">
              <ImageIcon className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold text-black dark:text-white">
                Sube una foto de tu ejercicio o libro de texto
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Arrastra aquí la foto, pega con <kbd className="px-1.5 py-0.5 rounded bg-neutral-200 dark:bg-neutral-800 text-[10px] font-mono">Ctrl+V</kbd> o elige una opción:
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-black dark:text-white" />
                Examinar archivo
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-xl bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-2xs transition-colors cursor-pointer border border-black dark:border-white"
              >
                <Camera className="w-3.5 h-3.5" />
                Tomar foto con cámara
              </button>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400 mt-1">
                {errorMsg}
              </p>
            )}

            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Consejo: Para mejores resultados, enfoca bien la libreta o examen y evita sombras.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Download, Maximize2, Loader2 } from 'lucide-react';

interface ImageDisplayProps {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
}

const ImageDisplay: React.FC<ImageDisplayProps> = ({ imageUrl, loading, error }) => {
  if (loading) {
    return (
      <div className="w-full aspect-square md:aspect-video rounded-2xl glass-panel border border-zinc-700/50 flex flex-col items-center justify-center text-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/5 to-purple-500/5 animate-pulse" />
        <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mb-4 relative z-10" />
        <h3 className="text-lg font-medium text-white relative z-10">Gerando a Imagem</h3>
        <p className="text-sm text-zinc-400 mt-2 max-w-xs relative z-10">
          Gerando a Imagem em 4K de alta. Isso pode levar um momento devido à simulação complexa de ray-tracing... ConexTv
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full aspect-video rounded-2xl glass-panel border border-red-500/20 flex flex-col items-center justify-center p-8 text-center bg-red-500/5">
        <div className="text-red-400 font-medium text-lg mb-2">Falha na Geração</div>
        <p className="text-zinc-400 text-sm max-w-md">{error}</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full aspect-video rounded-2xl glass-panel border border-dashed border-zinc-700 flex flex-col items-center justify-center p-8 text-center opacity-60">
        <div className="w-16 h-16 rounded-full bg-zinc-800 mb-4 flex items-center justify-center">
          <Maximize2 className="w-6 h-6 text-zinc-500" />
        </div>
        <p className="text-zinc-400 text-sm">Área de pré-visualização. Sua imagem gerada aparecerá aqui.</p>
      </div>
    );
  }

  return (
    <div className="group relative w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
       {/* Background Blur for nicer framing if aspect ratio differs */}
      <div 
        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110"
        style={{ backgroundImage: `url(${imageUrl})` }} 
      />
      
      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        <img 
          src={imageUrl} 
          alt="Logotipo Gerado" 
          className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
        />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-end items-center z-20">
        <a 
          href={imageUrl} 
          download={`conextv-logo-${Date.now()}.png`}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors shadow-lg"
        >
          <Download className="w-4 h-4" />
          Baixar Imagem
        </a>
      </div>
    </div>
  );
};

export default ImageDisplay;
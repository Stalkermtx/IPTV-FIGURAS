import React from 'react';
import { AspectRatio, ImageResolution } from '../types';
import { Settings2, Wand2 } from 'lucide-react';

interface ControlsProps {
  prompt: string;
  setPrompt: (p: string) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ar: AspectRatio) => void;
  resolution: ImageResolution;
  setResolution: (res: ImageResolution) => void;
  onGenerate: () => void;
  loading: boolean;
}

const Controls: React.FC<ControlsProps> = ({
  prompt,
  setPrompt,
  aspectRatio,
  setAspectRatio,
  resolution,
  setResolution,
  onGenerate,
  loading
}) => {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-medium pb-2 border-b border-white/5">
          <Settings2 className="w-4 h-4 text-yellow-500" />
          <h3>Configuração de Geração</h3>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Proporção</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              disabled={loading}
              className="w-full bg-zinc-900/50 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
            >
              <option value="1:1">Quadrado (1:1)</option>
              <option value="16:9">Cinemático (16:9)</option>
              <option value="9:16">Mobile (9:16)</option>
              <option value="4:3">Padrão (4:3)</option>
              <option value="3:4">Retrato (3:4)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Resolução</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as ImageResolution)}
              disabled={loading}
              className="w-full bg-zinc-900/50 border border-zinc-700 text-zinc-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
            >
              <option value="1K">1K Padrão</option>
              <option value="2K">2K Alta Definição</option>
              <option value="4K">4K Ultra HD</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between text-zinc-100 font-medium pb-2 border-b border-white/5">
           <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-yellow-500" />
              <h3>Detalhes do Prompt</h3>
           </div>
           <span className="text-xs text-zinc-500 px-2 py-1 rounded bg-zinc-800">Modo Avançado</span>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
          rows={12}
          className="w-full bg-zinc-900/50 border border-zinc-700 text-zinc-300 rounded-lg p-4 text-sm focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all custom-scrollbar resize-none leading-relaxed"
          placeholder="Descreva seu logotipo premium..."
        />
        
        <button
          onClick={onGenerate}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-bold text-lg tracking-wide shadow-xl transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-3
            ${loading 
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700' 
              : 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-black hover:shadow-yellow-500/20 hover:brightness-110'
            }`}
        >
          {loading ? (
             <>Processando...</>
          ) : (
             <>Gerar Imagem</>
          )}
        </button>
      </div>
    </div>
  );
};

export default Controls;
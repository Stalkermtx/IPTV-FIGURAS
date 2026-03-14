import React, { useEffect, useState } from 'react';
import { checkApiKey, promptForApiKey } from '../services/geminiService';
import { ArrowRight, Key } from 'lucide-react';

interface ApiKeyCheckerProps {
  onKeyValid: () => void;
}

const ApiKeyChecker: React.FC<ApiKeyCheckerProps> = ({ onKeyValid }) => {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const verifyKey = async () => {
    setIsLoading(true);
    try {
      const valid = await checkApiKey();
      setHasKey(valid);
      if (valid) {
        onKeyValid();
      }
    } catch (e) {
      console.error("Failed to check API key", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifyKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    try {
      await promptForApiKey();
      // Wait a moment for the selection to potentially propagate, then re-check
      // The guidelines say: "assume the key selection was successful... Do not add delay".
      // However, re-checking state is safer for React rendering flow.
      await verifyKey();
      // Force valid call just in case verify fails due to race condition, 
      // but only if we trust the user completed the flow.
      // For better UX, we'll rely on verifyKey returning true eventually or user clicking again.
      // But adhering to: "assume the key selection was successful... proceed to the app"
      onKeyValid(); 
    } catch (e) {
      console.error("Failed to select key", e);
    }
  };

  if (hasKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
          <Key className="w-8 h-8 text-yellow-500" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Conectar Google Cloud</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            A geração em alta definição 4K requer uma chave de API paga de um Projeto Google Cloud.
          </p>
        </div>

        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="w-full group relative inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-zinc-950 transition-all duration-200 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg hover:from-yellow-300 hover:to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 focus:ring-offset-zinc-900"
        >
          {isLoading ? 'Verificando...' : 'Selecionar Projeto de Faturamento'}
          <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="text-xs text-zinc-600">
          Veja a <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-yellow-600 hover:text-yellow-500 underline">documentação de faturamento</a> para detalhes.
        </p>
      </div>
    </div>
  );
};

export default ApiKeyChecker;
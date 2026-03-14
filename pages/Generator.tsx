import React, { useState, useEffect } from 'react';
import { generateImage, generateVideo, generateNarrationAudio, generateVideoScript, DEFAULT_PROMPT } from '../services/geminiService';
import { AspectRatio, ImageResolution } from '../types';
import ImageDisplay from '../components/ImageDisplay';
import Controls from '../components/Controls';
import ApiKeyChecker from '../components/ApiKeyChecker';
import VoiceRecorder from '../components/VoiceRecorder';
import WhatsAppShareModal from '../components/WhatsAppShareModal';
import { extractLastFrame } from '../utils/videoUtils';
import { saveHistory, loadHistory, HistoryItem, saveStickers, loadStickers, StickerItem } from '../utils/storage';
import { createStaticSticker, downloadSticker } from '../utils/stickerUtils';
import { Sparkles, Zap, Play, Loader2, LogOut, ShieldCheck, Image as ImageIcon, Plus, Download, Eye, Share2, Upload, Sticker } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Generator: React.FC = () => {
  const { user, logout, incrementUsage } = useAuth();
  const navigate = useNavigate();
  const [apiKeyValid, setApiKeyValid] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [videoPrompt, setVideoPrompt] = useState<string>("Um vídeo de introdução curto e animado de 5 segundos. Os elementos metálicos do logotipo ganham vida com efeitos de brilho sutis e um movimento futurista.");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<ImageResolution>('4K');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState<boolean>(false);
  const [isContinuationMode, setIsContinuationMode] = useState<boolean>(false);
  const [previousPrompt, setPreviousPrompt] = useState<string>("");
  
  // Share Modal State
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareMediaUrl, setShareMediaUrl] = useState('');
  const [shareMediaType, setShareMediaType] = useState<'image' | 'video'>('image');

  // History & Stickers state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [activeTab, setActiveTab] = useState<'media' | 'stickers'>('media');

  useEffect(() => {
    if (user?.subscriptionStatus !== 'active') {
      navigate('/subscription');
    }
  }, [user, navigate]);

  useEffect(() => {
    const loadSavedData = async () => {
      const savedHistory = await loadHistory();
      if (savedHistory && savedHistory.length > 0) {
        setHistory(savedHistory);
      }
      const savedStickers = await loadStickers();
      if (savedStickers && savedStickers.length > 0) {
        setStickers(savedStickers);
      }
    };
    loadSavedData();
  }, []);

  const addToHistory = (type: 'image' | 'video', url: string, p: string, aUrl?: string) => {
    setHistory(prev => {
      const newHistory = [{ id: Date.now().toString(), type, url, prompt: p, audioUrl: aUrl }, ...prev];
      saveHistory(newHistory);
      return newHistory;
    });
  };

  const addToStickers = (type: 'image' | 'video', url: string) => {
    setStickers(prev => {
      const newStickers = [{ id: Date.now().toString(), type, url, createdAt: Date.now() }, ...prev];
      saveStickers(newStickers);
      return newStickers;
    });
  };

  const addWatermarkToImage = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Configure watermark text
        const text = "ConexTV Pro";
        // Calculate font size based on image width to maintain proportion
        const fontSize = Math.max(24, Math.floor(img.width / 12)); 
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)"; // 15% opacity
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw grid of watermarks
        const cols = 3;
        const rows = 3;
        const colWidth = img.width / cols;
        const rowHeight = img.height / rows;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = c * colWidth + colWidth / 2;
            const y = r * rowHeight + rowHeight / 2;
            
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(-15 * Math.PI / 180); // -15 degrees rotation
            ctx.fillText(text, 0, 0);
            ctx.restore();
          }
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (e) => reject(new Error("Failed to load image for watermarking"));
      img.src = imageUrl;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
      setVideoUrl(null);
      setAudioUrl(null);
      setVideoPrompt("");
      setIsContinuationMode(false);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!apiKeyValid) {
       setError("Verificação da chave API necessária.");
       return;
    }

    // Check Basic Plan Limits
    if (user?.planId === 'basic') {
      if ((user.usageCount || 0) >= 3) {
        setError("Limite do plano Básico atingido (3 imagens). Atualize para o Pro para continuar gerando.");
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setVideoUrl(null);
    setIsContinuationMode(false);

    try {
      // Force Low resolution for Basic plan
      const effectiveResolution = user?.planId === 'basic' ? '1K' : resolution;
      
      let url = await generateImage(prompt, aspectRatio, effectiveResolution);
      
      // Apply watermark if Basic plan
      if (user?.planId === 'basic') {
        url = await addWatermarkToImage(url);
      }

      setImageUrl(url);
      addToHistory('image', url, prompt);
      incrementUsage();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro inesperado durante a geração.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    const sourceImage = imageUrl;
    if (!sourceImage || !apiKeyValid) return;

    setScriptLoading(true);
    setError(null);

    try {
      const script = await generateVideoScript(sourceImage, isContinuationMode, previousPrompt);
      setVideoPrompt(script);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha ao gerar o roteiro.");
    } finally {
      setScriptLoading(false);
    }
  };

  const handlePrepareContinuation = async () => {
    if (!videoUrl) return;
    try {
      const lastFrameUrl = await extractLastFrame(videoUrl);
      setImageUrl(lastFrameUrl);
      setVideoUrl(null);
      setAudioUrl(null);
      setPreviousPrompt(videoPrompt);
      setVideoPrompt("");
      setIsContinuationMode(true);
    } catch (err) {
      console.error(err);
      setError("Falha ao extrair o último frame do vídeo.");
    }
  };

  const parseVideoPrompt = (fullPrompt: string) => {
    let cena = fullPrompt;
    let narracao = "";

    const cenaMatch = fullPrompt.match(/\[CENA\]:\s*(.*?)(?=\[NARRAÇÃO\]:|$)/is);
    const narracaoMatch = fullPrompt.match(/\[NARRAÇÃO\]:\s*(.*)/is);

    if (cenaMatch && cenaMatch[1]) {
      cena = cenaMatch[1].trim();
    }
    if (narracaoMatch && narracaoMatch[1]) {
      narracao = narracaoMatch[1].trim();
    }

    // Se o usuário apagou as tags ou não foram geradas, narra o prompt inteiro
    if (!narracaoMatch && !cenaMatch) {
      narracao = fullPrompt;
    }

    return { cena, narracao };
  };

  const handleGenerateVideo = async (sourceImageUrl: string = imageUrl!) => {
    if (!sourceImageUrl || !apiKeyValid) return;
    
    setVideoLoading(true);
    setError(null);
    
    try {
      const { cena, narracao } = parseVideoPrompt(videoPrompt);
      
      const [vUrl, aUrl] = await Promise.all([
        generateVideo(sourceImageUrl, cena),
        narracao ? generateNarrationAudio(narracao) : Promise.resolve(null)
      ]);

      setVideoUrl(vUrl);
      setAudioUrl(aUrl);
      addToHistory('video', vUrl, videoPrompt, aUrl || undefined);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Falha na geração do vídeo.");
    } finally {
      setVideoLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-[#050505] to-black text-white selection:bg-yellow-500/30 flex flex-col">
      <ApiKeyChecker onKeyValid={() => setApiKeyValid(true)} />
      
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Zap className="w-5 h-5 text-black fill-current" />
             </div>
             <h1 className="text-xl font-bold tracking-tight text-white">
               Conex<span className="text-yellow-500">TV</span> <span className="text-zinc-500 font-light mx-2">|</span> <span className="text-zinc-400 font-normal text-sm">Gerador de Logo</span>
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-800">
              <Sparkles className="w-3 h-3 text-yellow-500" />
              POWERED BY CONEXTV PRO
            </div>
            
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <button 
                onClick={() => navigate(user.role === 'admin' ? '/admin' : '/profile')}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-yellow-500 transition-colors"
                title={user.role === 'admin' ? "Painel Administrativo" : "Meu Perfil"}
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                  {user.email.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden md:block text-sm text-zinc-300">
                  {user.email}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
            <Controls 
              prompt={prompt}
              setPrompt={setPrompt}
              aspectRatio={aspectRatio}
              setAspectRatio={setAspectRatio}
              resolution={resolution}
              setResolution={setResolution}
              onGenerate={handleGenerate}
              loading={loading}
            />
            
            <VoiceRecorder onAudioGenerated={setAudioUrl} />
            
            <div className="text-xs text-zinc-600 p-4 border border-dashed border-zinc-800 rounded-xl">
              <strong className="text-zinc-500 block mb-1">Dica Pro:</strong>
              Use terminologia de alto contraste como "iluminação cinematográfica", "8K" e "ray-traced" para obter os melhores efeitos metálicos. O modelo é otimizado para texturas de alta fidelidade.
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-8">
            <div className="sticky top-24 space-y-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Pré-visualização ao Vivo</h2>
                    <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded-lg transition-colors">
                      <Upload className="w-3 h-3" />
                      Fazer Upload de Imagem
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleImageUpload} 
                      />
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    {imageUrl && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>
                        Imagem Pronta
                      </span>
                    )}
                    {videoUrl && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/>
                        Vídeo Pronto
                      </span>
                    )}
                  </div>
               </div>
               
               <ImageDisplay 
                 imageUrl={imageUrl} 
                 loading={loading} 
                 error={error} 
               />
               
               {imageUrl && !loading && !error && (
                 <div className="flex justify-end gap-2 mt-2">
                   <button 
                     onClick={async () => {
                       try {
                         const webpUrl = await createStaticSticker(imageUrl);
                         downloadSticker(webpUrl, `figurinha-${Date.now()}.webp`);
                         addToStickers('image', webpUrl);
                       } catch (err) {
                         console.error(err);
                         setError("Falha ao criar figurinha.");
                       }
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
                   >
                     <Sticker className="w-4 h-4" />
                     Baixar como Figurinha
                   </button>
                   <button 
                     onClick={() => {
                       setShareMediaUrl(imageUrl);
                       setShareMediaType('image');
                       setShareModalOpen(true);
                     }}
                     className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                   >
                     <Share2 className="w-4 h-4" />
                     Compartilhar no WhatsApp
                   </button>
                 </div>
               )}

               {/* Video Generation Section */}
               {(imageUrl || videoUrl) && (
                 <div className="glass-panel p-5 rounded-xl space-y-4 mt-6">
                   <div className="flex items-center justify-between pb-2 border-b border-white/5">
                     <div className="flex items-center gap-2 text-zinc-100 font-medium">
                       <Play className="w-4 h-4 text-yellow-500" />
                       <h3>Criação de Vídeo</h3>
                     </div>
                     {!videoUrl && imageUrl && (
                       <button
                         onClick={() => handleGenerateScript()}
                         disabled={scriptLoading || videoLoading}
                         className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                       >
                         {scriptLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                         {isContinuationMode ? "1. Gerar Roteiro de Continuação" : "1. Gerar Roteiro Profissional"}
                       </button>
                     )}
                     {videoUrl && (
                       <button
                         onClick={handlePrepareContinuation}
                         disabled={videoLoading}
                         className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                       >
                         <Plus className="w-3 h-3" />
                         Pegar Último Frame e Continuar
                       </button>
                     )}
                   </div>
                   
                   <textarea
                     value={videoPrompt}
                     onChange={(e) => setVideoPrompt(e.target.value)}
                     disabled={videoLoading || scriptLoading || !!videoUrl}
                     rows={5}
                     className="w-full bg-zinc-900/50 border border-zinc-700 text-zinc-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500/50 outline-none resize-none disabled:opacity-50"
                     placeholder={videoUrl ? "Clique em 'Pegar Último Frame e Continuar' para criar a próxima cena..." : "Descreva a animação do vídeo ou clique em 'Gerar Roteiro Profissional'..."}
                   />
                   
                   <div className="flex gap-3">
                     {!videoUrl && imageUrl && (
                       <button 
                         onClick={() => handleGenerateVideo(imageUrl)}
                         disabled={videoLoading || !videoPrompt.trim()}
                         className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all group disabled:opacity-50"
                       >
                         {videoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-yellow-500 group-hover:scale-110 transition-transform" />}
                         {isContinuationMode ? "2. Continuar Cena (Gerar Vídeo)" : "2. Gerar Cena Inicial"}
                       </button>
                     )}
                   </div>
                 </div>
               )}

               {videoLoading && (
                 <div className="w-full py-8 bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-3">
                   <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                   <span className="text-sm text-zinc-400">Gerando intro de vídeo... isso pode levar um minuto</span>
                 </div>
               )}

               {videoUrl && (
                 <div className="mt-4 space-y-2">
                   <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Intro de Vídeo</h3>
                   <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video">
                     <video 
                       src={videoUrl} 
                       controls 
                       autoPlay 
                       loop
                       className="w-full h-full object-cover"
                       onPlay={(e) => { 
                         if (audioUrl) { 
                           const audio = document.getElementById('announcer-audio') as HTMLAudioElement; 
                           if (audio) { 
                             audio.currentTime = e.currentTarget.currentTime; 
                             audio.play().catch(err => console.error(err)); 
                           } 
                         } 
                       }}
                       onPause={() => { 
                         if (audioUrl) { 
                           const audio = document.getElementById('announcer-audio') as HTMLAudioElement; 
                           if (audio) { 
                             audio.pause(); 
                           } 
                         } 
                       }}
                       onSeeked={(e) => {
                         if (audioUrl) {
                           const audio = document.getElementById('announcer-audio') as HTMLAudioElement;
                           if (audio) {
                             audio.currentTime = e.currentTarget.currentTime;
                           }
                         }
                       }}
                     />
                      {audioUrl && <audio id="announcer-audio" src={audioUrl} className="hidden" loop />}
                     {user?.planId === 'basic' && (
                        <div className="absolute inset-0 z-20 pointer-events-none grid grid-cols-2 md:grid-cols-3 grid-rows-3 gap-4 p-4 overflow-hidden">
                          {Array.from({ length: 9 }).map((_, i) => (
                            <div key={i} className="flex items-center justify-center">
                              <span className="text-white/20 text-xl md:text-3xl font-bold uppercase tracking-widest -rotate-12 select-none whitespace-nowrap">
                                ConexTV Pro
                              </span>
                            </div>
                          ))}
                        </div>
                     )}
                   </div>
                   
                   <div className="flex justify-end gap-2 mt-2">
                     <button 
                       onClick={() => {
                         downloadSticker(videoUrl, `figurinha-animada-${Date.now()}.mp4`);
                         addToStickers('video', videoUrl);
                       }}
                       className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
                       title="Baixe o vídeo e use um app como Sticker.ly para criar a figurinha animada"
                     >
                       <Sticker className="w-4 h-4" />
                       Baixar Vídeo (Figurinha Animada)
                     </button>
                     <button 
                       onClick={() => {
                         setShareMediaUrl(videoUrl);
                         setShareMediaType('video');
                         setShareModalOpen(true);
                       }}
                       className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                     >
                       <Share2 className="w-4 h-4" />
                       Compartilhar no WhatsApp
                     </button>
                   </div>
                 </div>
               )}
               
               {/* Technical Specs Footer beneath image */}
               <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="glass-panel p-4 rounded-lg flex flex-col items-center justify-center text-center">
                     <span className="text-zinc-500 text-xs uppercase mb-1">Modelo</span>
                     <span className="text-zinc-200 font-mono text-sm">ConexTV Pro Gerador</span>
                  </div>
                  <div className="glass-panel p-4 rounded-lg flex flex-col items-center justify-center text-center">
                     <span className="text-zinc-500 text-xs uppercase mb-1">Resolução</span>
                     <span className="text-zinc-200 font-mono text-sm">{resolution} / 720p</span>
                  </div>
                  <div className="glass-panel p-4 rounded-lg flex flex-col items-center justify-center text-center">
                     <span className="text-zinc-500 text-xs uppercase mb-1">Processamento</span>
                     <span className="text-zinc-200 font-mono text-sm">Deep Ray-Tracing</span>
                  </div>
               </div>

               {/* History Gallery */}
               {(history.length > 0 || stickers.length > 0) && (
                 <div className="mt-8 space-y-4">
                   <div className="flex items-center gap-4 border-b border-white/5 pb-2">
                     <button
                       onClick={() => setActiveTab('media')}
                       className={`flex items-center gap-2 font-medium pb-2 -mb-2.5 border-b-2 transition-colors ${activeTab === 'media' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                     >
                       <ImageIcon className="w-4 h-4" />
                       Imagens e Vídeos Criados
                     </button>
                     <button
                       onClick={() => setActiveTab('stickers')}
                       className={`flex items-center gap-2 font-medium pb-2 -mb-2.5 border-b-2 transition-colors ${activeTab === 'stickers' ? 'border-yellow-500 text-yellow-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
                     >
                       <Sticker className="w-4 h-4" />
                       Figurinhas do WhatsApp
                     </button>
                   </div>

                   {activeTab === 'media' && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                       {history.map((item) => (
                         <div key={item.id} className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 aspect-square">
                           <button className="w-full h-full text-left" onClick={() => { if (item.type === 'image') { setImageUrl(item.url); setVideoUrl(null); setAudioUrl(null); window.scrollTo({ top: 0, behavior: 'smooth' }); } else { setVideoUrl(item.url); setAudioUrl(item.audioUrl || null); window.scrollTo({ top: 0, behavior: 'smooth' }); } }}>{item.type === 'image' ? ( <img src={item.url} alt="History" className="w-full h-full object-cover" /> ) : ( <video src={item.url} className="w-full h-full object-cover" /> )}</button>
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 pointer-events-none">
                             <div className="flex gap-2 pointer-events-auto">
                               <a href={item.url} download={`conextv-${item.id}.${item.type === 'image' ? 'png' : 'mp4'}`} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" title="Baixar Original">
                                 <Download className="w-4 h-4" />
                               </a>
                               <button onClick={async () => {
                                 if (item.type === 'image') {
                                   try {
                                     const webpUrl = await createStaticSticker(item.url);
                                     downloadSticker(webpUrl, `figurinha-${item.id}.webp`);
                                     addToStickers('image', webpUrl);
                                   } catch (err) {
                                     console.error(err);
                                   }
                                 } else {
                                   downloadSticker(item.url, `figurinha-animada-${item.id}.mp4`);
                                   addToStickers('video', item.url);
                                 }
                               }} className="p-2 bg-yellow-500/80 hover:bg-yellow-500 rounded-full text-white" title={item.type === 'image' ? "Baixar como Figurinha" : "Baixar Vídeo (Figurinha Animada)"}>
                                 <Sticker className="w-4 h-4" />
                               </button>
                               <button onClick={() => {
                                 if (item.type === 'image') {
                                   setImageUrl(item.url);
                                   setVideoUrl(null);
                                 } else {
                                   setVideoUrl(item.url);
                                 }
                               }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" title="Visualizar">
                                 <Eye className="w-4 h-4" />
                               </button>
                               <button onClick={() => {
                                 setShareMediaUrl(item.url);
                                 setShareMediaType(item.type);
                                 setShareModalOpen(true);
                               }} className="p-2 bg-green-500/80 hover:bg-green-500 rounded-full text-white" title="Compartilhar">
                                 <Share2 className="w-4 h-4" />
                               </button>
                             </div>
                             {item.type === 'image' && (
                               <button 
                                 onClick={() => {
                                   setImageUrl(item.url);
                                   setVideoUrl(null);
                                   window.scrollTo({ top: 0, behavior: 'smooth' });
                                 }}
                                 className="text-xs bg-yellow-500 text-black px-3 py-1 rounded-full font-medium pointer-events-auto"
                               >
                                 Usar para Vídeo
                               </button>
                             )}
                           </div>
                         </div>
                       ))}
                     </div>
                   )}

                   {activeTab === 'stickers' && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                       {stickers.map((item) => (
                         <div key={item.id} className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50 aspect-square flex items-center justify-center p-4">
                           {item.type === 'image' ? (
                             <img src={item.url} alt="Sticker" className="max-w-full max-h-full object-contain drop-shadow-lg" />
                           ) : (
                             <video src={item.url} className="w-full h-full object-cover rounded-md" autoPlay loop muted playsInline />
                           )}
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                             <div className="flex gap-2">
                               <button onClick={() => downloadSticker(item.url, `figurinha-${item.id}.${item.type === 'image' ? 'webp' : 'mp4'}`)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white" title="Baixar Novamente">
                                 <Download className="w-4 h-4" />
                               </button>
                               <button onClick={() => {
                                 setShareMediaUrl(item.url);
                                 setShareMediaType(item.type);
                                 setShareModalOpen(true);
                               }} className="p-2 bg-green-500/80 hover:bg-green-500 rounded-full text-white" title="Compartilhar">
                                 <Share2 className="w-4 h-4" />
                               </button>
                             </div>
                           </div>
                         </div>
                       ))}
                       {stickers.length === 0 && (
                         <div className="col-span-full py-12 text-center text-zinc-500 text-sm">
                           Nenhuma figurinha salva ainda. Crie uma a partir das suas imagens ou vídeos!
                         </div>
                       )}
                     </div>
                   )}
                 </div>
               )}

            </div>
          </div>

        </div>
      </main>

      <WhatsAppShareModal 
        isOpen={shareModalOpen} 
        onClose={() => setShareModalOpen(false)} 
        mediaUrl={shareMediaUrl} 
        mediaType={shareMediaType} 
      />

      <footer className="w-full border-t border-white/5 bg-black/50 backdrop-blur-xl py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-zinc-500 text-sm">
            &copy; 2026 <span className="font-bold text-zinc-300">ConexTV.</span> Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Generator;

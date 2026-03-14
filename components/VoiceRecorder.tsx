import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Loader2, Volume2, Wand2 } from 'lucide-react';
import { generateAnnouncerAudio } from '../services/geminiService';

interface VoiceRecorderProps {
  onAudioGenerated: (audioUrl: string) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioGenerated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        // Call gemini service to process and generate new audio
        const generatedAudioUrl = await generateAnnouncerAudio(base64Audio);
        setAudioUrl(generatedAudioUrl);
        onAudioGenerated(generatedAudioUrl);
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      alert('Erro ao processar o áudio.');
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 text-zinc-100 font-medium pb-2 border-b border-white/5">
        <Mic className="w-4 h-4 text-yellow-500" />
        <h3>Gravador de Vinheta (I.A)</h3>
      </div>
      
      <p className="text-xs text-zinc-400">
        Grave sua ideia. A I.A criará uma vinheta profissional com voz de locutor (homem, 40 anos, voz grossa e compassada).
      </p>

      <div className="flex flex-col items-center gap-4 py-4">
        {!isRecording && !isProcessing && (
          <button
            onClick={startRecording}
            className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-500 hover:bg-red-500/30 transition-all"
            title="Gravar Áudio"
          >
            <Mic className="w-8 h-8" />
          </button>
        )}

        {isRecording && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              title="Parar Gravação"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
            <span className="text-red-400 font-mono text-sm">{formatTime(recordingTime)}</span>
          </div>
        )}

        {isProcessing && (
          <div className="flex flex-col items-center gap-3 text-yellow-500">
            <Loader2 className="w-10 h-10 animate-spin" />
            <span className="text-sm text-zinc-300 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Gerando voz de locutor...
            </span>
          </div>
        )}

        {audioUrl && !isProcessing && !isRecording && (
          <div className="w-full bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-yellow-500" />
            <audio src={audioUrl} controls className="w-full h-10" />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;

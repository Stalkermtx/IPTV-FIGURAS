import { GoogleGenAI, Modality } from "@google/genai";
import { AspectRatio, ImageResolution } from "../types";

// Default prompt provided by the user
export const DEFAULT_PROMPT = `Crie um logotipo ultra-realista e premium para a marca "ConexTV".
O design deve apresentar um visual metálico moderno com detalhes em prata cromada e ouro, bordas brilhantes e destaques suaves em neon.
Estilo: marca futurista de IPTV/tecnologia, reflexos de alta definição, gradientes suaves, flares de energia vibrantes.
O texto "Conex" deve ser em prata metálico com profundidade, e "TV" deve ser em ouro com um forte efeito 3D em relevo.
Adicione um ícone sutil de sinal sem fio acima do "V", integrado ao design.
Use iluminação de alto contraste, brilho cinematográfico, luz de fundo suave e contornos brilhantes.
Fundo: atmosfera escura e desfocada de estádio/tecnologia com feixes de luz, mas mantenha o logotipo como foco principal.
Resolução: 8K, extremamente nítido, sem distorções, espaçamento proporcional.
Referência de estilo: o logotipo original anexado (mesmo conceito geral, mas mais moderno, limpo e premium).`;

export const checkApiKey = async (): Promise<boolean> => {
  if (window.aistudio) {
    return await window.aistudio.hasSelectedApiKey();
  }
  // Fallback for external hosting: check if API key is injected via env vars
  return !!process.env.API_KEY;
};

export const promptForApiKey = async (): Promise<void> => {
  if (window.aistudio) {
    await window.aistudio.openSelectKey();
  } else {
    console.error("AI Studio environment not detected.");
  }
};

export const generateImage = async (
  prompt: string,
  aspectRatio: AspectRatio,
  resolution: ImageResolution
): Promise<string> => {
  // Always create a new instance to ensure the latest API Key is used
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Chave API não encontrada. Por favor, selecione um projeto.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  let attempt = 0;
  const maxRetries = 3;
  
  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: resolution,
          },
        },
      });

      let imageUrl = '';
      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mimeType};base64,${base64EncodeString}`;
            break; 
          }
        }
      }

      if (!imageUrl) {
        throw new Error("Nenhum dado de imagem encontrado na resposta");
      }

      return imageUrl;

    } catch (error: any) {
      console.error(`Gemini API Error (Attempt ${attempt + 1}/${maxRetries}):`, error);
      
      // Handle 503 Service Unavailable (High Demand)
      if (error.message && (error.message.includes("503") || error.message.includes("high demand"))) {
        attempt++;
        if (attempt < maxRetries) {
          // Wait with exponential backoff: 2s, 4s, 8s
          const delay = 2000 * Math.pow(2, attempt - 1);
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
           throw new Error("O sistema está com alta demanda momentânea. Por favor, aguarde alguns instantes e tente novamente.");
        }
      }

      // Enhance error message if it's a permission issue or quota
      if (error.message && error.message.includes("403")) {
        throw new Error("Acesso negado. Verifique as permissões da sua chave API e se a API está ativada.");
      }
      
      if (error.message && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("RESOURCE_EXHAUSTED"))) {
        throw new Error("Você excedeu a cota da sua API Key. Por favor, verifique seu plano e detalhes de faturamento no Google Cloud Console.");
      }
      
      throw error;
    }
  }
  
  throw new Error("Falha desconhecida na geração da imagem.");
};

export const generateAnnouncerAudio = async (base64AudioDataUrl: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Extract base64 and mime type
  const matches = base64AudioDataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid audio data URL");
  }
  const mimeType = matches[1];
  const audioBytes = matches[2];

  try {
    // Step 1: Transcribe and enhance the text for an ad
    const transcriptionResponse = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBytes,
              mimeType: mimeType,
            }
          },
          {
            text: "Transcreva este áudio e melhore o texto para ser usado como uma vinheta de propaganda impactante. O texto deve ser persuasivo, direto e chamar bem a atenção. Retorne APENAS o texto final da vinheta, sem explicações."
          }
        ]
      }
    });

    const adText = transcriptionResponse.text;
    if (!adText) throw new Error("Falha ao gerar o texto da vinheta.");

    // Step 2: Generate TTS with the specified voice characteristics
    // We use 'Fenrir' or 'Charon' for a deep male voice. Let's use 'Fenrir'.
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Fale de forma compassada, com voz grossa de locutor de rádio, chamando bem a atenção: ${adText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Fenrir' },
            },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Falha ao gerar o áudio TTS.");
    }

    return `data:audio/wav;base64,${base64Audio}`;
  } catch (error: any) {
    console.error("Error generating announcer audio:", error);
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Você excedeu a cota da sua API Key. Por favor, verifique seu plano e detalhes de faturamento no Google Cloud Console.");
    }
    throw new Error(`Falha ao gerar áudio do locutor: ${errorMessage}`);
  }
};

export const generateNarrationAudio = async (text: string): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Fale em português do Brasil, como um locutor de rádio ou TV bem animado, frenético e muito profissional, como em propagandas de alto impacto. A narração deve ser enérgica e passar a mensagem de forma clara e objetiva. A narração deve durar exatamente cerca de 8 segundos, ajustando o ritmo da fala (mesmo para textos maiores) para caber perfeitamente nesse tempo. Texto: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // Puck is more energetic
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("Falha ao gerar o áudio TTS.");
    }

    return `data:audio/wav;base64,${base64Audio}`;
  } catch (error: any) {
    console.error("Error generating narration audio:", error);
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Você excedeu a cota da sua API Key. Por favor, verifique seu plano e detalhes de faturamento no Google Cloud Console.");
    }
    throw new Error(`Falha ao gerar narração: ${errorMessage}`);
  }
};

export const generateVideoScript = async (
  imageBase64: string,
  isContinuation: boolean,
  previousPrompt?: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data URL");
  }
  const mimeType = matches[1];
  const imageBytes = matches[2];

  const prompt = isContinuation
    ? `Analise este último frame do vídeo e crie um prompt de continuação direta para a próxima cena.${previousPrompt ? ` O roteiro da cena anterior foi: "${previousPrompt}".` : ""} Não faça introdução, apenas a continuação fluida da ação e da história baseada no que aconteceu antes. O prompt do vídeo deve incluir instruções para cortes dinâmicos, ângulos de câmera apropriados e movimentação natural do personagem. Além disso, crie um texto de locução de aproximadamente 8 segundos que se encaixe perfeitamente com a cena e que seja uma continuação direta e coerente do diálogo/narração da cena anterior. O texto deve ser para um locutor de rádio ou TV bem animado, frenético e muito profissional, como em propagandas de alto impacto. A narração deve ser enérgica e passar a mensagem de forma clara e objetiva. Fale sempre na segunda pessoa (falando com o espectador) e em português do Brasil. A locução deve ter o ritmo da imagem e incluir a indicação de uma música de fundo sem copyright. Retorne EXATAMENTE no formato:\n[CENA]: <descrição visual para o gerador de vídeo>\n[NARRAÇÃO]: <texto da narração>`
    : "Analise esta imagem e crie um roteiro profissional para um vídeo baseado nela. Crie um prompt inicial detalhado para a geração do vídeo, garantindo que a descrição inclua cortes dinâmicos, ângulos de câmera apropriados e movimentação natural do personagem. Além disso, crie um texto de locução de aproximadamente 8 segundos que se encaixe perfeitamente com a cena. O texto deve ser para um locutor de rádio ou TV bem animado, frenético e muito profissional, como em propagandas de alto impacto. A narração deve ser enérgica e passar a mensagem de forma clara e objetiva. Fale sempre na segunda pessoa (falando com o espectador) e em português do Brasil. A locução deve ter o ritmo da imagem e incluir a indicação de uma música de fundo sem copyright. Retorne EXATAMENTE no formato:\n[CENA]: <descrição visual para o gerador de vídeo>\n[NARRAÇÃO]: <texto da narração>";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBytes,
              mimeType: mimeType,
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Error generating video script:", error);
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Você excedeu a cota da sua API Key. Por favor, verifique seu plano e detalhes de faturamento no Google Cloud Console.");
    }
    throw new Error(`Falha ao gerar roteiro: ${errorMessage}`);
  }
};

export const generateVideo = async (
  imageUrl: string,
  prompt: string
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select a project.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Extract base64 data and mimeType from data URL
  const matches = imageUrl.match(/^data:(.+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid image data URL");
  }
  const mimeType = matches[1];
  const imageBytes = matches[2];

  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBytes,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9',
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) {
      throw new Error("No video URI returned");
    }

    const videoResponse = await fetch(videoUri, {
        method: 'GET',
        headers: {
            'x-goog-api-key': apiKey,
        },
    });

    if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error: any) {
    console.error("Gemini Video API Error:", error);
    
    // Handle specific API errors
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("Você excedeu a cota da sua API Key. Por favor, verifique seu plano e detalhes de faturamento no Google Cloud Console.");
    }
    
    throw new Error(`Falha na geração do vídeo: ${errorMessage}`);
  }
};
import { decryptData } from '../utils/encryption';

export interface EvolutionInstance {
  instance: {
    instanceName: string;
    state: string;
  };
}

export interface WhatsAppContact {
  id: string;
  name: string;
  pushName?: string;
  isGroup: boolean;
}

const getCredentials = () => {
  const url = localStorage.getItem('_evo_u');
  const key = localStorage.getItem('_evo_k');
  
  let decodedUrl = '';
  let decodedKey = '';
  
  if (url) {
    try { decodedUrl = decryptData(url) || atob(url); } catch { decodedUrl = ''; }
  }
  if (key) {
    try { decodedKey = decryptData(key) || atob(key); } catch { decodedKey = ''; }
  }
  
  return {
    url: decodedUrl,
    key: decodedKey
  };
};

export const checkEvolutionConnection = async (instanceName: string): Promise<boolean> => {
  const { url, key } = getCredentials();
  if (!url || !key) throw new Error('Credenciais da Evolution API não configuradas.');

  try {
    const response = await fetch(`${url}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': key
      }
    });
    if (!response.ok) return false;
    const data = await response.json();
    return data?.instance?.state === 'open';
  } catch (error) {
    console.error('Erro ao verificar conexão:', error);
    return false;
  }
};

export const fetchContactsAndGroups = async (instanceName: string): Promise<WhatsAppContact[]> => {
  const { url, key } = getCredentials();
  if (!url || !key) throw new Error('Credenciais da Evolution API não configuradas.');

  try {
    // Fetch contacts
    const contactsRes = await fetch(`${url}/chat/findContacts/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ where: {} })
    });
    
    // Fetch groups
    const groupsRes = await fetch(`${url}/group/fetchAllGroups/${instanceName}?getParticipants=false`, {
      method: 'GET',
      headers: {
        'apikey': key
      }
    });

    let contacts: WhatsAppContact[] = [];
    
    if (contactsRes.ok) {
      const contactsData = await contactsRes.json();
      if (Array.isArray(contactsData)) {
        contacts = contactsData.map((c: any) => ({
          id: c.id,
          name: c.name || c.pushName || c.id.split('@')[0],
          pushName: c.pushName,
          isGroup: false
        })).filter(c => c.id && c.id.endsWith('@s.whatsapp.net'));
      }
    }

    if (groupsRes.ok) {
      const groupsData = await groupsRes.json();
      if (Array.isArray(groupsData)) {
        const groups = groupsData.map((g: any) => ({
          id: g.id,
          name: g.subject || 'Grupo sem nome',
          isGroup: true
        }));
        contacts = [...contacts, ...groups];
      }
    }

    return contacts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Erro ao buscar contatos:', error);
    throw error;
  }
};

export const sendMediaMessage = async (
  instanceName: string, 
  number: string, 
  mediaUrl: string, 
  mediaType: 'image' | 'video', 
  caption?: string
) => {
  const { url, key } = getCredentials();
  if (!url || !key) throw new Error('Credenciais da Evolution API não configuradas.');

  // Convert data URL to base64 if needed, or send as URL
  let base64 = mediaUrl;
  if (mediaUrl.startsWith('data:')) {
    base64 = mediaUrl.split(',')[1];
  } else if (mediaUrl.startsWith('blob:')) {
    // Need to convert blob to base64
    const response = await fetch(mediaUrl);
    const blob = await response.blob();
    base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const endpoint = mediaType === 'image' ? '/message/sendMedia' : '/message/sendWhatsAppMedia';
  
  const body = {
    number: number,
    options: {
      delay: 1200,
      presence: 'composing'
    },
    mediaMessage: {
      mediatype: mediaType,
      caption: caption || '',
      media: base64
    }
  };

  const response = await fetch(`${url}${endpoint}/${instanceName}`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`Erro ao enviar mensagem: ${errorData?.message || response.statusText}`);
  }

  return response.json();
};

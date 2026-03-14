import React, { useState, useEffect } from 'react';
import { X, Send, Search, Users, User, Clock, AlertCircle } from 'lucide-react';
import { checkEvolutionConnection, fetchContactsAndGroups, sendMediaMessage, WhatsAppContact } from '../services/evolutionService';

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'image' | 'video';
}

const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({ isOpen, onClose, mediaUrl, mediaType }) => {
  const [instanceName, setInstanceName] = useState(() => localStorage.getItem('_evo_inst') || '');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [caption, setCaption] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && instanceName) {
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    setLoading(true);
    setError('');
    try {
      const connected = await checkEvolutionConnection(instanceName);
      setIsConnected(connected);
      if (connected) {
        localStorage.setItem('_evo_inst', instanceName);
        loadContacts();
      } else {
        setError('Instância não conectada ou credenciais inválidas.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar conexão.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    setLoading(true);
    try {
      const data = await fetchContactsAndGroups(instanceName);
      setContacts(data);
    } catch (err: any) {
      setError('Erro ao carregar contatos. Verifique se a instância está pronta.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (selectedContacts.length === 0) return;
    
    setSending(true);
    setProgress({ current: 0, total: selectedContacts.length });
    setError('');

    for (let i = 0; i < selectedContacts.length; i++) {
      const contactId = selectedContacts[i];
      try {
        await sendMediaMessage(instanceName, contactId, mediaUrl, mediaType, caption);
        setProgress(p => ({ ...p, current: i + 1 }));
        
        // Delay to prevent bans
        if (i < selectedContacts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      } catch (err: any) {
        console.error(`Erro ao enviar para ${contactId}:`, err);
        setError(`Erro ao enviar para alguns contatos. O envio foi interrompido.`);
        break;
      }
    }

    setSending(false);
    if (!error) {
      alert('Envio concluído com sucesso!');
      onClose();
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.pushName && c.pushName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Send className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Compartilhar no WhatsApp</h2>
              <p className="text-sm text-zinc-500">Envie sua criação para contatos ou grupos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {!isConnected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Nome da Instância (Evolution API)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    placeholder="Ex: conex-tv-1"
                    className="flex-1 bg-black/40 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none transition-all text-white"
                  />
                  <button 
                    onClick={checkConnection}
                    disabled={!instanceName || loading}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg transition-colors"
                  >
                    {loading ? 'Verificando...' : 'Conectar'}
                  </button>
                </div>
                <p className="text-xs text-zinc-600">Certifique-se de ter configurado a URL e a Global API Key no painel Admin.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Media Preview & Caption */}
              <div className="flex gap-4 items-start">
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
                  {mediaType === 'image' ? (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={mediaUrl} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Legenda (Opcional)</label>
                  <textarea 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Escreva uma mensagem para acompanhar a mídia..."
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg px-4 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none transition-all text-white resize-none h-24"
                  />
                </div>
              </div>

              {/* Delay Settings */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Intervalo de Envio (Segundos)
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1" max="60" 
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="flex-1 accent-green-500"
                  />
                  <span className="text-sm font-mono text-green-400 bg-green-500/10 px-3 py-1 rounded-md border border-green-500/20">
                    {delaySeconds}s
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">Um intervalo maior reduz o risco de banimento pelo WhatsApp.</p>
              </div>

              {/* Contacts Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">
                    Selecionar Destinatários ({selectedContacts.length})
                  </label>
                  <button 
                    onClick={() => setSelectedContacts(filteredContacts.map(c => c.id))}
                    className="text-xs text-green-500 hover:text-green-400"
                  >
                    Selecionar Todos
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar contatos ou grupos..."
                    className="w-full bg-black/40 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none transition-all text-white"
                  />
                </div>

                <div className="h-64 overflow-y-auto border border-zinc-800 rounded-lg bg-black/20 divide-y divide-zinc-800/50">
                  {loading ? (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                      Carregando contatos...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                      Nenhum contato encontrado.
                    </div>
                  ) : (
                    filteredContacts.map(contact => (
                      <label key={contact.id} className="flex items-center gap-3 p-3 hover:bg-zinc-800/50 cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedContacts.includes(contact.id)}
                          onChange={() => toggleContact(contact.id)}
                          className="w-4 h-4 rounded border-zinc-700 text-green-500 focus:ring-green-500 focus:ring-offset-zinc-900 bg-zinc-800"
                        />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-full ${contact.isGroup ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-800 text-zinc-400'}`}>
                            {contact.isGroup ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-medium text-zinc-200 truncate">{contact.name}</p>
                            {contact.pushName && contact.pushName !== contact.name && (
                              <p className="text-xs text-zinc-500 truncate">~{contact.pushName}</p>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {isConnected && (
          <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
            {sending ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Enviando mensagens...</span>
                  <span className="text-green-400 font-medium">{progress.current} / {progress.total}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSend}
                  disabled={selectedContacts.length === 0}
                  className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 transition-all"
                >
                  <Send className="w-5 h-5" />
                  Enviar Agora
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppShareModal;

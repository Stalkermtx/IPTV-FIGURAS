import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Shield, Rocket, LogOut } from 'lucide-react';

const Subscription: React.FC = () => {
  const { subscribe, user, plans, logout } = useAuth();
  const navigate = useNavigate();

  const enterprisePlan = plans.find(p => p.id === 'enterprise');
  const whatsappNumber = enterprisePlan?.contactWhatsapp || '65992203318';
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Quero%20Saber%20Mais%20Sobre%20o%20Gerador%20ConexTV%20Pro.`;

  const handleSubscribe = () => {
    // Simulate payment process
    // In a real app, this would redirect to Stripe Checkout
    subscribe('pro');
    navigate('/generator');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  React.useEffect(() => {
    if (user?.subscriptionStatus === 'active') {
      navigate('/generator');
    }
  }, [user?.subscriptionStatus, navigate]);

  if (user?.subscriptionStatus === 'active') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative">
      {/* Header with Logout */}
      <div className="absolute top-4 right-4 z-50">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Sair</span>
        </button>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center p-8 pb-24">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Desbloqueie o Poder do ConexTV Pro</h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Gere logotipos ilimitados em 4K, animações de vídeo e tenha acesso prioritário aos nossos modelos de IA mais avançados.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center space-y-6 hover:bg-zinc-900/50 transition-all duration-300">
              <div className="p-4 bg-zinc-800 rounded-full">
                <Shield className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-2xl font-bold">Básico</h3>
              <div className="text-4xl font-bold">Grátis</div>
              <ul className="space-y-3 text-left w-full text-zinc-400 text-sm">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Acesso limitado</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Baixa resolução</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Marca d'água</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 3 imagens de teste</li>
              </ul>
              <button 
                onClick={() => {
                  subscribe('basic');
                  navigate('/generator');
                }}
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors"
              >
                Começar Grátis
              </button>
            </div>

            {/* Pro Plan (Highlighted) */}
            <div className="bg-gradient-to-b from-zinc-900 to-black border border-yellow-500/50 rounded-2xl p-8 flex flex-col items-center space-y-6 transform scale-105 shadow-2xl shadow-yellow-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                MAIS POPULAR
              </div>
              <div className="p-4 bg-yellow-500/20 rounded-full border border-yellow-500/50">
                <Zap className="w-8 h-8 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">Profissional</h3>
              <div className="text-5xl font-bold text-yellow-500">R$ 29,90<span className="text-lg text-zinc-500 font-normal">/mês</span></div>
              <ul className="space-y-3 text-left w-full text-zinc-300 text-sm">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Gerações Ilimitadas</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Resolução 4K Ultra HD</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Animações de Vídeo (Veo)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Uso Comercial Liberado</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-yellow-500" /> Suporte Prioritário</li>
              </ul>
              <button 
                onClick={() => {
                  subscribe('pro');
                  navigate('/generator');
                }}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20"
              >
                Assinar Agora
              </button>
              <p className="text-xs text-zinc-500 mt-2">Cobrança automática a cada 30 dias. Cancele quando quiser.</p>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center space-y-6 hover:bg-zinc-900/50 transition-all duration-300">
              <div className="p-4 bg-purple-500/10 rounded-full">
                <Rocket className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold">Empresarial</h3>
              <div className="text-4xl font-bold">Consulte</div>
              <ul className="space-y-3 text-left w-full text-zinc-400 text-sm">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-500" /> API Dedicada</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-500" /> Modelos Customizados</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-purple-500" /> SLA Garantido</li>
              </ul>
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center"
              >
                Falar com Vendas
              </a>
            </div>
          </div>
        </div>
      </div>
      
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

export default Subscription;

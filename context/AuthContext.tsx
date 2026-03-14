import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'user' | 'admin';
export type SubscriptionStatus = 'active' | 'inactive' | 'expired';
export type PlanType = 'basic' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanType;
  name: string;
  price: string;
  features: string[];
  maxUsage?: number; // For basic plan limit
  resolution: 'Low' | '4K';
  watermark: boolean;
  contactWhatsapp?: string; // For Enterprise plan
}

export interface User {
  id: string;
  email: string;
  name?: string;
  whatsapp?: string;
  role: UserRole;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt?: string;
  planId?: PlanType;
  usageCount: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  content: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;
  subscribe: (planId: PlanType) => void;
  users: User[]; // Mock database for admin
  updateUserStatus: (userId: string, status: SubscriptionStatus) => void;
  updateUser: (userId: string, data: Partial<User>) => void;
  plans: Plan[];
  updatePlan: (planId: PlanType, updates: Partial<Plan>) => void;
  incrementUsage: () => void;
  templates: MessageTemplate[];
  saveTemplate: (template: MessageTemplate) => void;
  deleteTemplate: (id: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 'Grátis',
    features: ['Acesso limitado', 'Baixa resolução', 'Marca d\'água', '3 imagens de teste'],
    maxUsage: 3,
    resolution: 'Low',
    watermark: true
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 'R$ 29,90',
    features: ['Gerações Ilimitadas', 'Resolução 4K Ultra HD', 'Animações de Vídeo (Veo)', 'Uso Comercial Liberado', 'Suporte Prioritário'],
    resolution: '4K',
    watermark: false
  },
  {
    id: 'enterprise',
    name: 'Empresarial',
    price: 'Consulte',
    features: ['API Dedicada', 'Modelos Customizados', 'SLA Garantido'],
    resolution: '4K',
    watermark: false,
    contactWhatsapp: '65992203318'
  }
];

// Mock initial users
const INITIAL_USERS: User[] = [
  { id: '1', email: 'admin@conextv.com', name: 'Administrador', whatsapp: '65999999999', role: 'admin', subscriptionStatus: 'active', planId: 'pro', usageCount: 0 },
  { id: '2', email: 'user@example.com', name: 'Cliente Teste', whatsapp: '65888888888', role: 'user', subscriptionStatus: 'inactive', usageCount: 0 },
];

const INITIAL_TEMPLATES: MessageTemplate[] = [
  {
    id: '1',
    name: 'Aviso de Vencimento',
    content: `Olá querido(a) cliente *{name}*,

*SUA CONTA EXPIRA EM BREVE!*

Seu plano de *{plan_price}* vence em:
*{expires_at}*

Seu usuário atual é *{username}*

Evite o bloqueio automático do seu sinal

Para renovar o seu plano agora, clique no link abaixo:
{pay_url}

*Observações:* Deixar campo de descrição em branco ou se precisar coloque *SUPORTE TÉCNICO*

Por favor, nos envie o comprovante de pagamento assim que possível.

É sempre um prazer te atender.`
  },
  {
    id: '2',
    name: 'Confirmação de Renovação',
    content: `*Confirmação de Renovação*

✅ Usuário: {username}
🗓️ Próximo Vencimento: {expires_at}`
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [plans, setPlans] = useState<Plan[]>(INITIAL_PLANS);
  const [templates, setTemplates] = useState<MessageTemplate[]>(INITIAL_TEMPLATES);

  // Simulate persistence
  useEffect(() => {
    const storedUser = localStorage.getItem('conextv_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    const storedPlans = localStorage.getItem('conextv_plans');
    if (storedPlans) {
      setPlans(JSON.parse(storedPlans));
    }
    const storedTemplates = localStorage.getItem('conextv_templates');
    if (storedTemplates) {
      setTemplates(JSON.parse(storedTemplates));
    }
  }, []);

  const login = (email: string, role: UserRole = 'user') => {
    // Check if user exists in mock DB
    let existingUser = users.find(u => u.email === email);
    
    if (!existingUser) {
      // Register new user
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        role,
        subscriptionStatus: 'inactive',
        usageCount: 0
      };
      setUsers([...users, newUser]);
      existingUser = newUser;
    }

    setUser(existingUser);
    localStorage.setItem('conextv_user', JSON.stringify(existingUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('conextv_user');
  };

  const subscribe = (planId: PlanType) => {
    if (!user) return;
    
    const updatedUser: User = { 
      ...user, 
      subscriptionStatus: 'active',
      planId,
      subscriptionExpiresAt: planId === 'basic' ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days for paid plans
      usageCount: 0 
    };
    
    setUser(updatedUser);
    localStorage.setItem('conextv_user', JSON.stringify(updatedUser));
    
    // Update in mock DB
    setUsers(users.map(u => u.id === user.id ? updatedUser : u));
  };

  const updateUserStatus = (userId: string, status: SubscriptionStatus) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, subscriptionStatus: status };
      }
      return u;
    }));
  };

  const updateUser = (userId: string, data: Partial<User>) => {
    setUsers(users.map(u => {
      if (u.id === userId) {
        return { ...u, ...data };
      }
      return u;
    }));
  };

  const updatePlan = (planId: PlanType, updates: Partial<Plan>) => {
    const newPlans = plans.map(p => p.id === planId ? { ...p, ...updates } : p);
    setPlans(newPlans);
    localStorage.setItem('conextv_plans', JSON.stringify(newPlans));
  };

  const incrementUsage = () => {
    if (!user) return;
    const updatedUser = { ...user, usageCount: (user.usageCount || 0) + 1 };
    setUser(updatedUser);
    localStorage.setItem('conextv_user', JSON.stringify(updatedUser));
    setUsers(users.map(u => u.id === user.id ? updatedUser : u));
  };

  const saveTemplate = (template: MessageTemplate) => {
    let newTemplates;
    if (templates.find(t => t.id === template.id)) {
      newTemplates = templates.map(t => t.id === template.id ? template : t);
    } else {
      if (templates.length >= 4) {
        alert("Máximo de 4 templates permitidos.");
        return;
      }
      newTemplates = [...templates, template];
    }
    setTemplates(newTemplates);
    localStorage.setItem('conextv_templates', JSON.stringify(newTemplates));
  };

  const deleteTemplate = (id: string) => {
    const newTemplates = templates.filter(t => t.id !== id);
    setTemplates(newTemplates);
    localStorage.setItem('conextv_templates', JSON.stringify(newTemplates));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, subscribe, users, updateUserStatus, updateUser, plans, updatePlan, incrementUsage, templates, saveTemplate, deleteTemplate }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

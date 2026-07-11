import { useState, useEffect } from 'react';
import { 
  Lock, 
  Eye, 
  MessageSquare, 
  MessageCircle, 
  UserCheck, 
  Globe, 
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function Privacidade() {
  const { usuario } = useAuth();
  
  // Estados Gerais
  const [loading, setLoading] = useState(true);
  
  // Configurações de Privacidade
  const [privacidade, setPrivacidade] = useState({
    profile_visibility: 'Todos',
    send_messages: 'Todos',
    comment_posts: 'Todos',
    view_photo: 'Todos'
  });

  useEffect(() => {
    carregarDadosPrivacidade();
  }, [usuario]);

  async function carregarDadosPrivacidade() {
    if (!usuario) return;
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('security_privacy')
        .select('*')
        .eq('user_id', usuario.id)
        .maybeSingle();

      if (data) {
        setPrivacidade({
          profile_visibility: data.profile_visibility,
          send_messages: data.send_messages,
          comment_posts: data.comment_posts,
          view_photo: data.view_photo
        });
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar configurações de privacidade.');
    } finally {
      setLoading(false);
    }
  }

  const handleSalvarPrivacidade = async (campo, valor) => {
    setPrivacidade(prev => ({ ...prev, [campo]: valor }));

    try {
      const { error } = await supabase
        .from('security_privacy')
        .upsert({
          user_id: usuario.id,
          ...privacidade,
          [campo]: valor,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Configurações de privacidade atualizadas com sucesso! 🛡️');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar preferências de privacidade.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando dados de privacidade...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Lock size={20} />
        </div>
        <div className="space-y-1">
          <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Privacidade</h1>
          <p className="text-[12.5px] text-gray-500 font-light">Controle quem pode interagir com você e visualizar suas informações no EduConnect.</p>
        </div>
      </div>

      {/* CONTAINER DAS OPÇÕES */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 max-w-2xl">
        
        {/* Opção 1: Visibilidade do Perfil */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-5 gap-4">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><Eye size={16} className="text-violet-650" /> Visibilidade do perfil</span>
            <p className="text-[11.5px] text-gray-450 font-light leading-relaxed">Escolha quem pode visualizar seu perfil escolar e histórico de publicações.</p>
          </div>
          
          <select
            value={privacidade.profile_visibility}
            onChange={(e) => handleSalvarPrivacidade('profile_visibility', e.target.value)}
            className="bg-white border border-gray-250 rounded-xl px-4 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="Todos">Todos na plataforma</option>
            <option value="Professores">Apenas Professores</option>
            <option value="Apenas eu">Apenas eu</option>
          </select>
        </div>

        {/* Opção 2: Envio de Mensagens */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-5 gap-4">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><MessageSquare size={16} className="text-violet-650" /> Envio de mensagens privadas</span>
            <p className="text-[11.5px] text-gray-450 font-light leading-relaxed">Controle quem está autorizado a iniciar chats ou salas com você.</p>
          </div>
          
          <select
            value={privacidade.send_messages}
            onChange={(e) => handleSalvarPrivacidade('send_messages', e.target.value)}
            className="bg-white border border-gray-250 rounded-xl px-4 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="Todos">Todos na plataforma</option>
            <option value="Colegas">Apenas Colegas de Turma</option>
            <option value="Ninguém">Ninguém (Silenciar)</option>
          </select>
        </div>

        {/* Opção 3: Comentários nas Postagens */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-5 gap-4">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><MessageCircle size={16} className="text-violet-650" /> Quem pode comentar nas suas postagens</span>
            <p className="text-[11.5px] text-gray-450 font-light leading-relaxed">Gerencie permissões para respostas em posts do feed.</p>
          </div>
          
          <select
            value={privacidade.comment_posts}
            onChange={(e) => handleSalvarPrivacidade('comment_posts', e.target.value)}
            className="bg-white border border-gray-250 rounded-xl px-4 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="Todos">Todos na plataforma</option>
            <option value="Colegas">Apenas Colegas de Turma</option>
            <option value="Ninguém">Ninguém</option>
          </select>
        </div>

        {/* Opção 4: Visualização da Foto */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
          <div className="space-y-1">
            <span className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5"><UserCheck size={16} className="text-violet-650" /> Visualização da foto do perfil</span>
            <p className="text-[11.5px] text-gray-450 font-light leading-relaxed">Controle quem pode ver sua foto em alta resolução.</p>
          </div>
          
          <select
            value={privacidade.view_photo}
            onChange={(e) => handleSalvarPrivacidade('view_photo', e.target.value)}
            className="bg-white border border-gray-250 rounded-xl px-4 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="Todos">Todos na plataforma</option>
            <option value="Colegas">Apenas Colegas de Turma</option>
            <option value="Ninguém">Ninguém</option>
          </select>
        </div>

      </div>

    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  Search, 
  UserPlus, 
  FileText, 
  MessageSquare, 
  Heart, 
  GraduationCap, 
  AlertTriangle, 
  Settings, 
  ChevronRight, 
  MoreHorizontal, 
  Check, 
  X, 
  HelpCircle,
  Eye,
  Shield,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function Notificacoes() {
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();

  // Estados de dados
  const [notificacoes, setNotificacoes] = useState([]);
  const [perfisMap, setPerfisMap] = useState({});
  const [preferencias, setPreferencias] = useState({
    posts: true,
    comments: true,
    messages: true,
    announcements: true,
    events: true,
    mentions: true,
    system: true
  });

  // Estados locais
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState('todas'); // 'todas' | 'nao_lidas' | 'mencoes' | 'sistema'
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarDados();
  }, [usuario, perfil]);

  // Inscrição Realtime de Notificações
  useEffect(() => {
    if (!usuario) return;

    const canal = supabase
      .channel('notifs-realtime-page')
      .on('postgres_changes', { 
        event: 'INSERT', 
        table: 'notifications', 
        filter: `user_id=eq.${usuario.id}` 
      }, async (payload) => {
        const novaN = payload.new;
        
        // Carrega o perfil do ator
        if (novaN.actor_id) {
          const { data: pData } = await supabase.from('profiles').select('id, nome, avatar_url').eq('id', novaN.actor_id).single();
          if (pData) {
            setPerfisMap(prev => ({ ...prev, [pData.id]: pData }));
          }
        }
        
        setNotificacoes(prev => [novaN, ...prev]);
        toast.info(`Nova notificação: ${novaN.content}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuario]);

  async function carregarDados() {
    if (!usuario) return;
    try {
      setLoading(true);

      // 1. Notificações
      const { data: dataN, error: errN } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', usuario.id)
        .order('created_at', { ascending: false });
      
      if (errN) throw errN;
      setNotificacoes(dataN || []);

      // 2. Perfis dos Atores das Notificações
      const actorIds = [...new Set((dataN || []).map(n => n.actor_id).filter(Boolean))];
      if (actorIds.length > 0) {
        const { data: dataP } = await supabase.from('profiles').select('id, nome, avatar_url').in('id', actorIds);
        if (dataP) {
          const pMap = {};
          dataP.forEach(p => { pMap[p.id] = p; });
          setPerfisMap(pMap);
        }
      }

      // 3. Preferências de Notificação
      const { data: prefs, error: errPrefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', usuario.id)
        .maybeSingle();

      if (prefs) {
        setPreferencias(prefs);
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar notificações.');
    } finally {
      setLoading(false);
    }
  }

  // Marcar todas como lidas
  const handleMarcarTodasComoLidas = async () => {
    try {
      const unreadIds = notificacoes.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      
      if (error) throw error;

      setNotificacoes(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success('Todas as notificações foram marcadas como lidas.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar notificações.');
    }
  };

  // Marcar uma como lida/não lida
  const handleToggleLeitura = async (id, isRead) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: !isRead })
        .eq('id', id);
      
      if (error) throw error;

      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, is_read: !isRead } : n));
    } catch (err) {
      console.error(err);
    }
  };

  // Excluir notificação
  const handleExcluirNotificacao = async (id) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;

      setNotificacoes(prev => prev.filter(n => n.id !== id));
      toast.success('Notificação excluída.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir notificação.');
    }
  };

  // Atualizar Preferência
  const handleTogglePreferencia = async (campo) => {
    const novoValor = !preferencias[campo];
    setPreferencias(prev => ({ ...prev, [campo]: novoValor }));

    try {
      await supabase
        .from('notification_preferences')
        .upsert({
          user_id: usuario.id,
          ...preferencias,
          [campo]: novoValor,
          updated_at: new Date().toISOString()
        });
      toast.success('Preferências de notificação atualizadas!');
    } catch (err) {
      console.error(err);
    }
  };

  // Ícones específicos por categoria
  const getIconeCategoria = (type) => {
    switch (type) {
      case 'activity':
      case 'post':
        return <FileText size={16} className="text-violet-650" />;
      case 'comment':
        return <MessageSquare size={16} className="text-green-600" />;
      case 'announcement':
        return <Bell size={16} className="text-amber-600" />;
      case 'like':
        return <Heart size={16} className="text-red-500 fill-red-500" />;
      case 'follow':
      case 'turma':
        return <Users size={16} className="text-blue-600" />;
      case 'system':
        return <Shield size={16} className="text-violet-600" />;
      default:
        return <Bell size={16} className="text-gray-400" />;
    }
  };

  const getBgIcone = (type) => {
    switch (type) {
      case 'activity':
      case 'post':
        return 'bg-violet-50';
      case 'comment':
        return 'bg-green-50';
      case 'announcement':
        return 'bg-amber-50';
      case 'like':
        return 'bg-red-50';
      case 'follow':
      case 'turma':
        return 'bg-blue-50';
      case 'system':
        return 'bg-gray-100';
      default:
        return 'bg-gray-50';
    }
  };

  const formatarTempoRelativo = (dataIso) => {
    if (!dataIso) return '';
    const diff = (new Date() - new Date(dataIso)) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} horas`;
    return `há ${Math.floor(diff / 86400)} dias`;
  };

  // Contagens para os Filtros superiores
  const totalNotifs = notificacoes.length;
  const totalNaoLidas = notificacoes.filter(n => !n.is_read).length;
  const nomeLimpo = perfil?.nome ? perfil.nome.toLowerCase().replace(/\s+/g, '') : '';
  const totalMencoes = notificacoes.filter(n => n.content && n.content.toLowerCase().includes(`@${nomeLimpo}`)).length;
  const totalSistema = notificacoes.filter(n => n.type === 'system').length;

  // Filtragem da lista principal
  const notificacoesFiltradas = notificacoes.filter(n => {
    const bateBusca = !busca.trim() || (n.content && n.content.toLowerCase().includes(busca.toLowerCase()));
    
    if (tabAtiva === 'nao_lidas') return bateBusca && !n.is_read;
    if (tabAtiva === 'mencoes') return bateBusca && n.content && n.content.toLowerCase().includes(`@${nomeLimpo}`);
    if (tabAtiva === 'sistema') return bateBusca && n.type === 'system';
    
    return bateBusca;
  });

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando central de notificações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Notificações</h1>
        <p className="text-[12.5px] text-gray-500 font-light">Acompanhe tudo que acontece na sua rede educacional.</p>
      </div>

      {/* CONTAINER PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: LISTA DE NOTIFICAÇÕES */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 lg:col-span-2">
          
          {/* Barra de Abas Superiores */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-100 pb-3 gap-4">
            
            <div className="flex gap-4 border-b sm:border-none border-gray-55 w-full sm:w-auto">
              {[
                { id: 'todas', label: 'Todas', count: totalNotifs },
                { id: 'nao_lidas', label: 'Não lidas', count: totalNaoLidas },
                { id: 'mencoes', label: 'Menções', count: totalMencoes },
                { id: 'sistema', label: 'Sistema', count: totalSistema }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabAtiva(tab.id)}
                  className={`pb-2.5 text-[12.5px] font-bold transition-all relative flex items-center gap-1 cursor-pointer ${tabAtiva === tab.id ? 'text-violet-600 font-black' : 'text-gray-400 hover:text-gray-800'}`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{tab.count}</span>}
                  {tabAtiva === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-650 rounded-full" />}
                </button>
              ))}
            </div>

            <button 
              onClick={handleMarcarTodasComoLidas}
              className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck size={14} /> Marcar todas como lidas
            </button>

          </div>

          {/* Lista de Notificações */}
          <div className="divide-y divide-gray-50 space-y-4">
            {notificacoesFiltradas.map(n => {
              const ator = perfisMap[n.actor_id] || {};
              return (
                <div 
                  key={n.id} 
                  className={`pt-4 flex items-start justify-between gap-4 p-3 rounded-2xl transition-all ${!n.is_read ? 'bg-violet-50/10 border-l-2 border-violet-600' : ''}`}
                >
                  <div className="flex gap-4">
                    {/* Ícone com background tailored */}
                    <div className={`w-9 h-9 ${getBgIcone(n.type)} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm`}>
                      {getIconeCategoria(n.type)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-[12.5px]">{n.content}</span>
                        {!n.is_read && <span className="w-1.5 h-1.5 bg-violet-600 rounded-full" />}
                      </div>
                      
                      <p className="text-[11px] text-gray-400 font-light flex items-center gap-2">
                        {ator.nome && <span>por <b>{ator.nome}</b></span>}
                        <span>•</span>
                        <span>{formatarTempoRelativo(n.created_at)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => handleToggleLeitura(n.id, n.is_read)}
                      className="text-[10px] font-bold px-2.5 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                      {n.is_read ? 'Marcar não lida' : 'Marcar lida'}
                    </button>
                    
                    <button 
                      onClick={() => handleExcluirNotificacao(n.id)}
                      className="p-2 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-xl cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {notificacoesFiltradas.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-[12.5px] flex flex-col items-center justify-center gap-2">
                <CheckCircle size={32} className="text-green-500" />
                <span className="font-bold text-gray-600">Central limpa!</span>
                <p className="font-light">Você não tem notificações nesta aba.</p>
              </div>
            )}
            
            <div className="text-center pt-6 border-t border-gray-100 text-[11px] font-bold text-gray-400 flex items-center justify-center gap-1.5 select-none">
              Não há mais notificações <Check size={14} />
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: PREFERÊNCIAS & RESUMO */}
        <div className="space-y-6">
          
          {/* Preferências de Notificações */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Preferências</h3>
            <p className="text-[11.5px] text-gray-400 font-light leading-relaxed">Escolha como deseja receber notificações.</p>
            
            <div className="space-y-3.5 pt-2">
              {[
                { label: 'Novas postagens', campo: 'posts' },
                { label: 'Comentários', campo: 'comments' },
                { label: 'Mensagens', campo: 'messages' },
                { label: 'Avisos da turma', campo: 'announcements' },
                { label: 'Eventos', campo: 'events' },
                { label: 'Menções', campo: 'mentions' },
                { label: 'Sistema', campo: 'system' }
              ].map(pref => (
                <div key={pref.campo} className="flex items-center justify-between text-[12px] font-medium text-gray-700">
                  <span>{pref.label}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={preferencias[pref.campo]} 
                      onChange={() => handleTogglePreferencia(pref.campo)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3.5">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Resumo</h3>
            
            <div className="space-y-2 text-[11.5px] text-gray-500 font-medium">
              <div className="flex justify-between">
                <span>Total de notificações:</span>
                <span className="font-bold text-gray-900">{totalNotifs}</span>
              </div>
              <div className="flex justify-between">
                <span>Não lidas:</span>
                <span className="font-bold text-gray-900">{totalNaoLidas}</span>
              </div>
              <div className="flex justify-between">
                <span>Menções:</span>
                <span className="font-bold text-gray-900">{totalMencoes}</span>
              </div>
              <div className="flex justify-between">
                <span>De sistema:</span>
                <span className="font-bold text-gray-900">{totalSistema}</span>
              </div>
            </div>
          </div>

          {/* Dica App */}
          <div className="bg-[#6366f1]/5 border border-indigo-100/50 rounded-[2rem] p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-violet-650">
              <Bell size={20} />
            </div>
            <div className="space-y-1">
              <h4 className="text-[13px] font-extrabold text-indigo-900">Dica</h4>
              <p className="text-[11.5px] text-indigo-700/80 font-light leading-relaxed">Ative as notificações no seu celular para não perder nada importante!</p>
            </div>
            <button 
              onClick={() => toast.success('Notificações ativadas no seu dispositivo! 📱')}
              className="w-full py-2.5 bg-violet-650 hover:bg-violet-750 text-white font-bold text-[11.5px] rounded-xl cursor-pointer transition-colors shadow-sm"
            >
              Ativar agora
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
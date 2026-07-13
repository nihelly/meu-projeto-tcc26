import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Send, 
  Paperclip, 
  Smile, 
  Image as ImageIcon, 
  Phone, 
  Video, 
  Info, 
  MoreVertical, 
  CheckCheck, 
  Check, 
  Lock, 
  FileText, 
  X, 
  ChevronRight, 
  Circle, 
  Users, 
  Trash2, 
  Edit, 
  Pin, 
  Plus,
  Loader2,
  MicOff,
  Grid,
  Volume2,
  UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function Mensagens() {
  const { usuario, perfil } = useAuth();
  const isDarkTheme = true;
  
  // Estados de layout
  const [loading, setLoading] = useState(true);
  const [tabAtiva, setTabAtiva] = useState('todas'); // 'todas' | 'nao_lidas' | 'grupos'
  const [busca, setBusca] = useState('');
  const [buscaMensagem, setBuscaMensagem] = useState('');
  const [mostrarPainelDireito, setMostrarPainelDireito] = useState(true);
  const [mostrarEmojis, setMostrarEmojis] = useState(false);
  const [chamadaAtiva, setChamadaAtiva] = useState(null); // null | { type: 'audio' | 'video', roomName: string }
  const [duracaoChamada, setDuracaoChamada] = useState(0);
  const [chamadaMutada, setChamadaMutada] = useState(false);
  const [chamadaViva, setChamadaViva] = useState(false);
  const [estadoChamada, setEstadoChamada] = useState('chamando'); // 'chamando' | 'conectado'

  useEffect(() => {
    if (chamadaAtiva) {
      setEstadoChamada('chamando');
      setDuracaoChamada(0);
    }
  }, [chamadaAtiva]);

  useEffect(() => {
    let timer = null;
    if (chamadaAtiva && estadoChamada === 'conectado') {
      timer = setInterval(() => {
        setDuracaoChamada(prev => prev + 1);
      }, 1000);
    } else {
      setDuracaoChamada(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [chamadaAtiva, estadoChamada]);

  useEffect(() => {
    if (chamadaAtiva && estadoChamada === 'chamando') {
      const timeout = setTimeout(() => {
        setEstadoChamada('conectado');
      }, 3000); // 3 segundos tocando chamando
      return () => clearTimeout(timeout);
    }
  }, [chamadaAtiva, estadoChamada]);

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60).toString().padStart(2, '0');
    const seg = (segundos % 60).toString().padStart(2, '0');
    return `${min}:${seg}`;
  };

  // Estados de dados
  const [conversas, setConversas] = useState([]);
  const [conversaAtiva, setConversaAtiva] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [novoTexto, setNovoTexto] = useState('');
  const [digitando, setDigitando] = useState(false);
  const [membrosOnline, setMembrosOnline] = useState(1);
  const [modalNovoChatOpen, setModalNovoChatOpen] = useState(false);
  const [todosPerfis, setTodosPerfis] = useState([]);
  const [filtroNovoChatBusca, setFiltroNovoChatBusca] = useState('');
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [tipoArquivo, setTipoArquivo] = useState(null); // 'image' | 'document'
  const [uploading, setUploading] = useState(false);

  // Estados de Mensagem (Responder/Editar/Fixar)
  const [mensagemRespondendo, setMensagemRespondendo] = useState(null);
  const [mensagemEditando, setMensagemEditando] = useState(null);
  const [textoEditado, setTextoEditado] = useState('');

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Dicionário de Perfis nos chats
  const [profilesMap, setProfilesMap] = useState({});

  // Calcular total de mensagens não lidas
  const totalNaoLidas = (conversas || []).reduce((acc, curr) => acc + (curr.nao_lidas || 0), 0);

  useEffect(() => {
    carregarConversas();
  }, [usuario]);

  const marcarMensagensComoLidas = async (conversaId) => {
    if (!usuario || !conversaId || conversaId.startsWith('mock-')) return;
    try {
      // Buscar mensagens dessa conversa onde o usuário não é o remetente
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, read_by')
        .eq('conversation_id', conversaId)
        .neq('sender_id', usuario.id);

      if (msgs) {
        for (const msg of msgs) {
          const lidos = Array.isArray(msg.read_by) ? msg.read_by : [];
          if (!lidos.includes(usuario.id)) {
            const novosLidos = [...lidos, usuario.id];
            await supabase
              .from('messages')
              .update({ read_by: novosLidos })
              .eq('id', msg.id);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao marcar mensagens como lidas:', err);
    }
  };

  useEffect(() => {
    if (conversaAtiva) {
      carregarMensagens(conversaAtiva.id);

      // Zerar não lidas localmente na lista do painel lateral
      setConversas(prev => {
        const atualizadas = prev.map(c => 
          c.id === conversaAtiva.id ? { ...c, nao_lidas: 0 } : c
        );
        if (conversaAtiva.id.startsWith('mock-')) {
          localStorage.setItem('mockConversas', JSON.stringify(atualizadas));
        }
        return atualizadas;
      });

      // Banco de dados
      marcarMensagensComoLidas(conversaAtiva.id);
      
      // Subscrever a novas mensagens
      const canal = supabase
        .channel(`messages-${conversaAtiva.id}`)
        .on('postgres_changes', {
          event: '*',
          table: 'messages',
          filter: `conversation_id=eq.${conversaAtiva.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setMensagens(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMensagens(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMensagens(prev => prev.filter(m => m.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(canal);
      };
    }
  }, [conversaAtiva]);

  // Subscrever a novas mensagens de QUALQUER conversa para exibir notificações e badges
  useEffect(() => {
    if (!usuario || conversas.length === 0) return;

    const canalGlobal = supabase
      .channel('global-messages-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        table: 'messages'
      }, (payload) => {
        const msg = payload.new;
        
        // Se a mensagem for de outro remetente
        if (msg.sender_id !== usuario.id) {
          // Verificar se pertence a alguma de nossas conversas
          const conversa = conversas.find(c => c.id === msg.conversation_id);
          if (conversa) {
            // Se NÃO for a conversa ativa no momento, cria a notificação
            if (!conversaAtiva || conversaAtiva.id !== msg.conversation_id) {
              // 1. Enviar notificação toast
              toast.info(`Nova mensagem de ${conversa.nome}: "${msg.content.substring(0, 30)}${msg.content.length > 30 ? '...' : ''}" 💬`);
              
              // 2. Incrementar a contagem de não lidas localmente para essa conversa
              setConversas(prev => prev.map(c => 
                c.id === msg.conversation_id 
                  ? { 
                      ...c, 
                      nao_lidas: (c.nao_lidas || 0) + 1, 
                      ultima_mensagem: msg.content, 
                      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                    } 
                  : c
              ));
            }
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalGlobal);
    };
  }, [usuario, conversas, conversaAtiva]);

  // Rolar para o fim das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function carregarConversas() {
    if (!usuario) return;
    try {
      setLoading(true);

      // 1. Buscar conversas que o usuário participa
      const { data: membros, error: errMem } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', usuario.id);

      if (errMem) throw errMem;

      const conversaIds = (membros || []).map(m => m.conversation_id);

      if (conversaIds.length > 0) {
        // Buscar detalhes das conversas
        const { data: convData, error: errConv } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversaIds);

        if (errConv) throw errConv;

        // Buscar outros participantes de cada conversa
        const { data: todosMembros } = await supabase
          .from('conversation_members')
          .select('conversation_id, user_id')
          .in('conversation_id', conversaIds);

        const outrosUserIds = [...new Set((todosMembros || []).map(m => m.user_id).filter(id => id !== usuario.id))];

        let pMap = {};
        if (outrosUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nome, avatar_url, papel')
            .in('id', outrosUserIds);
          
          if (profiles) {
            profiles.forEach(p => { pMap[p.id] = p; });
            setProfilesMap(pMap);
          }
        }

        // Formatar lista de conversas
        const listaFormatada = (convData || []).map(c => {
          const meusMembros = (todosMembros || []).filter(m => m.conversation_id === c.id);
          const outroMembro = meusMembros.find(m => m.user_id !== usuario.id);
          const contato = outroMembro ? pMap[outroMembro.user_id] : null;

          return {
            id: c.id,
            nome: c.type === 'private' ? (contato?.nome || 'Contato EduConnect') : (c.name || 'Chat da Turma'),
            type: c.type,
            turma_id: c.turma_id,
            contato,
            ultima_mensagem: 'Selecione a conversa para iniciar.',
            hora: '10:30',
            nao_lidas: 0
          };
        });

        setConversas(listaFormatada);

        // Selecionar a primeira conversa por padrão
        if (listaFormatada.length > 0) {
          setConversaAtiva(listaFormatada[0]);
        }
      } else {
        const savedMock = localStorage.getItem('mockConversas');
        if (savedMock) {
          try {
            const parsed = JSON.parse(savedMock);
            setConversas(parsed);
            if (parsed.length > 0) {
              setConversaAtiva(parsed[0]);
            }
          } catch (e) {
            console.error('Erro ao ler mockConversas do localStorage:', e);
            localStorage.removeItem('mockConversas');
          }
        } else {
          // Caso o banco esteja zerado, criamos dados mock idênticos ao do mockup para visualização premium
          const mockConversas = [
            {
              id: 'mock-1',
              nome: 'Lucas Ferreira',
              type: 'private',
              contato: { nome: 'Lucas Ferreira', papel: 'Aluno', avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=150&q=80' },
              ultima_mensagem: 'Professor, posso tirar uma dúvida sobre a parte 2 do projeto?',
              hora: '10:30',
              nao_lidas: 2
            },
            {
              id: 'mock-2',
              nome: 'Turma 1º Ano A',
              type: 'group',
              ultima_mensagem: 'Mariana: Não esqueçam da atividade!',
              hora: '09:15',
              nao_lidas: 5
            },
            {
              id: 'mock-3',
              nome: 'Mariana Oliveira',
              type: 'private',
              contato: { nome: 'Mariana Oliveira', papel: 'Professora', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
              ultima_mensagem: 'Obrigada pela explicação!',
              hora: 'Ontem',
              nao_lidas: 1
            },
            {
              id: 'mock-4',
              nome: 'João Pedro',
              type: 'private',
              contato: { nome: 'João Pedro', papel: 'Aluno', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
              ultima_mensagem: 'Envio do trabalho final',
              hora: 'Ontem',
              nao_lidas: 0
            },
            {
              id: 'mock-5',
              nome: 'Projeto Sustentabilidade',
              type: 'group',
              ultima_mensagem: 'Lucas: Vou enviar os dados da pesquisa.',
              hora: 'Ontem',
              nao_lidas: 3
            }
          ];
          setConversas(mockConversas);
          localStorage.setItem('mockConversas', JSON.stringify(mockConversas));
          if (mockConversas.length > 0) {
            setConversaAtiva(mockConversas[0]);
          }
        }
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar conversas.');
    } finally {
      setLoading(false);
    }
  }

  const abrirModalNovoChat = async () => {
    setModalNovoChatOpen(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, avatar_url, papel')
        .neq('id', usuario.id);
      if (!error && data) {
        setTodosPerfis(data);
      }
    } catch (err) {
      console.error('Erro ao buscar perfis:', err);
    }
  };

  const iniciarConversaReal = async (outroPerfil) => {
    try {
      // 1. Verificar se já existe uma conversa privada entre ambos
      const { data: minhasMembro } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', usuario.id);

      const { data: outroMembro } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', outroPerfil.id);

      const meusIds = (minhasMembro || []).map(m => m.conversation_id);
      const outroIds = (outroMembro || []).map(m => m.conversation_id);

      // Encontrar ID de conversa comum
      const comumIds = meusIds.filter(id => outroIds.includes(id));

      if (comumIds.length > 0) {
        // Buscar se alguma dessas conversas comuns é privada (tipo 'private')
        const { data: convComum } = await supabase
          .from('conversations')
          .select('id')
          .in('id', comumIds)
          .eq('type', 'private')
          .limit(1);

        if (convComum && convComum.length > 0) {
          // A conversa já existe, apenas ativa ela!
          const { data: convDetalhes } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', convComum[0].id)
            .single();

          if (convDetalhes) {
            const formatada = {
              id: convDetalhes.id,
              nome: outroPerfil.nome,
              type: 'private',
              turma_id: null,
              contato: outroPerfil,
              ultima_mensagem: 'Conversa iniciada.',
              hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              nao_lidas: 0
            };
            setConversas(prev => {
              if (prev.some(c => c.id === formatada.id)) return prev;
              return [formatada, ...prev];
            });
            setConversaAtiva(formatada);
            setModalNovoChatOpen(false);
            return;
          }
        }
      }

      // 2. Se não existir, criar uma nova conversa privada
      const { data: novaConv, error: errConv } = await supabase
        .from('conversations')
        .insert({
          type: 'private',
          name: `${perfil?.nome} e ${outroPerfil.nome}`
        })
        .select()
        .single();

      if (errConv) throw errConv;

      // 3. Adicionar membros
      const { error: errMembros } = await supabase
        .from('conversation_members')
        .insert([
          { conversation_id: novaConv.id, user_id: usuario.id },
          { conversation_id: novaConv.id, user_id: outroPerfil.id }
        ]);

      if (errMembros) throw errMembros;

      const novaFormatada = {
        id: novaConv.id,
        nome: outroPerfil.nome,
        type: 'private',
        turma_id: null,
        contato: outroPerfil,
        ultima_mensagem: 'Nenhuma mensagem ainda.',
        hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        nao_lidas: 0
      };

      setConversas(prev => [novaFormatada, ...prev]);
      setConversaAtiva(novaFormatada);
      setModalNovoChatOpen(false);
      toast.success(`Conversa com ${outroPerfil.nome} iniciada! 💬`);
    } catch (err) {
      console.error('Erro ao iniciar conversa:', err);
      toast.error('Erro ao iniciar conversa.');
    }
  };

  const handleSelecionarArquivo = (e, tipo) => {
    const file = e.target.files[0];
    if (!file) return;
    setArquivoSelecionado(file);
    setTipoArquivo(tipo);
  };

  const iniciarChamadaReal = async (tipo) => {
    if (!conversaAtiva) return;
    const roomName = `educonnect-call-${conversaAtiva.id}`;
    setChamadaAtiva({ type: tipo, roomName });

    // Opcionalmente enviar mensagem notificando o outro usuário no chat
    if (conversaAtiva.id.startsWith('mock-')) {
      const novaMsg = {
        id: `local-${Math.random()}`,
        sender_id: usuario?.id || 'me',
        content: `📞 Iniciou uma chamada de ${tipo === 'video' ? 'vídeo' : 'áudio'}. Clique nos botões de ligação no topo da conversa para participar!`,
        type: 'text',
        created_at: new Date().toISOString()
      };
      setMensagens(prev => [...prev, novaMsg]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversaAtiva.id,
          sender_id: usuario.id,
          content: `📞 Iniciou uma chamada de ${tipo === 'video' ? 'vídeo' : 'áudio'}. Clique nos botões de ligação no topo da conversa para participar!`,
          type: 'text'
        })
        .select()
        .single();
      
      if (!error && data) {
        setMensagens(prev => [...prev, data]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  async function carregarMensagens(conversaId) {
    if (conversaId.startsWith('mock-')) {
      // Mock mensagens
      const mockMsg = [
        {
          id: 'm1',
          sender_id: 'outro',
          content: 'Professor, posso tirar uma dúvida sobre a parte 2 do projeto?',
          type: 'text',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'm2',
          sender_id: usuario?.id || 'me',
          content: 'Claro, Lucas! Pode me falar 😊',
          type: 'text',
          created_at: new Date(Date.now() - 3000000).toISOString()
        },
        {
          id: 'm3',
          sender_id: 'outro',
          content: 'Na parte da pesquisa, qual formato devemos usar para apresentar os dados?',
          type: 'text',
          created_at: new Date(Date.now() - 2000000).toISOString()
        },
        {
          id: 'm4',
          sender_id: usuario?.id || 'me',
          content: 'Você pode usar gráficos ou tabelas, o importante é que fique claro e organizado.',
          type: 'text',
          created_at: new Date(Date.now() - 1000000).toISOString()
        },
        {
          id: 'm5',
          sender_id: 'outro',
          content: 'Entendi! Muito obrigado!',
          type: 'text',
          reactions: [{ emoji: '❤️', user_id: 'outro' }],
          created_at: new Date(Date.now() - 500000).toISOString()
        },
        {
          id: 'm6',
          sender_id: usuario?.id || 'me',
          content: 'De nada! Qualquer coisa, estou à disposição. 😊',
          type: 'text',
          created_at: new Date(Date.now() - 100000).toISOString()
        }
      ];
      setMensagens(mockMsg);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMensagens(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  // --- ENVIAR MENSAGEM ---
  const handleEnviarMensagem = async (e) => {
    e.preventDefault();
    if (!novoTexto.trim() && !arquivoSelecionado) return;
    if (!conversaAtiva) return;

    const textoLocal = novoTexto;
    setNovoTexto('');
    setMostrarEmojis(false);

    let fileUrl = null;
    let finalType = 'text';

    if (arquivoSelecionado) {
      setUploading(true);
      try {
        const fileId = Math.random().toString(36).substring(2, 10);
        const cleanName = arquivoSelecionado.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const filePath = `${usuario.id}/${fileId}_${cleanName}`;

        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, arquivoSelecionado);

        if (error) {
          console.warn('Erro ao subir para chat-attachments, tentando post-images:', error);
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('post-images')
            .upload(filePath, arquivoSelecionado);

          if (fallbackError) throw fallbackError;

          const { data: { publicUrl } } = supabase.storage
            .from('post-images')
            .getPublicUrl(filePath);
          
          fileUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('chat-attachments')
            .getPublicUrl(filePath);
          
          fileUrl = publicUrl;
        }

        finalType = tipoArquivo;
        if (arquivoSelecionado.name.toLowerCase().endsWith('.pdf')) {
          finalType = 'pdf';
        }
      } catch (err) {
        console.error('Erro no upload:', err);
        toast.error('Erro ao fazer upload do arquivo.');
        setUploading(false);
        return;
      }
      setUploading(false);
      setArquivoSelecionado(null);
      setTipoArquivo(null);
    }

    const contentToSend = fileUrl || textoLocal;
    const msgType = fileUrl ? finalType : 'text';

    if (conversaAtiva.id.startsWith('mock-')) {
      // Adicionar mock local
      const novaMsg = {
        id: `local-${Math.random()}`,
        sender_id: usuario?.id || 'me',
        content: contentToSend,
        type: msgType,
        created_at: new Date().toISOString()
      };
      setMensagens(prev => [...prev, novaMsg]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversaAtiva.id,
          sender_id: usuario.id,
          content: contentToSend,
          type: msgType,
          reply_to: mensagemRespondendo?.id || null
        })
        .select()
        .single();

      if (error) throw error;

      // Adicionar a mensagem enviada localmente na lista imediatamente
      setMensagens(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      setMensagemRespondendo(null);

      // Registrar log de auditoria
      await supabase.from('security_logs').insert({
        user_id: usuario.id,
        action: 'Mensagem enviada',
        details: `Mensagem enviada na conversa: ${conversaAtiva.nome}`
      });

    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar mensagem.');
    }
  };

  // --- REAGIR COM EMOJI ---
  const handleReagirEmoji = async (msgId, emoji) => {
    if (conversaAtiva.id.startsWith('mock-')) {
      setMensagens(prev => prev.map(m => {
        if (m.id === msgId) {
          const reactions = m.reactions || [];
          return { ...m, reactions: [...reactions, { emoji, user_id: 'me' }] };
        }
        return m;
      }));
      return;
    }

    try {
      const msg = mensagens.find(m => m.id === msgId);
      const reactions = msg.reactions || [];
      const novaReacao = { emoji, user_id: usuario.id };

      const { error } = await supabase
        .from('messages')
        .update({
          reactions: [...reactions, novaReacao]
        })
        .eq('id', msgId);

      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  // --- BUSCA E FILTROS ---
  const conversasFiltradas = conversas.filter(c => {
    const bateBusca = c.nome.toLowerCase().includes(busca.toLowerCase());
    if (tabAtiva === 'nao_lidas') return bateBusca && c.nao_lidas > 0;
    if (tabAtiva === 'grupos') return bateBusca && c.type === 'group';
    return bateBusca;
  });

  return (
    <div className={`h-[calc(100vh-130px)] flex bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm ${isDarkTheme ? 'dark-chat-theme' : ''}`}>
      {isDarkTheme && (
        <style>{`
          .dark-chat-theme {
            background-color: #08070d !important;
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          /* Coluna esquerda (Lista de Conversas) */
          .dark-chat-theme .w-\[340px\].bg-white {
            background-color: #0c0b12 !important;
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          .dark-chat-theme .text-gray-950,
          .dark-chat-theme .text-gray-900,
          .dark-chat-theme .text-gray-850,
          .dark-chat-theme .text-gray-800 {
            color: #ffffff !important;
          }
          .dark-chat-theme .text-gray-400 {
            color: #8e8d97 !important;
          }
          .dark-chat-theme .divide-gray-50\/50 > * {
            border-color: rgba(255, 255, 255, 0.04) !important;
          }
          .dark-chat-theme .hover\:bg-gray-50\/50:hover {
            background-color: rgba(255, 255, 255, 0.03) !important;
          }
          .dark-chat-theme .bg-violet-50\/40 {
            background-color: rgba(139, 92, 246, 0.12) !important;
          }
          /* Campo Busca */
          .dark-chat-theme .bg-gray-50.border.border-gray-100 {
            background-color: #07060a !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
          }
          /* Cabeçalho do Chat */
          .dark-chat-theme .h-16.border-b.border-gray-100.bg-white {
            background-color: #0c0b12 !important;
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          /* Área de Histórico (Fundo cinza vira roxo escuro premium) */
          .dark-chat-theme .bg-gray-50\/30 {
            background-color: #12101e !important;
            background-image: radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.15), transparent 450px),
                              radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.08), transparent 450px) !important;
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          /* Balões de Mensagem Recebida (Preto) */
          .dark-chat-theme .bg-white.text-gray-900 {
            background-color: #07060a !important;
            color: #ffffff !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          /* Balões de Mensagem Enviada (Gradiente Roxo/Azul) */
          .dark-chat-theme .bg-violet-100 {
            background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%) !important;
            color: #ffffff !important;
          }
          /* Barra de digitação inferior */
          .dark-chat-theme .p-4.bg-white.border-t.border-gray-100 {
            background-color: #0c0b12 !important;
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          .dark-chat-theme .bg-gray-50.border.border-gray-100 {
            background-color: #07060a !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
          }
          /* Painel Lateral Direito */
          .dark-chat-theme .w-\[300px\].bg-white {
            background-color: #0c0b12 !important;
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          .dark-chat-theme .border-gray-50,
          .dark-chat-theme .border-gray-55 {
            border-color: rgba(255, 255, 255, 0.06) !important;
          }
          .dark-chat-theme .bg-violet-50 {
            background-color: rgba(139, 92, 246, 0.12) !important;
            color: #a78bfa !important;
          }
          .dark-chat-theme .bg-gray-50.hover\:bg-gray-100 {
            background-color: #07060a !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
            color: #ffffff !important;
          }
          .dark-chat-theme .bg-gray-50.hover\:bg-gray-100:hover {
            background-color: rgba(255, 255, 255, 0.05) !important;
          }
          /* Ícones e Checks */
          .dark-chat-theme .text-violet-600 {
            color: #a78bfa !important;
          }
          .dark-chat-theme .text-gray-450 {
            color: #8e8d97 !important;
          }
          .dark-chat-theme .text-gray-450:hover {
            color: #ffffff !important;
          }
          /* Reações e popovers */
          .dark-chat-theme .absolute.bg-white.border.border-gray-100 {
            background-color: #0c0b12 !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          .dark-chat-theme .bg-gray-50.border.border-gray-150 {
            background-color: #0c0b12 !important;
            border-color: rgba(255, 255, 255, 0.08) !important;
          }
          /* Botão bloquear conversa (Roxo) */
          .dark-chat-theme .bg-red-50 {
            background-color: rgba(139, 92, 246, 0.15) !important;
            border-color: rgba(139, 92, 246, 0.3) !important;
            color: #a78bfa !important;
          }
          .dark-chat-theme .bg-red-50:hover {
            background-color: #8b5cf6 !important;
            color: #ffffff !important;
            border-color: #8b5cf6 !important;
          }
        `}</style>
      )}
      
      {/* COLUNA ESQUERDA: LISTA DE CONVERSAS */}
      <div className="w-[340px] border-r border-gray-100 flex flex-col flex-shrink-0 bg-white">
        
        {/* Topo Barra Lateral */}
        <div className="p-6 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-black text-gray-950 tracking-tight">Mensagens</h2>
            <button 
              onClick={abrirModalNovoChat}
              className="w-8 h-8 bg-violet-600 hover:bg-violet-750 text-white rounded-xl flex items-center justify-center cursor-pointer transition-colors shadow-sm"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Campo Busca */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input 
              type="text" 
              placeholder="Buscar conversa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 focus:border-gray-250 rounded-xl pl-10 pr-4 py-2 text-[12px] font-medium outline-none transition-colors"
            />
          </div>

          {/* Tabs Filtro */}
          <div className="flex items-center gap-1.5 border-b border-gray-50 pb-1.5 text-[11px] font-bold text-gray-400 select-none">
            <button 
              onClick={() => setTabAtiva('todas')}
              className={`pb-2 px-1 relative cursor-pointer ${tabAtiva === 'todas' ? 'text-violet-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-violet-650' : 'hover:text-gray-600'}`}
            >
              Todas
            </button>
            <button 
              onClick={() => setTabAtiva('nao_lidas')}
              className={`pb-2 px-1 relative cursor-pointer flex items-center gap-1 ${tabAtiva === 'nao_lidas' ? 'text-violet-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-violet-650' : 'hover:text-gray-600'}`}
            >
              Não lidas {totalNaoLidas > 0 && <span className="bg-violet-100 text-violet-750 text-[9px] font-black px-1.5 py-0.5 rounded-full">{totalNaoLidas}</span>}
            </button>
            <button 
              onClick={() => setTabAtiva('grupos')}
              className={`pb-2 px-1 relative cursor-pointer ${tabAtiva === 'grupos' ? 'text-violet-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-violet-650' : 'hover:text-gray-600'}`}
            >
              Grupos
            </button>
          </div>
        </div>

        {/* Lista de Contatos/Chats */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50/50">
          {conversasFiltradas.map((c) => {
            const ativa = conversaAtiva?.id === c.id;
            return (
              <div 
                key={c.id}
                onClick={() => setConversaAtiva(c)}
                className={`p-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50/50 select-none ${ativa ? 'bg-violet-50/40 border-l-[3px] border-violet-600' : ''}`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {c.type === 'private' ? (
                    <img 
                      src={c.contato?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                      alt={c.nome} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center">
                      <Users size={18} />
                    </div>
                  )}
                  {c.type === 'private' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Conteúdo Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[12.5px] text-gray-900 truncate">{c.nome}</span>
                    <span className="text-[10px] text-gray-400 font-light">{c.hora}</span>
                  </div>
                  <p className="text-[11.5px] text-gray-400 font-light truncate leading-normal">{c.ultima_mensagem}</p>
                </div>

                {/* Badges não lidas */}
                {c.nao_lidas > 0 && (
                  <span className="w-4.5 h-4.5 bg-violet-650 text-white font-extrabold text-[9.5px] rounded-full flex items-center justify-center flex-shrink-0">
                    {c.nao_lidas}
                  </span>
                )}
              </div>
            );
          })}
          {conversasFiltradas.length === 0 && (
            <div className="p-8 text-center text-gray-400 font-light text-[12px]">Nenhuma conversa encontrada.</div>
          )}
        </div>

      </div>

      {/* COLUNA CENTRAL: CHAT ATIVO */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30">
        
        {/* Cabeçalho da Conversa */}
        {conversaAtiva && (
          <div className="h-16 border-b border-gray-100 bg-white px-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              {conversaAtiva.type === 'private' ? (
                <img 
                  src={conversaAtiva.contato?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                  alt={conversaAtiva.nome} 
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center">
                  <Users size={16} />
                </div>
              )}
              <div>
                <h3 className="font-bold text-[13.5px] text-gray-950 leading-tight">{conversaAtiva.nome}</h3>
                <span className="text-[10px] text-green-500 font-medium flex items-center gap-1 mt-0.5">
                  <Circle className="fill-green-500" size={6} /> Online
                </span>
              </div>
            </div>

            {/* Ações Cabeçalho */}
            <div className="flex items-center gap-3.5 text-gray-450">
              <button onClick={() => iniciarChamadaReal('audio')} className="hover:text-black transition-colors cursor-pointer" title="Chamada de Áudio"><Phone size={17} /></button>
              <button onClick={() => iniciarChamadaReal('video')} className="hover:text-black transition-colors cursor-pointer" title="Chamada de Vídeo"><Video size={17} /></button>
              <button 
                onClick={() => setMostrarPainelDireito(!mostrarPainelDireito)} 
                className={`hover:text-black transition-colors cursor-pointer ${mostrarPainelDireito ? 'text-violet-650' : ''}`}
              >
                <Info size={17} />
              </button>
            </div>
          </div>
        )}

        {/* Histórico das Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {mensagens.map((msg, index) => {
            const enviadaPorMim = msg.sender_id === usuario?.id || msg.sender_id === 'me';
            return (
              <div 
                key={msg.id || index}
                className={`flex gap-3 max-w-[75%] ${enviadaPorMim ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Remetente */}
                {!enviadaPorMim && (
                  <img 
                    src={conversaAtiva?.contato?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                    alt="Remetente" 
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                )}

                {/* Balão da Mensagem */}
                <div className="space-y-1">
                  <div className={`rounded-2xl px-4 py-2.5 text-[12px] leading-relaxed shadow-sm relative group ${
                    enviadaPorMim 
                      ? 'bg-violet-100 text-gray-905 rounded-tr-sm' 
                      : 'bg-white text-gray-900 rounded-tl-sm border border-gray-100/60'
                  }`}>
                    {msg.type === 'image' ? (
                      <div className="relative rounded-lg overflow-hidden max-w-xs my-1 border border-gray-150/40">
                        <img 
                          src={msg.content} 
                          alt="Anexo de Imagem" 
                          className="w-full max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity" 
                          onClick={() => window.open(msg.content, '_blank')}
                        />
                      </div>
                    ) : msg.type === 'pdf' || msg.type === 'document' ? (
                      <a 
                        href={msg.content} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-colors my-1 ${
                          enviadaPorMim 
                            ? 'bg-violet-200/50 border-violet-300 text-violet-950 hover:bg-violet-250/50' 
                            : 'bg-gray-50 border-gray-150 text-gray-800 hover:bg-gray-100'
                        }`}
                      >
                        <FileText size={18} className="text-violet-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-bold block truncate">
                            {msg.content.substring(msg.content.lastIndexOf('/') + 1).split('_').slice(1).join('_') || 'Documento Anexo'}
                          </span>
                          <span className="text-[9.5px] text-gray-400 block font-light">Clique para abrir</span>
                        </div>
                      </a>
                    ) : (
                      <p>{msg.content}</p>
                    )}

                    {/* Reações de Emojis */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="absolute -bottom-2 right-2 bg-white border border-gray-100 rounded-full px-1.5 py-0.5 shadow-sm text-[10px] flex items-center gap-0.5 z-10">
                        {msg.reactions.map((r, ri) => (
                          <span key={ri} title="Reação">{r.emoji}</span>
                        ))}
                        {msg.reactions.length > 1 && <span className="text-gray-400 font-bold">{msg.reactions.length}</span>}
                      </div>
                    )}

                    {/* Barra de Reação Flutuante */}
                    <div className="absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1 bg-white border border-gray-100 rounded-full p-1 shadow-md z-25 transition-all duration-200 -left-20">
                      {['👍', '❤️', '😂', '🔥'].map(emoji => (
                        <button 
                          key={emoji}
                          onClick={() => handleReagirEmoji(msg.id, emoji)}
                          className="hover:scale-125 transition-transform text-[11px] cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Metadados */}
                  <div className={`flex items-center gap-1 text-[9.5px] text-gray-400 font-light ${enviadaPorMim ? 'justify-end' : 'justify-start'}`}>
                    <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {enviadaPorMim && <CheckCheck className="text-violet-600" size={13} />}
                  </div>
                </div>

              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Barra de Entrada / Digitação */}
        <div className="p-4 bg-white border-t border-gray-100 space-y-2 flex-shrink-0">
          
          {/* Arquivo Selecionado Preview Banner */}
          {arquivoSelecionado && (
            <div className={`p-2.5 px-4 rounded-xl flex items-center justify-between text-[11px] font-bold ${
              isDarkTheme ? 'bg-[#12111a] border border-white/5 text-white' : 'bg-violet-50 border border-violet-100 text-violet-950'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                {tipoArquivo === 'image' ? (
                  <ImageIcon size={15} className="text-violet-650 flex-shrink-0" />
                ) : (
                  <FileText size={15} className="text-violet-650 flex-shrink-0" />
                )}
                <span className="truncate">{arquivoSelecionado.name}</span>
                <span className="text-gray-400 font-light font-sans">({(arquivoSelecionado.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setArquivoSelecionado(null);
                  setTipoArquivo(null);
                }}
                className="text-gray-450 hover:text-red-500 cursor-pointer p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form onSubmit={handleEnviarMensagem} className="flex items-center gap-3">
            {/* Inputs ocultos */}
            <input 
              type="file" 
              id="chat-file-input" 
              className="hidden" 
              onChange={(e) => handleSelecionarArquivo(e, 'document')}
            />
            <input 
              type="file" 
              id="chat-image-input" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => handleSelecionarArquivo(e, 'image')}
            />

            {/* Botão Anexar */}
            <button 
              type="button" 
              onClick={() => document.getElementById('chat-file-input').click()}
              className="text-gray-450 hover:text-black transition-colors cursor-pointer"
            >
              <Paperclip size={18} />
            </button>

            {/* Seletor Emojis */}
            <button 
              type="button" 
              onClick={() => setMostrarEmojis(!mostrarEmojis)}
              className="text-gray-450 hover:text-black transition-colors cursor-pointer"
            >
              <Smile size={18} />
            </button>

            {/* Input Campo */}
            <input 
              type="text" 
              placeholder={uploading ? "Enviando arquivo..." : "Digite sua mensagem..."}
              value={novoTexto}
              onChange={(e) => setNovoTexto(e.target.value)}
              disabled={uploading}
              className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[12px] font-medium outline-none disabled:opacity-50"
            />

            {/* Upload Imagem */}
            <button 
              type="button" 
              onClick={() => document.getElementById('chat-image-input').click()}
              className="text-gray-450 hover:text-black transition-colors cursor-pointer"
            >
              <ImageIcon size={18} />
            </button>

            {/* Botão Enviar */}
            <button 
              type="submit"
              disabled={uploading}
              className="bg-violet-600 hover:bg-violet-750 text-white font-bold text-[12px] px-5 py-2.5 rounded-xl cursor-pointer transition-colors shadow-sm shadow-indigo-500/10 flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={13} />
                  Enviando...
                </>
              ) : (
                'Enviar'
              )}
            </button>
          </form>

          {/* Lista Emojis flutuante */}
          {mostrarEmojis && (
            <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex gap-2 flex-wrap max-w-xs animate-in slide-in-from-bottom-2 duration-200">
              {['😊', '👍', '❤️', '😂', '🔥', '👏', '😮', '😢', '🎓', '📚'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => {
                    setNovoTexto(prev => prev + emoji);
                    setMostrarEmojis(false);
                  }}
                  className="text-[16px] hover:scale-120 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* COLUNA DIREITA: INFORMAÇÕES DA CONVERSA / TURMA */}
      {mostrarPainelDireito && conversaAtiva && (
        <div className="w-[300px] border-l border-gray-100 flex flex-col flex-shrink-0 bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
          
          {/* Header Info */}
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-bold text-[13.5px] text-gray-950">Informações da conversa</h3>
            <button onClick={() => toast.info('Ações da conversa')} className="text-gray-450 hover:text-black cursor-pointer"><MoreVertical size={16} /></button>
          </div>

          {/* Perfil Ficha */}
          <div className="p-6 text-center space-y-3 border-b border-gray-50">
            <div className="relative w-20 h-20 mx-auto">
              {conversaAtiva.type === 'private' ? (
                <img 
                  src={conversaAtiva.contato?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                  alt={conversaAtiva.nome} 
                  className="w-20 h-20 rounded-full object-cover mx-auto border border-gray-100"
                />
              ) : (
                <div className="w-20 h-20 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center mx-auto">
                  <Users size={32} />
                </div>
              )}
              <span className="absolute bottom-0 right-4 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
            </div>

            <div>
              <h4 className="font-black text-[14.5px] text-gray-950 leading-tight">{conversaAtiva.nome}</h4>
              <span className="text-[10px] text-gray-450 font-light block mt-1">
                {conversaAtiva.type === 'private' ? `${conversaAtiva.contato?.papel || 'Aluno'} • 1º Ano A` : 'Chat do Grupo Escolar'}
              </span>
            </div>
          </div>

          {/* Seção Sobre */}
          <div className="p-6 border-b border-gray-55 space-y-2">
            <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block">Sobre</span>
            <p className="text-[11.5px] text-gray-500 font-light leading-relaxed">
              {conversaAtiva.type === 'private' 
                ? 'Membro ativo do conselho estudantil do 1º Ano A, participando frequentemente nas oficinas acadêmicas.' 
                : 'Espaço acadêmico destinado à troca de materiais de estudos, avisos escolares da coordenação e debates.'}
            </p>
          </div>

          {/* Arquivos Compartilhados */}
          <div className="p-6 border-b border-gray-55 space-y-3.5">
            <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block">Arquivos compartilhados</span>
            
            <div className="space-y-3">
              {[
                { name: 'Guia_da_atividade.pdf', size: '1.2 MB' },
                { name: 'Exemplo_grafico.png', size: '842 KB' },
                { name: 'Roteiro_projeto.docx', size: '2.4 MB' }
              ].map((arq, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-violet-50 text-violet-650 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={15} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11.5px] font-bold text-gray-800 block truncate">{arq.name}</span>
                    <span className="text-[10px] text-gray-400 font-light">{arq.size}</span>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => toast.info('Todos os arquivos compartilhados já estão listados.')}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-650 font-bold text-[11px] py-2 rounded-xl transition-all cursor-pointer border border-gray-150/40 text-center"
            >
              Ver todos os arquivos
            </button>
          </div>

          {/* Fotos Compartilhadas */}
          <div className="p-6 border-b border-gray-55 space-y-3.5">
            <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider block">Fotos compartilhadas</span>
            
            <div className="grid grid-cols-3 gap-2">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="foto" className="w-full h-14 object-cover rounded-lg border border-gray-100" />
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=100&q=80" alt="foto" className="w-full h-14 object-cover rounded-lg border border-gray-100" />
              <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80" alt="foto" className="w-full h-14 object-cover rounded-lg border border-gray-100" />
            </div>

            <button 
              onClick={() => toast.info('Fotos compartilhadas carregadas.')}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-650 font-bold text-[11px] py-2 rounded-xl transition-all cursor-pointer border border-gray-150/40 text-center"
            >
              Ver todas as fotos
            </button>
          </div>

          {/* Ações */}
          <div className="p-6">
            <button 
              onClick={() => toast.success('Conversa bloqueada temporariamente.')}
              className="w-full bg-red-50 hover:bg-red-100 text-red-750 font-bold text-[11.5px] py-2.5 rounded-xl transition-all cursor-pointer border border-red-200/50 text-center"
            >
              Bloquear conversa
            </button>
          </div>

        </div>
      )}

      {modalNovoChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-[2rem] border shadow-2xl overflow-hidden flex flex-col max-h-[500px] animate-in zoom-in-95 duration-200 ${isDarkTheme ? 'bg-[#0d0c13] border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'}`}>
            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between ${isDarkTheme ? 'border-white/5' : 'border-gray-50'}`}>
              <h3 className="font-extrabold text-[15px]">Iniciar conversa real</h3>
              <button 
                onClick={() => setModalNovoChatOpen(false)}
                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${isDarkTheme ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Busca */}
            <div className={`p-4 border-b ${isDarkTheme ? 'border-white/5' : 'border-gray-50'}`}>
              <input 
                type="text" 
                placeholder="Buscar usuário por nome..."
                value={filtroNovoChatBusca}
                onChange={(e) => setFiltroNovoChatBusca(e.target.value)}
                className={`w-full border rounded-xl px-4 py-2.5 text-[12px] font-medium outline-none transition-colors ${isDarkTheme ? 'bg-[#07060a] border-white/10 focus:border-violet-500 text-white' : 'bg-gray-50 border-gray-100 focus:border-violet-600'}`}
              />
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50/50 p-2">
              {todosPerfis
                .filter(p => (p.nome || '').toLowerCase().includes(filtroNovoChatBusca.toLowerCase()))
                .map(p => (
                  <div 
                    key={p.id}
                    onClick={() => iniciarConversaReal(p)}
                    className={`p-3.5 flex items-center gap-3 rounded-2xl cursor-pointer transition-colors ${isDarkTheme ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                  >
                    <img 
                      src={p.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                      alt={p.nome} 
                      className="w-9 h-9 rounded-full object-cover border border-gray-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12.5px] font-bold block truncate">{p.nome || 'Sem nome'}</span>
                      <span className="text-[9.5px] text-gray-400 font-medium block capitalize">{p.papel || 'Membro'}</span>
                    </div>
                  </div>
                ))}
              {todosPerfis.filter(p => (p.nome || '').toLowerCase().includes(filtroNovoChatBusca.toLowerCase())).length === 0 && (
                <div className="p-8 text-center text-[12px] text-gray-400 font-medium">Nenhum usuário encontrado.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CHAMADA DE VÍDEO/ÁUDIO NATIVO (COM BACKEND JITSI MEET OCULTO) */}
      {chamadaAtiva && (
        <div className="fixed inset-0 z-50 bg-[#09080f] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          
          {/* Iframe Jitsi Oculto em Segundo Plano para Chamada de Áudio */}
          <iframe
            src={`https://meet.jit.si/${chamadaAtiva.roomName}#config.prejoinPageEnabled=false&config.prejoinConfig.enabled=false&userInfo.displayName="${encodeURIComponent(perfil?.nome || 'Usuário')}"${chamadaAtiva.type === 'audio' ? '&config.startAudioOnly=true' : ''}`}
            className="w-0 h-0 absolute pointer-events-none"
            allow="camera; microphone; fullscreen; display-capture; autoplay"
          ></iframe>

          {/* TELA DE CHAMANDO (RINGING) */}
          {estadoChamada === 'chamando' && (
            <div className="w-full max-w-sm flex flex-col items-center justify-between h-[80vh] py-12 text-center text-white">
              
              {/* Cabeçalho */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">EduConnect Call</span>
                <span className="text-[12px] font-light text-violet-300 block">Chamando...</span>
              </div>

              {/* Centro: Avatar com Pulso */}
              <div className="relative my-8">
                <div className="absolute inset-0 rounded-full bg-violet-650/20 animate-ping opacity-75 scale-125"></div>
                <div className="absolute -inset-4 rounded-full border border-violet-500/10 animate-pulse"></div>
                <img 
                  src={conversaAtiva?.contato?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                  alt={conversaAtiva?.nome}
                  className="w-32 h-32 rounded-full object-cover border border-violet-500 relative z-10 shadow-2xl"
                />
              </div>

              {/* Informações do Usuário */}
              <div className="space-y-1">
                <h2 className="text-2.5xl font-black tracking-tight">{conversaAtiva?.nome}</h2>
                <span className="text-[11px] text-gray-450 uppercase font-bold tracking-wider block">
                  {conversaAtiva?.contato?.papel || 'Membro'}
                </span>
              </div>

              {/* Controles de chamada (Atender / Recusar) */}
              <div className="flex items-center gap-12 pt-6">
                {/* Cancelar/Recusar */}
                <button
                  onClick={() => setChamadaAtiva(null)}
                  className="w-16 h-16 rounded-full bg-red-650 hover:bg-red-750 text-white flex items-center justify-center cursor-pointer transition-all shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95"
                  title="Recusar"
                >
                  <X size={26} strokeWidth={2.5} />
                </button>

                {/* Atender/Conectar Manual */}
                <button
                  onClick={() => setEstadoChamada('conectado')}
                  className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-650 text-white flex items-center justify-center cursor-pointer transition-all shadow-lg shadow-green-500/20 hover:scale-110 active:scale-95"
                  title="Atender"
                >
                  <Phone size={26} className="rotate-12 fill-white" />
                </button>
              </div>

            </div>
          )}

          {/* TELA DE CONECTADO (ACTIVE CALL) */}
          {estadoChamada === 'conectado' && (
            <>
              {/* CHAMADA DE ÁUDIO (TELA CELULAR NATIVA) */}
              {chamadaAtiva.type === 'audio' && (
                <div className="w-full max-w-sm flex flex-col items-center justify-between h-[80vh] py-12 text-center text-white">
                  
                  {/* Tempo e cabeçalho */}
                  <div className="space-y-1">
                    <span className="text-[12px] font-bold text-green-405 font-mono tracking-wider block">
                      {formatarTempo(duracaoChamada)}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Chamada de Áudio</span>
                  </div>

                  {/* Informações e Avatar */}
                  <div className="space-y-4 my-6">
                    <img 
                      src={conversaAtiva?.contato?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                      alt={conversaAtiva?.nome}
                      className="w-24 h-24 rounded-full object-cover border-2 border-white/10 mx-auto shadow-2xl"
                    />
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{conversaAtiva?.nome}</h2>
                      <span className="text-[10px] text-gray-450 uppercase font-bold tracking-wider block mt-1">
                        {conversaAtiva?.contato?.papel || 'Membro'}
                      </span>
                    </div>
                  </div>

                  {/* Call Controls Grid */}
                  <div className="grid grid-cols-3 gap-y-6 gap-x-10 max-w-xs mx-auto w-full pt-4">
                    {/* Mute */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setChamadaMutada(!chamadaMutada);
                          toast.success(chamadaMutada ? 'Microfone ativado' : 'Microfone mutado');
                        }}
                        className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                          chamadaMutada ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <MicOff size={20} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Mute</span>
                    </div>

                    {/* Keypad */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button 
                        onClick={() => toast.info('Teclado numérico ativo')}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-colors"
                      >
                        <Grid size={20} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Teclado</span>
                    </div>

                    {/* Speaker */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setChamadaViva(!chamadaViva);
                          toast.success(chamadaViva ? 'Alto-falante desativado' : 'Alto-falante ativado');
                        }}
                        className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                          chamadaViva ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <Volume2 size={20} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Alto-falante</span>
                    </div>

                    {/* Video Call */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button 
                        onClick={() => {
                          setChamadaAtiva(prev => ({ ...prev, type: 'video' }));
                          setEstadoChamada('conectado');
                        }}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-colors"
                      >
                        <Video size={20} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Vídeo</span>
                    </div>

                    {/* Add call */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button 
                        onClick={() => toast.info('Adicionar nova pessoa na chamada')}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-colors"
                      >
                        <UserPlus size={20} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Adicionar</span>
                    </div>

                    {/* Contacts */}
                    <div className="flex flex-col items-center gap-1.5">
                      <button 
                        onClick={() => toast.info('Lista de contatos')}
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-colors"
                      >
                        <Users size={20} />
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">Contatos</span>
                    </div>
                  </div>

                  {/* Red Hangup button */}
                  <div className="pt-6">
                    <button
                      onClick={() => setChamadaAtiva(null)}
                      className="w-16 h-16 rounded-full bg-red-650 hover:bg-red-750 text-white flex items-center justify-center cursor-pointer transition-all shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95"
                      title="Desligar"
                    >
                      <Phone size={24} className="rotate-[135deg] fill-white" />
                    </button>
                  </div>

                </div>
              )}

              {/* CHAMADA DE VÍDEO (EMBUTINDO JITSI COMPARTILHADO COM CONTROLES FLUTUANTES) */}
              {chamadaAtiva.type === 'video' && (
                <div className="w-full max-w-4xl h-[85vh] bg-[#0c0b12] rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col shadow-2xl relative">
                  
                  {/* Container Iframe com Controles Transparentes por Cima */}
                  <div className="flex-1 bg-black relative w-full h-full">
                    <iframe
                      src={`https://meet.jit.si/${chamadaAtiva.roomName}#config.prejoinPageEnabled=false&config.prejoinConfig.enabled=false&config.toolbarButtons=[]&config.hideConferenceTimer=true&config.hideConferenceSubject=true&config.watermarkShowImage=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.SHOW_POWERED_BY=false&interfaceConfig.TOOLBAR_BUTTONS=[]&config.disableDeepLinking=true&userInfo.displayName="${encodeURIComponent(perfil?.nome || 'Usuário')}"`}
                      className="w-full h-full border-0"
                      allow="camera; microphone; fullscreen; display-capture; autoplay"
                    ></iframe>

                    {/* Floating Call Control Overlay */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-4 rounded-full border border-white/10 z-20">
                      {/* Mute Mic */}
                      <button 
                        onClick={() => {
                          setChamadaMutada(!chamadaMutada);
                          toast.success(chamadaMutada ? 'Microfone ativado' : 'Microfone mutado');
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                          chamadaMutada ? 'bg-red-650 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                        title="Mutar Microfone"
                      >
                        <MicOff size={18} />
                      </button>

                      {/* Hang Up (Desligar) */}
                      <button
                        onClick={() => setChamadaAtiva(null)}
                        className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-750 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-110 active:scale-95 shadow-lg shadow-red-500/30"
                        title="Desligar Chamada"
                      >
                        <Phone size={22} className="rotate-[135deg] fill-white" />
                      </button>

                      {/* Toggle Camera/Audio mode */}
                      <button 
                        onClick={() => {
                          setChamadaAtiva(prev => ({ ...prev, type: 'audio' }));
                          toast.info('Mudado para chamada de áudio');
                        }}
                        className="w-12 h-12 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                        title="Desativar Câmera"
                      >
                        <Video size={18} />
                      </button>
                    </div>

                    {/* Floating Info Overlays */}
                    <div className="absolute top-6 left-6 right-6 flex items-center justify-between pointer-events-none z-20">
                      <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider font-mono">
                          {formatarTempo(duracaoChamada)}
                        </span>
                      </div>
                      <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-[11px] font-bold">
                        {conversaAtiva?.nome}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}
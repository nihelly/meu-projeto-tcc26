import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Flag, 
  Heart, 
  MessageCircle, 
  Calendar, 
  User, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  Loader2, 
  Edit3, 
  Archive, 
  EyeOff, 
  RotateCcw
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function ModerarPostagens() {
  const navigate = useNavigate();
  const { perfil, usuario } = useAuth();
  
  // Estados de dados
  const [posts, setPosts] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Abas de status
  const [abaAtiva, setAbaAtiva] = useState('aguardando'); // 'aguardando', 'aprovadas', 'rejeitadas'

  // Filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('');
  const [filtroAluno, setFiltroAluno] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroData, setFiltroData] = useState('todos'); // 'todos', 'hoje', 'semana', 'mes'
  const [ordenacao, setOrdenacao] = useState('recentes'); // 'recentes', 'antigos'

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(5);

  // Seleção e visualização de postagens
  const [postSelecionado, setPostSelecionado] = useState(null);
  const [reportsPost, setReportsPost] = useState([]);
  const [historicoPost, setHistoricoPost] = useState([]);

  // Modais de Ação
  const [postParaRejeitar, setPostParaRejeitar] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('Linguagem inadequada');
  const [outroMotivo, setOutroMotivo] = useState('');
  const [rejeitando, setRejeitando] = useState(false);

  const [postParaEditar, setPostParaEditar] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editCorpo, setEditCorpo] = useState('');
  const [editando, setEditando] = useState(false);

  const [executandoAcao, setExecutandoAcao] = useState(false);

  // Carrega posts e perfis
  useEffect(() => {
    carregarDados();
  }, [usuario]);

  // Busca as denúncias e histórico do post selecionado
  useEffect(() => {
    if (postSelecionado) {
      carregarDetalhesPost(postSelecionado.id);
    }
  }, [postSelecionado]);

  async function carregarDados() {
    try {
      setLoading(true);
      
      // 1. Carrega todos os perfis para mapeamento
      const { data: dataPerfis, error: errorPerfis } = await supabase
        .from('profiles')
        .select('*');
      if (errorPerfis) throw errorPerfis;
      setPerfis(dataPerfis || []);

      // 2. Carrega todos os posts
      const { data: dataPosts, error: errorPosts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (errorPosts) throw errorPosts;

      setPosts(dataPosts || []);
    } catch (err) {
      console.error('Erro ao carregar moderação:', err);
      toast.error('Erro ao carregar postagens para moderação.');
    } finally {
      setLoading(false);
    }
  }

  async function carregarDetalhesPost(postId) {
    try {
      // Carrega denúncias
      const { data: reports, error: reportsErr } = await supabase
        .from('reports')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      if (reportsErr) throw reportsErr;
      setReportsPost(reports || []);

      // Carrega histórico de moderação
      const { data: hist, error: histErr } = await supabase
        .from('moderation_history')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });
      if (histErr) throw histErr;
      setHistoricoPost(hist || []);
    } catch (err) {
      console.error('Erro ao buscar detalhes da postagem:', err);
    }
  }

  // Ações de moderação rápidas
  const handleAprovar = async (post) => {
    try {
      setExecutandoAcao(true);
      
      // Atualizar posts no Supabase
      const { error } = await supabase
        .from('posts')
        .update({ status: 'Aprovada' })
        .eq('id', post.id);
      if (error) throw error;

      // Inserir registro no histórico
      await supabase
        .from('moderation_history')
        .insert({
          post_id: post.id,
          moderator_id: usuario.id,
          action: 'Aprovada',
          reason: 'Aprovado pelo moderador.'
        });

      toast.success('Publicação aprovada com sucesso! 🎉');
      
      // Atualizar estado local
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'Aprovada' } : p));
      if (postSelecionado?.id === post.id) {
        setPostSelecionado(prev => ({ ...prev, status: 'Aprovada' }));
      }
      
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aprovar a publicação.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const handleOcultar = async (post) => {
    try {
      setExecutandoAcao(true);
      
      const { error } = await supabase
        .from('posts')
        .update({ status: 'Oculta' })
        .eq('id', post.id);
      if (error) throw error;

      await supabase
        .from('moderation_history')
        .insert({
          post_id: post.id,
          moderator_id: usuario.id,
          action: 'Oculta',
          reason: 'Ocultado pelo moderador.'
        });

      toast.success('Publicação ocultada do feed.');
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'Oculta' } : p));
      if (postSelecionado?.id === post.id) {
        setPostSelecionado(prev => ({ ...prev, status: 'Oculta' }));
      }
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao ocultar publicação.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const handleRestaurar = async (post) => {
    try {
      setExecutandoAcao(true);
      
      const { error } = await supabase
        .from('posts')
        .update({ status: 'Aprovada' })
        .eq('id', post.id);
      if (error) throw error;

      await supabase
        .from('moderation_history')
        .insert({
          post_id: post.id,
          moderator_id: usuario.id,
          action: 'Restaurada',
          reason: 'Restaurada para o feed.'
        });

      toast.success('Publicação restaurada e visível no feed!');
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'Aprovada' } : p));
      if (postSelecionado?.id === post.id) {
        setPostSelecionado(prev => ({ ...prev, status: 'Aprovada' }));
      }
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao restaurar publicação.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const handleArquivar = async (post) => {
    try {
      setExecutandoAcao(true);
      
      const { error } = await supabase
        .from('posts')
        .update({ status: 'Arquivada' })
        .eq('id', post.id);
      if (error) throw error;

      await supabase
        .from('moderation_history')
        .insert({
          post_id: post.id,
          moderator_id: usuario.id,
          action: 'Arquivada',
          reason: 'Arquivado pelo administrador.'
        });

      toast.success('Publicação arquivada.');
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'Arquivada' } : p));
      if (postSelecionado?.id === post.id) {
        setPostSelecionado(prev => ({ ...prev, status: 'Arquivada' }));
      }
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao arquivar publicação.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  const handleExcluirDefinitivamente = async (post) => {
    if (!window.confirm('Tem certeza de que deseja excluir DEFINITIVAMENTE esta publicação? Esta ação não pode ser desfeita.')) return;
    try {
      setExecutandoAcao(true);
      
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;

      toast.success('Publicação excluída permanentemente.');
      setPosts(prev => prev.filter(p => p.id !== post.id));
      setPostSelecionado(null);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir definitivamente a publicação.');
    } finally {
      setExecutandoAcao(false);
    }
  };

  // Rejeitar Post
  const abrirModalRejeitar = (post) => {
    setPostParaRejeitar(post);
    setMotivoRejeicao('Linguagem inadequada');
    setOutroMotivo('');
  };

  const handleRejeitarConfirmar = async (e) => {
    e.preventDefault();
    if (!postParaRejeitar) return;

    const motivoFinal = motivoRejeicao === 'Outro' ? outroMotivo.trim() : motivoRejeicao;
    if (!motivoFinal) {
      toast.warning('Especifique o motivo da rejeição.');
      return;
    }

    try {
      setRejeitando(true);
      
      // Atualizar status
      const { error } = await supabase
        .from('posts')
        .update({ status: 'Rejeitada' })
        .eq('id', postParaRejeitar.id);
      if (error) throw error;

      // Inserir histórico
      await supabase
        .from('moderation_history')
        .insert({
          post_id: postParaRejeitar.id,
          moderator_id: usuario.id,
          action: 'Rejeitada',
          reason: motivoFinal
        });

      toast.success('Publicação rejeitada com sucesso!');
      setPosts(prev => prev.map(p => p.id === postParaRejeitar.id ? { ...p, status: 'Rejeitada' } : p));
      if (postSelecionado?.id === postParaRejeitar.id) {
        setPostSelecionado(prev => ({ ...prev, status: 'Rejeitada' }));
      }
      setPostParaRejeitar(null);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao rejeitar a publicação.');
    } finally {
      setRejeitando(false);
    }
  };

  // Editar Post
  const abrirModalEditar = (post) => {
    setPostParaEditar(post);
    setEditTitulo(post.title || '');
    setEditCorpo(post.content || '');
  };

  const handleEditarConfirmar = async (e) => {
    e.preventDefault();
    if (!postParaEditar) return;

    if (!editTitulo.trim()) {
      toast.warning('O título é obrigatório.');
      return;
    }

    try {
      setEditando(true);
      
      const { error } = await supabase
        .from('posts')
        .update({
          title: editTitulo.trim(),
          content: editCorpo.trim()
        })
        .eq('id', postParaEditar.id);
      if (error) throw error;

      await supabase
        .from('moderation_history')
        .insert({
          post_id: postParaEditar.id,
          moderator_id: usuario.id,
          action: 'Edição',
          reason: 'Postagem editada pelo moderador.'
        });

      toast.success('Publicação editada com sucesso!');
      setPosts(prev => prev.map(p => p.id === postParaEditar.id ? { ...p, title: editTitulo, content: editCorpo } : p));
      if (postSelecionado?.id === postParaEditar.id) {
        setPostSelecionado(prev => ({ ...prev, title: editTitulo, content: editCorpo }));
      }
      setPostParaEditar(null);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao editar publicação.');
    } finally {
      setEditando(false);
    }
  };

  // --- FILTRAGEM DE POSTAGENS E DADOS ---
  // Obter perfil de um usuário
  const getPerfilUsuario = (userId) => {
    return perfis.find(p => p.id === userId) || {};
  };

  // Lista de Turmas Únicas para filtro
  const turmasDisponiveis = [...new Set(perfis.map(p => p.turma).filter(Boolean))];

  // Regra de Negócio: Filtro de Turma do Professor
  const postsFiltradosPapel = posts.filter(post => {
    const autorPerfil = getPerfilUsuario(post.user_id);
    
    // Admins/Professores veem tudo
    if (perfil?.papel === 'professor' || perfil?.papel === 'administrador') return true;
    
    // Professores veem apenas alunos de suas turmas lecionadas
    if (perfil?.papel === 'professor') {
      const classesProf = perfil.turma ? perfil.turma.split(',').map(s => s.trim().toLowerCase()) : [];
      const autorTurma = autorPerfil.turma ? autorPerfil.turma.trim().toLowerCase() : '';
      return classesProf.includes(autorTurma);
    }
    
    return false;
  });

  // Filtros aplicados no frontend
  const postsFiltrados = postsFiltradosPapel.filter(post => {
    const autorPerfil = getPerfilUsuario(post.user_id);
    
    // 1. Filtro de Aba (Status)
    const matchesAba = 
      (abaAtiva === 'aguardando' && post.status === 'Aguardando aprovação') ||
      (abaAtiva === 'aprovadas' && post.status === 'Aprovada') ||
      (abaAtiva === 'rejeitadas' && (post.status === 'Rejeitada' || post.status === 'Oculta' || post.status === 'Arquivada'));
    if (!matchesAba) return false;

    // 2. Campo de busca (Título, Conteúdo ou Autor)
    if (busca.trim()) {
      const query = busca.toLowerCase();
      const matchTitulo = post.title?.toLowerCase().includes(query);
      const matchConteudo = post.content?.toLowerCase().includes(query);
      const matchAutor = autorPerfil.nome?.toLowerCase().includes(query) || post.author_handle?.toLowerCase().includes(query);
      if (!matchTitulo && !matchConteudo && !matchAutor) return false;
    }

    // 3. Filtro por Turma
    if (filtroTurma) {
      if (autorPerfil.turma !== filtroTurma) return false;
    }

    // 4. Filtro por Aluno (Nome)
    if (filtroAluno) {
      if (!autorPerfil.nome?.toLowerCase().includes(filtroAluno.toLowerCase())) return false;
    }

    // 5. Filtro por Tipo de Conteúdo
    if (filtroTipo) {
      if (post.tipo !== filtroTipo) return false;
    }

    // 6. Filtro por Data
    if (filtroData !== 'todos') {
      const dataCriacao = new Date(post.created_at);
      const agora = new Date();
      const difTempo = agora - dataCriacao;
      const difDias = difTempo / (1000 * 60 * 60 * 24);

      if (filtroData === 'hoje' && difDias > 1) return false;
      if (filtroData === 'semana' && difDias > 7) return false;
      if (filtroData === 'mes' && difDias > 30) return false;
    }

    return true;
  });

  // Ordenação
  const postsOrdenados = [...postsFiltrados].sort((a, b) => {
    const dataA = new Date(a.created_at);
    const dataB = new Date(b.created_at);
    return ordenacao === 'recentes' ? dataB - dataA : dataA - dataB;
  });

  // Contagem para Badges das abas
  const countAbaAguardando = postsFiltradosPapel.filter(p => p.status === 'Aguardando aprovação').length;

  // Paginação
  const totalItens = postsOrdenados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina) || 1;
  const indexInicial = (paginaAtual - 1) * itensPorPagina;
  const indexFinal = Math.min(indexInicial + itensPorPagina, totalItens);
  const postsPaginados = postsOrdenados.slice(indexInicial, indexFinal);

  // Helper de Tempo Relativo
  const formatarTempoRelativo = (dataIso) => {
    if (!dataIso) return '';
    const date = new Date(dataIso);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHrs / 24);

    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHrs < 24) return `há ${diffHrs} ${diffHrs === 1 ? 'hora' : 'horas'}`;
    return `há ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`;
  };

  const formatarDataCompleta = (dataIso) => {
    if (!dataIso) return '';
    const date = new Date(dataIso);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const ehProfessor = perfil?.papel === 'professor';
  const ehAdmin = perfil?.papel === 'professor' || perfil?.papel === 'administrador';

  return (
    <div className="space-y-6">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[20px] font-bold text-gray-950 tracking-tight">Postagens para moderação</h1>
        <p className="text-[12.5px] text-gray-500 font-light">Revise, aprove ou rejeite as postagens feitas pelos alunos.</p>
      </div>

      {/* DASHBOARD PRINCIPAL EM DUAS COLUNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA — FILTROS E LISTA DE POSTS (8/12) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* ABAS E CONTROLE DE FILTRO */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-3">
            <div className="flex gap-4">
              <button 
                onClick={() => { setAbaAtiva('aguardando'); setPaginaAtual(1); }}
                className={`pb-2.5 text-[13px] font-bold transition-all relative cursor-pointer ${abaAtiva === 'aguardando' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Aguardando revisão
                {countAbaAguardando > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-violet-100 text-violet-700 rounded-full font-extrabold shadow-sm">
                    {countAbaAguardando}
                  </span>
                )}
              </button>
              <button 
                onClick={() => { setAbaAtiva('aprovadas'); setPaginaAtual(1); }}
                className={`pb-2.5 text-[13px] font-bold transition-all relative cursor-pointer ${abaAtiva === 'aprovadas' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Aprovadas
              </button>
              <button 
                onClick={() => { setAbaAtiva('rejeitadas'); setPaginaAtual(1); }}
                className={`pb-2.5 text-[13px] font-bold transition-all relative cursor-pointer ${abaAtiva === 'rejeitadas' ? 'text-violet-600 border-b-2 border-violet-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Rejeitadas / Outros
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão de Filtro Expandível */}
              <button 
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer ${mostrarFiltros ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <SlidersHorizontal size={14} />
                Filtrar
              </button>

              {/* Barra de Busca rápida */}
              <div className="flex items-center gap-2 bg-[#f9fafb] border border-gray-200/80 rounded-xl px-3 py-1.5 w-48 focus-within:border-violet-300 transition-all">
                <Search size={13} className="text-gray-400" />
                <input 
                  type="text" 
                  value={busca}
                  onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
                  placeholder="Buscar postagem..." 
                  className="bg-transparent outline-none border-none text-[12px] text-gray-700 placeholder-gray-400 w-full"
                />
              </div>
            </div>
          </div>

          {/* PAINEL DE FILTROS AVANÇADOS */}
          {mostrarFiltros && (
            <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-200">
              
              {/* Filtro por Turma */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Turma</label>
                <select
                  value={filtroTurma}
                  onChange={(e) => { setFiltroTurma(e.target.value); setPaginaAtual(1); }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none"
                >
                  <option value="">Todas as turmas</option>
                  {turmasDisponiveis.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Filtro por Aluno */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Aluno</label>
                <input
                  type="text"
                  value={filtroAluno}
                  onChange={(e) => { setFiltroAluno(e.target.value); setPaginaAtual(1); }}
                  placeholder="Nome do aluno..."
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none placeholder-gray-400"
                />
              </div>

              {/* Filtro por Tipo de Conteúdo */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Tipo</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => { setFiltroTipo(e.target.value); setPaginaAtual(1); }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none"
                >
                  <option value="">Todos os tipos</option>
                  <option value="Dúvida">Dúvida</option>
                  <option value="Projeto">Projeto</option>
                  <option value="Ideia">Ideia</option>
                  <option value="Material de estudo">Material de estudo</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              {/* Filtro por Data */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase pl-0.5">Data de Envio</label>
                <select
                  value={filtroData}
                  onChange={(e) => { setFiltroData(e.target.value); setPaginaAtual(1); }}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none"
                >
                  <option value="todos">Qualquer data</option>
                  <option value="hoje">Hoje</option>
                  <option value="semana">Últimos 7 dias</option>
                  <option value="mes">Últimos 30 dias</option>
                </select>
              </div>

              {/* Ordenação */}
              <div className="col-span-full border-t border-gray-200/60 pt-3 flex justify-between items-center">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setOrdenacao('recentes')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold ${ordenacao === 'recentes' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Mais recentes
                  </button>
                  <button 
                    onClick={() => setOrdenacao('antigos')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold ${ordenacao === 'antigos' ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    Mais antigos
                  </button>
                </div>

                <button 
                  onClick={() => {
                    setBusca('');
                    setFiltroTurma('');
                    setFiltroAluno('');
                    setFiltroTipo('');
                    setFiltroData('todos');
                    setOrdenacao('recentes');
                  }}
                  className="text-[11px] font-bold text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <RotateCcw size={12} /> Limpar Filtros
                </button>
              </div>
            </div>
          )}

          {/* LISTAGEM DE POSTAGENS */}
          {loading ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-violet-600" size={32} />
              <p className="text-[13px] text-gray-400 font-medium">Buscando postagens para moderação...</p>
            </div>
          ) : postsPaginados.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-16 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-[14px] font-bold text-gray-950">Nenhuma publicação pendente</h3>
              <p className="text-[12px] text-gray-400 font-light max-w-[300px] leading-relaxed">
                Todas as postagens estão revisadas de acordo com as regras de filtragem aplicadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {postsPaginados.map(post => {
                const autor = getPerfilUsuario(post.user_id);
                const selecionado = postSelecionado?.id === post.id;
                
                return (
                  <div 
                    key={post.id} 
                    className={`bg-white border rounded-[1.8rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] cursor-pointer ${selecionado ? 'border-violet-400 ring-2 ring-violet-50' : 'border-gray-100'}`}
                    onClick={() => setPostSelecionado(post)}
                  >
                    {/* Conteúdo Esquerdo do Card */}
                    <div className="flex-1 flex gap-4 items-start">
                      {/* Checkbox (Visual do mockup) */}
                      <input 
                        type="checkbox" 
                        readOnly 
                        checked={selecionado}
                        className="mt-1 border-gray-300 rounded text-violet-600 focus:ring-violet-500 cursor-pointer hidden md:block" 
                      />
                      
                      <div className="space-y-3 flex-1 min-w-0">
                        {/* Autor, Turma e Data */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-155 flex-shrink-0 shadow-inner">
                            {autor.avatar_url ? (
                              <img src={autor.avatar_url} alt={autor.nome} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full text-gray-400 flex items-center justify-center font-bold text-[14px]">
                                {autor.nome ? autor.nome.substring(0,1) : '?'}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] font-bold text-gray-950 leading-tight">{autor.nome || 'Usuário'}</span>
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{autor.turma || 'Sem Turma'}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 leading-tight font-medium">{formatarTempoRelativo(post.created_at)}</span>
                          </div>
                        </div>

                        {/* Texto da publicação */}
                        <div className="space-y-2">
                          <h3 className="text-[13.5px] font-extrabold text-gray-900 leading-tight">{post.title}</h3>
                          <p className="text-[12.5px] text-gray-600 leading-relaxed font-light line-clamp-3 whitespace-pre-line">{post.content}</p>
                        </div>

                        {/* Badge de Tipo */}
                        <div className="flex gap-2">
                          <span className="text-[10px] font-bold bg-[#6366f1]/5 text-[#6366f1] px-2.5 py-1 rounded-lg">
                            {post.tipo || 'Geral'}
                          </span>
                          {post.image_url && (
                            <span className="text-[10px] font-bold bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">
                              Contém Imagem
                            </span>
                          )}
                          {post.status !== 'Aprovada' && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${post.status === 'Aguardando aprovação' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
                              {post.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões Rápidos de Ação (Direita do Card) */}
                    <div className="flex md:flex-col gap-2.5 justify-end border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {post.status === 'Aguardando aprovação' && (
                        <>
                          <button 
                            onClick={() => handleAprovar(post)}
                            disabled={executandoAcao}
                            className="flex items-center gap-1.5 text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-xl text-[12px] font-bold border border-green-150 bg-white transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle size={14} /> Aprovar
                          </button>
                          <button 
                            onClick={() => abrirModalRejeitar(post)}
                            disabled={executandoAcao}
                            className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl text-[12px] font-bold border border-red-150 bg-white transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <XCircle size={14} /> Rejeitar
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={() => setPostSelecionado(post)}
                        className="flex items-center gap-1.5 text-gray-500 hover:bg-gray-100 px-3 py-1.5 rounded-xl text-[12px] font-bold border border-gray-200 bg-white transition-colors cursor-pointer ml-auto md:ml-0"
                      >
                        <Eye size={14} /> Ver detalhes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINAÇÃO */}
          {totalItens > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl px-6 py-4 flex items-center justify-between text-gray-500 text-[12px] font-medium flex-wrap gap-4 shadow-[0_1px_4px_rgba(0,0,0,0.01)]">
              <div>
                Mostrando <span className="font-bold text-gray-800">{indexInicial + 1}</span> a <span className="font-bold text-gray-800">{indexFinal}</span> de <span className="font-bold text-gray-800">{totalItens}</span> postagens
              </div>

              <div className="flex items-center gap-4">
                {/* Itens por página */}
                <div className="flex items-center gap-2">
                  <span>Itens por página:</span>
                  <select
                    value={itensPorPagina}
                    onChange={(e) => { setItensPorPagina(Number(e.target.value)); setPaginaAtual(1); }}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                {/* Botões Próximo / Anterior */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
                    disabled={paginaAtual === 1}
                    className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-500 hover:text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[11px] font-bold">
                    Pág. <span className="text-gray-800">{paginaAtual}</span> de <span className="text-gray-800">{totalPaginas}</span>
                  </span>
                  <button
                    onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
                    disabled={paginaAtual === totalPaginas}
                    className="p-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-500 hover:text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* COLUNA DIREITA — PAINEL DE DETALHES (4/12) */}
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          {postSelecionado ? (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-xl space-y-6 relative overflow-hidden animate-in fade-in duration-300">
              
              {/* Header do painel de detalhes */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h2 className="text-[14px] font-black text-gray-950">Detalhes da postagem</h2>
                <button 
                  onClick={() => setPostSelecionado(null)}
                  className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Informações básicas do autor */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 shadow-inner flex-shrink-0">
                  {getPerfilUsuario(postSelecionado.user_id).avatar_url ? (
                    <img src={getPerfilUsuario(postSelecionado.user_id).avatar_url} alt={postSelecionado.author_handle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full text-gray-400 flex items-center justify-center font-bold text-[14px]">
                      {getPerfilUsuario(postSelecionado.user_id).nome ? getPerfilUsuario(postSelecionado.user_id).nome.substring(0,1) : '?'}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-gray-950 leading-tight">
                    {getPerfilUsuario(postSelecionado.user_id).nome || 'Usuário'}
                  </div>
                  <div className="text-[10px] text-gray-400 leading-tight font-medium">
                    {getPerfilUsuario(postSelecionado.user_id).turma || 'Sem Turma'} • {formatarTempoRelativo(postSelecionado.created_at)}
                  </div>
                </div>
              </div>

              {/* Título e Corpo do Post */}
              <div className="space-y-2.5">
                <h3 className="text-[14px] font-black text-gray-900">{postSelecionado.title}</h3>
                <p className="text-[12.5px] text-gray-600 leading-relaxed font-light whitespace-pre-line bg-gray-50 p-4 rounded-2xl border border-gray-100/50">
                  {postSelecionado.content}
                </p>
              </div>

              {/* Imagem do Post (se aplicável) */}
              {postSelecionado.image_url && (
                <div className="rounded-2xl overflow-hidden border border-gray-100 max-h-[220px]">
                  <img src={postSelecionado.image_url} alt="Imagem do post" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Status do Post no Detalhes */}
              <div className="flex gap-2">
                <span className="text-[10px] font-bold bg-[#6366f1]/5 text-[#6366f1] px-2.5 py-1 rounded-lg">
                  {postSelecionado.tipo || 'Geral'}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${
                  postSelecionado.status === 'Aprovada' ? 'bg-green-50 text-green-700' :
                  postSelecionado.status === 'Aguardando aprovação' ? 'bg-amber-50 text-amber-700' :
                  'bg-red-50 text-red-700'
                }`}>
                  Status: {postSelecionado.status}
                </span>
              </div>

              {/* HISTÓRICO DE AUDITORIA */}
              {historicoPost.length > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider pl-0.5">Histórico de Moderação</h4>
                  <div className="bg-gray-50 rounded-2xl p-3 space-y-2 max-h-[140px] overflow-y-auto border border-gray-100/60">
                    {historicoPost.map(h => (
                      <div key={h.id} className="text-[10.5px] text-gray-600 leading-normal pl-2 border-l-2 border-violet-200">
                        <span className="font-bold text-gray-800">{h.action}</span> por <span className="font-medium text-gray-700">{getPerfilUsuario(h.moderator_id).nome || 'Moderador'}</span>
                        <div className="text-gray-400 font-light text-[9.5px]">{formatarDataCompleta(h.created_at)}</div>
                        {h.reason && <div className="text-gray-500 font-light italic mt-0.5">Motivo: "{h.reason}"</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DENÚNCIAS RECEBIDAS */}
              {reportsPost.length > 0 && (
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h4 className="text-[11px] font-bold text-red-650 uppercase tracking-wider pl-0.5 flex items-center gap-1">
                    <AlertTriangle size={12} /> Denúncias Recebidas ({reportsPost.length})
                  </h4>
                  <div className="bg-red-50/40 rounded-2xl p-3 space-y-2 max-h-[140px] overflow-y-auto border border-red-100">
                    {reportsPost.map(rep => (
                      <div key={rep.id} className="text-[10.5px] text-gray-700 leading-normal pl-2 border-l-2 border-red-300">
                        Denunciado por <span className="font-bold text-gray-800">@{getPerfilUsuario(rep.reporter_id).nome?.toLowerCase().replace(/\s+/g, '') || 'usuario'}</span>
                        <div className="font-bold text-red-700 text-[10px] mt-0.5">Motivo: {rep.reason}</div>
                        <div className="text-gray-400 font-light text-[9px]">{formatarDataCompleta(rep.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO AÇÕES NO PAINEL DE DETALHES */}
              <div className="space-y-2 border-t border-gray-100 pt-4">
                <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider pl-0.5">Ações Disponíveis</h4>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* Aprovar / Rejeitar */}
                  {postSelecionado.status === 'Aguardando aprovação' && (
                    <>
                      <button 
                        onClick={() => handleAprovar(postSelecionado)}
                        disabled={executandoAcao}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={15} /> Aprovar Publicação
                      </button>
                      <button 
                        onClick={() => abrirModalRejeitar(postSelecionado)}
                        disabled={executandoAcao}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                      >
                        <XCircle size={15} /> Rejeitar Publicação
                      </button>
                    </>
                  )}

                  {/* Ocultar / Restaurar */}
                  {postSelecionado.status === 'Aprovada' && (
                    <button 
                      onClick={() => handleOcultar(postSelecionado)}
                      disabled={executandoAcao}
                      className="w-full border border-orange-200 hover:bg-orange-50 text-orange-700 py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <EyeOff size={15} /> Ocultar Publicação
                    </button>
                  )}

                  {postSelecionado.status === 'Oculta' && (
                    <button 
                      onClick={() => handleRestaurar(postSelecionado)}
                      disabled={executandoAcao}
                      className="w-full border border-green-200 hover:bg-green-50 text-green-700 py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={15} /> Restaurar Publicação
                    </button>
                  )}

                  {/* Editar */}
                  <button 
                    onClick={() => abrirModalEditar(postSelecionado)}
                    disabled={executandoAcao}
                    className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Edit3 size={15} /> Editar Conteúdo
                  </button>

                  {/* Arquivar (Admin Apenas) */}
                  {ehAdmin && postSelecionado.status !== 'Arquivada' && (
                    <button 
                      onClick={() => handleArquivar(postSelecionado)}
                      disabled={executandoAcao}
                      className="w-full border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Archive size={15} /> Arquivar Conteúdo
                    </button>
                  )}

                  {/* Excluir Definitivamente (Admin Apenas) */}
                  {ehAdmin && (
                    <button 
                      onClick={() => handleExcluirDefinitivamente(postSelecionado)}
                      disabled={executandoAcao}
                      className="w-full bg-red-50 hover:bg-red-100 text-red-650 py-2.5 rounded-xl text-[12px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Trash2 size={15} /> Excluir Definitivamente
                    </button>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white border border-gray-150 border-dashed rounded-[2rem] p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2 h-72">
              <Eye size={24} className="text-gray-300" />
              <span className="text-[12.5px] font-bold text-gray-500">Nenhuma postagem selecionada</span>
              <p className="text-[11px] text-gray-400 font-light max-w-[200px] leading-relaxed">
                Selecione uma postagem da lista à esquerda para analisar seus detalhes, histórico e denúncias.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL DE REJEIÇÃO (MOTIVO DA REJEIÇÃO) */}
      {postParaRejeitar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPostParaRejeitar(null)} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-[400px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <XCircle size={18} className="text-red-500" /> Rejeitar Publicação
              </h3>
              <button onClick={() => setPostParaRejeitar(null)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <p className="text-[12px] text-gray-400 font-light mb-5 leading-relaxed">
              O autor receberá uma notificação automática detalhando o motivo pelo qual o conteúdo não foi publicado.
            </p>

            <form onSubmit={handleRejeitarConfirmar} className="space-y-4">
              <div className="space-y-2">
                {[
                  'Linguagem inadequada',
                  'Conteúdo fora do contexto escolar',
                  'Spam',
                  'Informação incorreta',
                  'Outro'
                ].map((motivo) => (
                  <label key={motivo} className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 bg-[#fcfcfc] hover:bg-gray-50 cursor-pointer text-[12.5px] text-gray-700 transition-colors">
                    <input 
                      type="radio" 
                      name="motivo_rejeicao" 
                      value={motivo} 
                      checked={motivoRejeicao === motivo}
                      onChange={() => setMotivoRejeicao(motivo)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <span>{motivo}</span>
                  </label>
                ))}
              </div>

              {motivoRejeicao === 'Outro' && (
                <div className="space-y-1 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Especifique o Motivo</label>
                  <textarea 
                    value={outroMotivo}
                    onChange={(e) => setOutroMotivo(e.target.value)}
                    placeholder="Escreva detalhadamente o motivo da rejeição..."
                    className="w-full bg-[#fcfcfc] border border-gray-250 rounded-xl p-3 text-[12px] text-gray-700 outline-none resize-none focus:border-black transition-colors"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPostParaRejeitar(null)}
                  disabled={rejeitando}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 py-2.5 rounded-xl text-[12px] font-semibold text-gray-500 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={rejeitando}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {rejeitando ? <Loader2 className="animate-spin" size={14} /> : 'Confirmar Rejeição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      {postParaEditar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPostParaEditar(null)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[500px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Edit3 size={18} className="text-violet-600" /> Editar Publicação (Moderação)
              </h3>
              <button onClick={() => setPostParaEditar(null)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditarConfirmar} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Título do Post</label>
                <input 
                  type="text"
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-[13px] font-medium text-gray-800 outline-none focus:border-black transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Conteúdo do Post</label>
                <textarea 
                  value={editCorpo}
                  onChange={(e) => setEditCorpo(e.target.value)}
                  rows={6}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-[12.5px] text-gray-700 outline-none resize-none focus:border-black transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPostParaEditar(null)}
                  disabled={editando}
                  className="bg-gray-100 text-gray-600 px-5 py-2.5 rounded-xl text-[12px] font-bold hover:bg-gray-250 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editando}
                  className="bg-[#6366f1] hover:bg-[#5053e1] text-white px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {editando ? <Loader2 className="animate-spin animate-spin-fast" size={14} /> : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

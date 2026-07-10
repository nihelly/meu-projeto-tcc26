import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  UserCheck, 
  SlidersHorizontal, 
  Search, 
  Eye, 
  Pencil, 
  Trash2, 
  Lock, 
  Unlock, 
  Plus, 
  X, 
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  const { perfil, ehAdmin } = useAuth();

  // Estados dos Dados
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, alunos: 0, professores: 0 });

  // Estados de Filtros e Busca
  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState('Todos');
  const [filtroTurma, setFiltroTurma] = useState('Todos');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [ordenacao, setOrdenacao] = useState('nome_asc');
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false);

  // Estados de Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(5);

  // Estados dos Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isActionSaving, setIsActionSaving] = useState(false);

  // Estados do Formulário do Modal
  const [formNome, setFormNome] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formSenha, setFormSenha] = useState('');
  const [formPapel, setFormPapel] = useState('aluno');
  const [formTurma, setFormTurma] = useState('');
  const [formDisciplinas, setFormDisciplinas] = useState('');
  const [formStatus, setFormStatus] = useState('Ativo');

  // Estado do Modal de Confirmação de Exclusão
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Buscar usuários e calcular estatísticas
  const carregarDados = async () => {
    try {
      setLoading(true);
      
      let data = [];
      let error = null;

      if (ehAdmin) {
        // Administrador usa a função RPC para obter dados de perfis e auth
        const { data: resData, error: resError } = await supabase.rpc('admin_list_users');
        data = resData || [];
        error = resError;
      } else {
        // Professor busca apenas perfis normais pelo Supabase
        const { data: resData, error: resError } = await supabase
          .from('profiles')
          .select('*');
        data = resData || [];
        error = resError;
      }

      if (error) throw error;

      // Se for professor, filtrar para exibir apenas os alunos da mesma turma
      if (!ehAdmin && perfil?.papel === 'professor') {
        const turmasProfessor = perfil.turma ? perfil.turma.split(',').map(t => t.trim()) : [];
        data = data.filter(u => 
          u.papel === 'aluno' && 
          u.turma && 
          turmasProfessor.includes(u.turma.trim())
        );
      }

      setUsuarios(data);
      
      // Calcular estatísticas com base nos dados obtidos
      const total = data.length;
      const alunos = data.filter(u => u.papel === 'aluno').length;
      const professores = data.filter(u => u.papel === 'professor').length;
      
      setStats({ total, alunos, professores });
    } catch (err) {
      console.error('Erro ao carregar dados dos usuários:', err);
      toast.error('Erro ao buscar a lista de usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [ehAdmin, perfil]);

  // Lista de Turmas Únicas para filtro
  const turmasDisponiveis = [...new Set(usuarios.map(u => u.turma).filter(Boolean))];

  // Aplicar filtros, busca e ordenação
  const usuariosFiltrados = usuarios
    .filter(u => {
      // 1. Busca por nome ou e-mail
      const termo = busca.toLowerCase();
      const matchBusca = u.nome?.toLowerCase().includes(termo) || u.email?.toLowerCase().includes(termo);

      // 2. Filtro de Papel
      const matchPapel = filtroPapel === 'Todos' || u.papel === filtroPapel.toLowerCase();

      // 3. Filtro de Turma
      const matchTurma = filtroTurma === 'Todos' || u.turma === filtroTurma;

      // 4. Filtro de Status
      const matchStatus = filtroStatus === 'Todos' || u.status?.toLowerCase() === filtroStatus.toLowerCase();

      return matchBusca && matchPapel && matchTurma && matchStatus;
    })
    .sort((a, b) => {
      // Ordenação
      if (ordenacao === 'nome_asc') {
        return a.nome?.localeCompare(b.nome);
      }
      if (ordenacao === 'nome_desc') {
        return b.nome?.localeCompare(a.nome);
      }
      if (ordenacao === 'data_asc') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (ordenacao === 'data_desc') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      return 0;
    });

  // Paginação
  const totalItens = usuariosFiltrados.length;
  const totalPaginas = Math.ceil(totalItens / itensPorPagina) || 1;
  const indexUltimoItem = paginaAtual * itensPorPagina;
  const indexPrimeiroItem = indexUltimoItem - itensPorPagina;
  const itensPaginaAtual = usuariosFiltrados.slice(indexPrimeiroItem, indexUltimoItem);

  const irParaPagina = (pag) => {
    if (pag >= 1 && pag <= totalPaginas) {
      setPaginaAtual(pag);
    }
  };

  // Abrir Modal de Cadastro
  const handleOpenCreate = () => {
    setModalMode('create');
    setSelectedUser(null);
    setFormNome('');
    setFormEmail('');
    setFormSenha('');
    setFormPapel('aluno');
    setFormTurma('');
    setFormDisciplinas('');
    setFormStatus('Ativo');
    setModalOpen(true);
  };

  // Abrir Modal de Edição
  const handleOpenEdit = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormNome(user.nome || '');
    setFormEmail(user.email || '');
    setFormSenha(''); // Senha fica em branco, só altera se preencher
    setFormPapel(user.papel || 'aluno');
    setFormTurma(user.turma || '');
    setFormDisciplinas(user.disciplinas || '');
    setFormStatus(user.status || 'Ativo');
    setModalOpen(true);
  };

  // Salvar Criação/Edição
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!formNome.trim() || !formEmail.trim()) {
      toast.warning('Campos obrigatórios', { description: 'Nome e E-mail são obrigatórios.' });
      return;
    }

    if (modalMode === 'create' && !formSenha) {
      toast.warning('Campos obrigatórios', { description: 'A senha é obrigatória para novos usuários.' });
      return;
    }

    try {
      setIsActionSaving(true);

      if (modalMode === 'create') {
        // Criar usuário via RPC
        const { error } = await supabase.rpc('admin_create_user', {
          email_arg: formEmail.trim(),
          password_arg: formSenha,
          nome_arg: formNome.trim(),
          papel_arg: formPapel,
          turma_arg: formPapel === 'aluno' ? formTurma.trim() : (formPapel === 'professor' ? formTurma.trim() : null),
          disciplinas_arg: formPapel === 'professor' ? formDisciplinas.trim() : null,
          status_arg: formStatus
        });

        if (error) throw error;
        toast.success('Usuário criado com sucesso!');
      } else {
        // Editar usuário via RPC
        const { error } = await supabase.rpc('admin_update_user', {
          target_user_id: selectedUser.id,
          email_arg: formEmail.trim(),
          password_arg: formSenha || null, // pass null if empty to skip change
          nome_arg: formNome.trim(),
          papel_arg: formPapel,
          turma_arg: formPapel === 'aluno' ? formTurma.trim() : (formPapel === 'professor' ? formTurma.trim() : null),
          disciplinas_arg: formPapel === 'professor' ? formDisciplinas.trim() : null,
          status_arg: formStatus
        });

        if (error) throw error;
        toast.success('Usuário atualizado com sucesso!');
      }

      setModalOpen(false);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Erro ao processar ação.');
    } finally {
      setIsActionSaving(false);
    }
  };

  // Bloquear / Desbloquear Usuário Rápido
  const handleToggleBlock = async (user) => {
    const novoStatus = user.status === 'Bloqueado' || user.status === 'bloqueado' ? 'Ativo' : 'Bloqueado';
    try {
      const { error } = await supabase.rpc('admin_update_user', {
        target_user_id: user.id,
        email_arg: user.email,
        password_arg: null,
        nome_arg: user.nome,
        papel_arg: user.papel,
        turma_arg: user.turma,
        disciplinas_arg: user.disciplinas,
        status_arg: novoStatus
      });

      if (error) throw error;
      toast.success(novoStatus === 'Bloqueado' ? 'Usuário bloqueado!' : 'Usuário ativado com sucesso!');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status do usuário.');
    }
  };

  // Iniciar exclusão
  const handleStartDelete = (user) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      const { error } = await supabase.rpc('admin_delete_user', {
        target_user_id: userToDelete.id
      });
      if (error) throw error;

      toast.success('Usuário excluído com sucesso!');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir o usuário.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TÍTULO E BOTAO ADICIONAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold text-gray-950 tracking-tight">Gerenciar Usuários</h1>
          <p className="text-[12px] text-gray-400 font-light mt-0.5">
            Visualize, adicione e gerencie todos os usuários da plataforma.
          </p>
        </div>
        
        {ehAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-1.5 bg-[#6366f1] hover:bg-[#5053e1] text-white font-semibold py-2.5 px-4 rounded-xl text-[12px] transition-all cursor-pointer shadow-sm shadow-indigo-500/10 self-start sm:self-auto"
          >
            <Plus size={16} /> Adicionar usuário
          </button>
        )}
      </div>

      {/* METRICAS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Total de Usuários */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center gap-4 shadow-[0_4px_25px_rgba(0,0,0,0.005)]">
          <div className="p-3.5 bg-violet-50 text-violet-600 rounded-2xl flex-shrink-0">
            <Users size={22} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total de usuários</div>
            <div className="text-[20px] font-bold text-gray-950 leading-tight mt-0.5">
              {loading ? <span className="text-[14px] text-gray-300 font-light">Carregando...</span> : stats.total}
            </div>
            <div className="text-[10px] text-gray-400 font-light mt-0.5">Todos os usuários cadastrados</div>
          </div>
        </div>

        {/* Alunos */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center gap-4 shadow-[0_4px_25px_rgba(0,0,0,0.005)]">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl flex-shrink-0">
            <GraduationCap size={22} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Alunos</div>
            <div className="text-[20px] font-bold text-gray-950 leading-tight mt-0.5">
              {loading ? <span className="text-[14px] text-gray-300 font-light">Carregando...</span> : stats.alunos}
            </div>
            <div className="text-[10px] text-gray-400 font-light mt-0.5">Usuários com perfil de aluno</div>
          </div>
        </div>

        {/* Professores */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 flex items-center gap-4 shadow-[0_4px_25px_rgba(0,0,0,0.005)]">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl flex-shrink-0">
            <UserCheck size={22} strokeWidth={1.8} />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Professores</div>
            <div className="text-[20px] font-bold text-gray-950 leading-tight mt-0.5">
              {loading ? <span className="text-[14px] text-gray-300 font-light">Carregando...</span> : stats.professores}
            </div>
            <div className="text-[10px] text-gray-400 font-light mt-0.5">Usuários com perfil de professor</div>
          </div>
        </div>
      </div>

      {/* PAINEL DE CONTROLE TABELA */}
      <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.005)]">
        
        {/* CABEÇALHO TABELA E FILTROS */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-[14px] font-bold text-gray-950">Lista de usuários</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Botão toggle filtros */}
            <button
              onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold cursor-pointer transition-colors ${showFiltrosAvancados ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <SlidersHorizontal size={14} /> Filtrar
            </button>

            {/* Busca Rápida */}
            <div className="flex items-center gap-2 bg-[#f9fafb] border border-gray-100 rounded-xl px-3 py-1.5 text-gray-400 focus-within:border-gray-200 transition-all w-full sm:w-60">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar usuário..."
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setPaginaAtual(1);
                }}
                className="bg-transparent outline-none border-none text-[11px] text-gray-700 placeholder-gray-400 w-full"
              />
            </div>
          </div>
        </div>

        {/* PAINEL DE FILTROS AVANÇADOS COLLAPSIBLE */}
        {showFiltrosAvancados && (
          <div className="bg-[#fafbfc] border-b border-gray-100 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top duration-200">
            {/* Filtro Tipo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Tipo de Usuário</label>
              <select
                value={filtroPapel}
                onChange={(e) => { setFiltroPapel(e.target.value); setPaginaAtual(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos</option>
                <option value="Aluno">Aluno</option>
                <option value="Professor">Professor</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            {/* Filtro Turma */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Turma</label>
              <select
                value={filtroTurma}
                onChange={(e) => { setFiltroTurma(e.target.value); setPaginaAtual(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todas as turmas</option>
                {turmasDisponiveis.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Filtro Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => { setFiltroStatus(e.target.value); setPaginaAtual(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos os status</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>

            {/* Ordenação */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Ordenar por</label>
              <select
                value={ordenacao}
                onChange={(e) => { setOrdenacao(e.target.value); setPaginaAtual(1); }}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none cursor-pointer"
              >
                <option value="nome_asc">Nome (A-Z)</option>
                <option value="nome_desc">Nome (Z-A)</option>
                <option value="data_desc">Mais Recentes</option>
                <option value="data_asc">Mais Antigos</option>
              </select>
            </div>
          </div>
        )}

        {/* TABELA DE USUÁRIOS */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 className="animate-spin text-[#6366f1]" size={28} />
              <span className="text-[12px] font-light">Carregando usuários...</span>
            </div>
          ) : itensPaginaAtual.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#fafbfc]">
                  <th className="py-4 px-6">Usuário</th>
                  <th className="py-4 px-6">E-mail</th>
                  <th className="py-4 px-6">Perfil</th>
                  <th className="py-4 px-6">Turma(s)</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {itensPaginaAtual.map((u) => {
                  const handleName = u.nome?.toLowerCase().replace(/\s+/g, '') || 'usuario';
                  
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/40 transition-colors text-[12.5px] text-gray-700">
                      {/* Usuário (Foto + Nome) */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-[#f3f4f6] text-[#9ca3af] flex items-center justify-center text-[14px] font-bold uppercase">
                              {u.nome?.substring(0, 1)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-950 leading-normal">{u.nome}</div>
                          <div className="text-[10px] text-gray-400">@{handleName}</div>
                        </div>
                      </td>

                      {/* E-mail */}
                      <td className="py-4 px-6 text-gray-600 font-light">{u.email || '---'}</td>

                      {/* Perfil (Badge) */}
                      <td className="py-4 px-6">
                        {u.papel === 'administrador' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200/50 uppercase tracking-wider">
                            Admin
                          </span>
                        )}
                        {u.papel === 'professor' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/50 uppercase tracking-wider">
                            Professor
                          </span>
                        )}
                        {u.papel === 'aluno' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                            Aluno
                          </span>
                        )}
                      </td>

                      {/* Turma */}
                      <td className="py-4 px-6 text-gray-600">{u.turma || '---'}</td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {(u.status === 'Ativo' || u.status === 'ativo') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativo
                          </span>
                        ) : (u.status === 'Bloqueado' || u.status === 'bloqueado') ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inativo
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/perfil/${u.id}`)}
                          className="p-1.5 text-gray-400 hover:text-[#6366f1] hover:bg-[#6366f1]/5 rounded-lg transition-colors cursor-pointer"
                          title="Visualizar Perfil"
                        >
                          <Eye size={15} />
                        </button>
                        
                        {ehAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar Usuário"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleToggleBlock(u)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                u.status === 'Bloqueado' || u.status === 'bloqueado'
                                  ? 'text-emerald-600 hover:bg-emerald-50/50' 
                                  : 'text-amber-600 hover:bg-amber-50/50'
                              }`}
                              title={u.status === 'Bloqueado' || u.status === 'bloqueado' ? 'Ativar Conta' : 'Bloquear Conta'}
                            >
                              {u.status === 'Bloqueado' || u.status === 'bloqueado' ? <Unlock size={15} /> : <Lock size={15} />}
                            </button>
                            <button
                              onClick={() => handleStartDelete(u)}
                              className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Usuário"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-20 text-gray-400 text-[12.5px] font-light">
              Nenhum usuário correspondente aos filtros foi encontrado.
            </div>
          )}
        </div>

        {/* PAGINAÇÃO INFERIOR */}
        {totalItens > 0 && (
          <div className="p-5 bg-white border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11.5px] text-gray-400">
              Mostrando {indexPrimeiroItem + 1} a {Math.min(indexUltimoItem, totalItens)} de {totalItens} usuários
            </span>

            <div className="flex items-center gap-6">
              {/* Seleção de itens por página */}
              <div className="flex items-center gap-2 text-[11.5px] text-gray-400">
                <span>Itens por página:</span>
                <select
                  value={itensPorPagina}
                  onChange={(e) => {
                    setItensPorPagina(Number(e.target.value));
                    setPaginaAtual(1);
                  }}
                  className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-gray-700 outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

              {/* Botões das páginas */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => irParaPagina(paginaAtual - 1)}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                </button>
                
                {[...Array(totalPaginas)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => irParaPagina(i + 1)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${paginaAtual === i + 1 ? 'bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/10' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => irParaPagina(paginaAtual + 1)}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR / EDITAR */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          
          {/* Card Modal */}
          <div className="relative bg-white rounded-[2rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[16px] font-bold text-gray-950">
                {modalMode === 'create' ? 'Adicionar Novo Usuário' : 'Editar Dados do Usuário'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveUser} className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lucas Ferreira"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors"
                />
              </div>

              {/* E-mail */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="exemplo@email.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors"
                />
              </div>

              {/* Senha */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">
                  Senha {modalMode === 'edit' && <span className="text-[10px] text-gray-400 font-light">(deixe em branco para não alterar)</span>}
                </label>
                <input
                  type="password"
                  placeholder={modalMode === 'edit' ? '••••••••' : 'Mínimo 6 caracteres'}
                  required={modalMode === 'create'}
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors"
                />
              </div>

              {/* Papel Acadêmico */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">Tipo de Usuário</label>
                <select
                  value={formPapel}
                  onChange={(e) => setFormPapel(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors cursor-pointer"
                >
                  <option value="aluno">Aluno (Estudante)</option>
                  <option value="professor">Professor (Docente)</option>
                  <option value="administrador">Administrador</option>
                </select>
              </div>

              {/* Turma (Apenas para Alunos ou Professores) */}
              {(formPapel === 'aluno' || formPapel === 'professor') && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">
                    {formPapel === 'aluno' ? 'Turma' : 'Turma(s) Relacionadas'}
                  </label>
                  <input
                    type="text"
                    placeholder={formPapel === 'aluno' ? 'Ex: 1º Ano A' : 'Ex: 1º Ano A, 2º Ano B'}
                    value={formTurma}
                    onChange={(e) => setFormTurma(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors"
                  />
                  <p className="text-[10px] text-gray-400 pl-1 leading-tight font-light">
                    {formPapel === 'aluno' ? 'Especifique a turma exata do aluno.' : 'Separe as turmas com vírgula.'}
                  </p>
                </div>
              )}

              {/* Disciplinas (Apenas para Professores) */}
              {formPapel === 'professor' && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">Disciplinas</label>
                  <input
                    type="text"
                    placeholder="Ex: Matemática, Física"
                    value={formDisciplinas}
                    onChange={(e) => setFormDisciplinas(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors"
                  />
                </div>
              )}

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-700 pl-1 uppercase tracking-wide">Status Inicial</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-[12px] text-gray-800 outline-none focus:bg-white focus:border-black transition-colors cursor-pointer"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Bloqueado">Bloqueado</option>
                </select>
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isActionSaving}
                  className="bg-gray-50 text-gray-500 hover:bg-gray-100 py-2.5 px-5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isActionSaving}
                  className="bg-[#6366f1] hover:bg-[#5053e1] text-white py-2.5 px-6 rounded-xl text-[12px] font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm shadow-indigo-500/10"
                >
                  {isActionSaving ? (
                    <>
                      <Loader2 className="animate-spin" size={14} /> Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="relative bg-white rounded-[2rem] w-full max-w-[400px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 text-center space-y-5">
            <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-gray-950">Excluir Usuário?</h3>
              <p className="text-[12px] text-gray-400 font-light mt-1.5 leading-relaxed">
                Tem certeza que deseja excluir a conta de <strong>{userToDelete?.nome}</strong>? Esta ação é irreversível e apagará todos os dados associados.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 bg-gray-50 hover:bg-gray-100 py-2.5 rounded-xl text-[12px] font-semibold text-gray-500 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 bg-red-550 hover:bg-red-600 py-2.5 rounded-xl text-[12px] font-semibold text-white cursor-pointer shadow-sm shadow-red-500/10"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

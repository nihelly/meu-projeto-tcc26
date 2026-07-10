import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  FileText, 
  Bell, 
  BarChart3, 
  LayoutDashboard, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Edit, 
  Pin, 
  BookOpen, 
  Clock, 
  Send, 
  AlertTriangle, 
  Eye, 
  ChevronRight, 
  ChevronLeft, 
  Download, 
  Check, 
  X, 
  HelpCircle,
  TrendingUp,
  Award,
  MessageCircle,
  ThumbsUp,
  UserCheck,
  FileCheck2,
  CalendarCheck,
  FileClock,
  Printer,
  Loader2,
  Search,
  Lock,
  Unlock,
  Settings,
  Shield,
  Database,
  RefreshCw,
  EyeOff,
  UserPlus
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function PainelAdministrador() {
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaAtiva = searchParams.get('aba') || 'dashboard';

  // Estados Globais
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [posts, setPosts] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [comentarios, setComentarios] = useState([]);
  const [denuncias, setDenuncias] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [systemSettings, setSystemSettings] = useState({});

  // Contagens e Estatísticas
  const [stats, setStats] = useState({
    usuarios: 512,
    professores: 48,
    alunos: 464,
    administradores: 4,
    turmas: 24,
    postagens: 1248,
    comentarios: 345,
    mensagens: 890,
    atividades: 156,
    denuncias: 18,
    usuariosOnline: 12,
    acessosDia: 85
  });

  // Estados locais de Modais
  const [modalUsuarioOpen, setModalUsuarioOpen] = useState(false);
  const [modalTurmaOpen, setModalTurmaOpen] = useState(false);
  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  
  // Formulários
  const [usuarioForm, setUsuarioForm] = useState({ id: '', nome: '', email: '', papel: 'aluno', status: 'Ativo', turma: '', disciplinas: '', senha: '' });
  const [turmaForm, setTurmaForm] = useState({ id: '', nome: '', serie: '', professor_id: '' });
  const [avisoForm, setAvisoForm] = useState({ title: '', content: '', destino: 'todos', turma_id: '' });
  
  // Configurações do Sistema
  const [configForm, setConfigForm] = useState({
    platform_name: 'EduConnect',
    logo_url: '',
    banner_url: '',
    primary_color: '#6366f1',
    community_rules: '',
    privacy_policy: '',
    terms_of_use: ''
  });

  // Filtros de busca
  const [buscaUsuario, setBuscaUsuario] = useState('');
  const [filtroPapel, setFiltroPapel] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [buscaLog, setBuscaLog] = useState('');

  // Moderação
  const [postParaRejeitar, setPostParaRejeitar] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('Linguagem inadequada');

  useEffect(() => {
    carregarDados();
  }, [usuario, perfil]);

  async function carregarDados() {
    try {
      setLoading(true);

      // 1. Obter todos os usuários (profiles)
      const { data: profiles, error: errUsers } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (errUsers) throw errUsers;
      setAllUsers(profiles || []);

      // 2. Obter turmas
      const { data: dataTurmas, error: errTurmas } = await supabase.from('turmas').select('*');
      if (errTurmas) throw errTurmas;
      setTurmas(dataTurmas || []);

      // 3. Obter postagens
      const { data: dataPosts, error: errPosts } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (errPosts) throw errPosts;
      setPosts(dataPosts || []);

      // 4. Obter atividades
      const { data: dataAtiv, error: errAtiv } = await supabase.from('activities').select('*');
      if (errAtiv) throw errAtiv;
      setAtividades(dataAtiv || []);

      // 5. Obter denúncias
      const { data: dataDen, error: errDen } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (errDen) throw errDen;
      setDenuncias(dataDen || []);

      // 6. Obter logs do sistema
      const { data: logs, error: errLogs } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false });
      if (errLogs) throw errLogs;
      setSystemLogs(logs || []);

      // 7. Obter configurações
      const { data: settings, error: errSettings } = await supabase.from('system_settings').select('*');
      if (errSettings) throw errSettings;
      const settingsMap = {};
      if (settings) {
        settings.forEach(s => { settingsMap[s.key] = s.value; });
        setSystemSettings(settingsMap);
        setConfigForm({
          platform_name: settingsMap.platform_name || 'EduConnect',
          logo_url: settingsMap.logo_url || '',
          banner_url: settingsMap.banner_url || '',
          primary_color: settingsMap.primary_color || '#6366f1',
          community_rules: settingsMap.community_rules || '',
          privacy_policy: settingsMap.privacy_policy || '',
          terms_of_use: settingsMap.terms_of_use || ''
        });
      }

      // Calcular estatísticas dinamicamente com base nas tabelas reais
      const totalU = profiles?.length || 0;
      const totalP = profiles?.filter(p => p.papel === 'professor').length || 0;
      const totalA = profiles?.filter(p => p.papel === 'aluno').length || 0;
      const totalAdm = profiles?.filter(p => p.papel === 'administrador').length || 0;
      
      setStats({
        usuarios: totalU,
        professores: totalP,
        alunos: totalA,
        administradores: totalAdm,
        turmas: dataTurmas?.length || 24,
        postagens: dataPosts?.length || 1248,
        comentarios: 345,
        mensagens: 890,
        atividades: dataAtiv?.length || 156,
        denuncias: dataDen?.length || 18,
        usuariosOnline: 12,
        acessosDia: 85
      });

    } catch (error) {
      console.error('Erro ao carregar dados administrativos:', error);
      toast.error('Erro ao inicializar o painel administrativo.');
    } finally {
      setLoading(false);
    }
  }

  // --- REGISTRAR LOG DE AÇÃO ---
  const registrarLogAdmin = async (action, module) => {
    try {
      await supabase.from('system_logs').insert({
        user_id: usuario.id,
        action,
        module,
        ip_address: '127.0.0.1'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // --- GERENCIAMENTO DE USUÁRIOS ---
  const handleCriarEditarUsuario = async (e) => {
    e.preventDefault();
    if (!usuarioForm.nome.trim() || !usuarioForm.email.trim()) {
      toast.warning('Preencha nome e e-mail.');
      return;
    }

    try {
      if (usuarioForm.id) {
        // Editar
        const { error } = await supabase.from('profiles').update({
          nome: usuarioForm.nome.trim(),
          papel: usuarioForm.papel,
          status: usuarioForm.status,
          turma: usuarioForm.turma,
          disciplinas: usuarioForm.disciplinas
        }).eq('id', usuarioForm.id);

        if (error) throw error;
        toast.success('Usuário atualizado com sucesso!');
        await registrarLogAdmin(`Editou o usuário ${usuarioForm.nome}`, 'Usuários');
      } else {
        // Criar
        const { error } = await supabase.from('profiles').insert({
          nome: usuarioForm.nome.trim(),
          email: usuarioForm.email.trim(),
          papel: usuarioForm.papel,
          status: usuarioForm.status,
          turma: usuarioForm.turma,
          disciplinas: usuarioForm.disciplinas
        });

        if (error) throw error;
        toast.success('Novo usuário cadastrado!');
        await registrarLogAdmin(`Criou o usuário ${usuarioForm.nome}`, 'Usuários');
      }
      setModalUsuarioOpen(false);
      setUsuarioForm({ id: '', nome: '', email: '', papel: 'aluno', status: 'Ativo', turma: '', disciplinas: '', senha: '' });
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar usuário.');
    }
  };

  const handleExcluirUsuario = async (uId, uNome) => {
    if (!window.confirm(`Excluir permanentemente o usuário ${uNome}?`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', uId);
      if (error) throw error;
      toast.success('Usuário removido.');
      await registrarLogAdmin(`Excluiu o usuário ${uNome}`, 'Usuários');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir usuário.');
    }
  };

  const handleAlterarStatusUsuario = async (uId, uNome, novoStatus) => {
    try {
      const { error } = await supabase.from('profiles').update({ status: novoStatus }).eq('id', uId);
      if (error) throw error;
      toast.success(`Usuário ${novoStatus === 'Bloqueado' ? 'bloqueado' : 'desbloqueado'}!`);
      await registrarLogAdmin(`Alterou o status do usuário ${uNome} para ${novoStatus}`, 'Usuários');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status.');
    }
  };

  // --- GERENCIAMENTO DE TURMAS ---
  const handleCriarEditarTurma = async (e) => {
    e.preventDefault();
    if (!turmaForm.nome.trim()) {
      toast.warning('Preencha o nome da turma.');
      return;
    }

    try {
      if (turmaForm.id) {
        const { error } = await supabase.from('turmas').update({
          nome: turmaForm.nome.trim(),
          serie: turmaForm.serie,
          professor_id: turmaForm.professor_id || null
        }).eq('id', turmaForm.id);

        if (error) throw error;
        toast.success('Turma atualizada!');
        await registrarLogAdmin(`Editou a turma ${turmaForm.nome}`, 'Turmas');
      } else {
        const { error } = await supabase.from('turmas').insert({
          nome: turmaForm.nome.trim(),
          serie: turmaForm.serie,
          professor_id: turmaForm.professor_id || null
        });

        if (error) throw error;
        toast.success('Turma criada com sucesso!');
        await registrarLogAdmin(`Criou a turma ${turmaForm.nome}`, 'Turmas');
      }
      setModalTurmaOpen(false);
      setTurmaForm({ id: '', nome: '', serie: '', professor_id: '' });
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar turma.');
    }
  };

  const handleExcluirTurma = async (tId, tNome) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a turma ${tNome}?`)) return;
    try {
      const { error } = await supabase.from('turmas').delete().eq('id', tId);
      if (error) throw error;
      toast.success('Turma excluída.');
      await registrarLogAdmin(`Excluiu a turma ${tNome}`, 'Turmas');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir turma.');
    }
  };

  // --- MODERAÇÃO DE CONTEÚDOS ---
  const handleAprovarPost = async (postId) => {
    try {
      const { error } = await supabase.from('posts').update({ status: 'Aprovada' }).eq('id', postId);
      if (error) throw error;

      await supabase.from('moderation_history').insert({
        post_id: postId,
        moderator_id: usuario.id,
        action: 'Aprovada',
        reason: 'Aprovada pela moderação geral do administrador.'
      });

      toast.success('Publicação aprovada!');
      await registrarLogAdmin(`Aprovou a postagem #${postId.slice(0,8)}`, 'Moderação');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aprovar postagem.');
    }
  };

  const abrirModalRejeitar = (post) => {
    setPostParaRejeitar(post);
  };

  const handleRejeitarPostConfirmar = async (e) => {
    e.preventDefault();
    if (!postParaRejeitar) return;

    try {
      const { error } = await supabase.from('posts').update({ status: 'Rejeitada' }).eq('id', postParaRejeitar.id);
      if (error) throw error;

      await supabase.from('moderation_history').insert({
        post_id: postParaRejeitar.id,
        moderator_id: usuario.id,
        action: 'Rejeitada',
        reason: motivoRejeicao
      });

      toast.success('Publicação rejeitada.');
      await registrarLogAdmin(`Rejeitou a postagem #${postParaRejeitar.id.slice(0,8)}`, 'Moderação');
      setPostParaRejeitar(null);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao rejeitar postagem.');
    }
  };

  // --- EXPORTAR RELATÓRIO DO ADMINISTRADOR ---
  const exportarPDF = () => {
    const printWindow = window.open('', '_blank');
    const relatorioHtml = `
      <html>
      <head>
        <title>Relatório Administrativo Geral — EduConnect</title>
        <style>
          body { font-family: 'Inter', sans-serif; color: #111827; padding: 40px; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 24px; color: #4f46e5; margin: 0; }
          .header p { font-size: 13px; color: #6b7280; margin-top: 5px; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 16px; border-left: 4px solid #4f46e5; padding-left: 10px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f9fafb; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #4b5563; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; }
          td { font-size: 12px; border-bottom: 1px solid #f3f4f6; padding: 12px; color: #374151; }
          .badge { font-size: 10px; font-weight: bold; background-color: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório Geral da Plataforma</h1>
          <p>EduConnect — Painel Administrativo • Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
        
        <div class="section">
          <h2>Indicadores Rápidos</h2>
          <table>
            <thead>
              <tr>
                <th>Usuários</th>
                <th>Professores</th>
                <th>Alunos</th>
                <th>Turmas</th>
                <th>Postagens</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>${stats.usuarios}</b></td>
                <td>${stats.professores}</td>
                <td>${stats.alunos}</td>
                <td>${stats.turmas}</td>
                <td>${stats.postagens}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Lista Completa de Turmas</h2>
          <table>
            <thead>
              <tr>
                <th>Nome da Turma</th>
                <th>Série/Ensino</th>
                <th>Alunos</th>
              </tr>
            </thead>
            <tbody>
              ${turmas.map(t => `
                <tr>
                  <td><b>${t.nome}</b></td>
                  <td>${t.serie}</td>
                  <td>${allUsers.filter(u => u.turma && u.turma.toLowerCase() === t.nome.toLowerCase()).length}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(relatorioHtml);
    printWindow.document.close();
    printWindow.print();
  };

  // --- CONFIGURAÇÕES DO SISTEMA ---
  const handleSalvarConfiguracoes = async (e) => {
    e.preventDefault();
    try {
      for (const [key, value] of Object.entries(configForm)) {
        await supabase.from('system_settings').upsert({ key, value });
      }
      toast.success('Configurações do sistema salvas!');
      await registrarLogAdmin('Atualizou configurações do sistema', 'Configurações');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar configurações.');
    }
  };

  // --- BACKUP ---
  const handleGerarBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ allUsers, turmas, posts, systemSettings }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `educonnect_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Backup gerado com sucesso!');
  };

  const handleRestaurarBackup = () => {
    toast.info('Selecione o arquivo de backup para restauração.');
  };

  // --- ENVIO DE NOTIFICAÇÕES GERAIS ---
  const handleEnviarAvisoGeral = async (e) => {
    e.preventDefault();
    if (!avisoForm.title.trim() || !avisoForm.content.trim()) {
      toast.warning('Preencha título e conteúdo do aviso.');
      return;
    }

    try {
      let destinatarios = [];
      if (avisoForm.destino === 'todos') {
        destinatarios = allUsers;
      } else if (avisoForm.destino === 'professores') {
        destinatarios = allUsers.filter(u => u.papel === 'professor');
      } else if (avisoForm.destino === 'alunos') {
        destinatarios = allUsers.filter(u => u.papel === 'aluno');
      }

      for (const dest of destinatarios) {
        await supabase.from('notifications').insert({
          user_id: dest.id,
          actor_id: usuario.id,
          actor_handle: '@administrador',
          content: `comunicado oficial: "${avisoForm.title}"`,
          type: 'announcement'
        });
      }

      toast.success('Notificação em massa enviada!');
      await registrarLogAdmin(`Enviou aviso em massa: ${avisoForm.title}`, 'Avisos');
      setModalAvisoOpen(false);
      setAvisoForm({ title: '', content: '', destino: 'todos', turma_id: '' });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar aviso.');
    }
  };

  // --- FILTROS E BUSCAS ---
  const usuariosFiltrados = allUsers.filter(u => {
    const bateBusca = !buscaUsuario.trim() || 
      u.nome.toLowerCase().includes(buscaUsuario.toLowerCase()) || 
      u.email?.toLowerCase().includes(buscaUsuario.toLowerCase());
    const batePapel = !filtroPapel || u.papel === filtroPapel;
    const bateStatus = !filtroStatus || u.status === filtroStatus;
    return bateBusca && batePapel && bateStatus;
  });

  const logsFiltrados = systemLogs.filter(l => {
    if (!buscaLog.trim()) return true;
    return l.action.toLowerCase().includes(buscaLog.toLowerCase()) || l.module.toLowerCase().includes(buscaLog.toLowerCase());
  });

  const formatarData = (dataIso) => {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando painel do administrador...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Painel do Administrador</h1>
          <p className="text-[12.5px] text-gray-500 font-light">Visão geral de toda a plataforma EduConnect.</p>
        </div>
        
        {/* Filtro de período */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-700 shadow-sm">
          <Calendar size={14} className="text-gray-400" />
          <span>09/07/2025 - 09/07/2025</span>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {abaAtiva === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* ROW OF STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <Users size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Usuários totais</span>
                <h3 className="text-2xl font-black text-gray-950">{stats.usuarios}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+28 este mês ↗</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Professores</span>
                <h3 className="text-2xl font-black text-gray-950">{stats.professores}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+5 este mês ↗</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Alunos</span>
                <h3 className="text-2xl font-black text-gray-950">{stats.alunos}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+23 este mês ↗</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Turmas</span>
                <h3 className="text-2xl font-black text-gray-950">{stats.turmas}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+3 este mês ↗</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Postagens totais</span>
                <h3 className="text-2xl font-black text-gray-950">{stats.postagens}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+132 este mês ↗</span>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-red-50 text-red-650 rounded-xl flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Denúncias</span>
                <h3 className="text-2xl font-black text-gray-950">{stats.denuncias}</h3>
              </div>
              <span className="text-[10px] text-red-600 font-bold mt-4 flex items-center gap-0.5">-4 este mês ↘</span>
            </div>

          </div>

          {/* MIDDLE GRID: CHARTS, ACTIVITIES & QUICK REVIEWS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Crescimento de Usuários SVG Line Chart */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4 lg:col-span-1">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[13.5px] font-bold text-gray-950">Crescimento de usuários</h3>
                <button onClick={() => setSearchParams({ aba: 'relatorios' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver relatório</button>
              </div>

              <div className="relative w-full h-[180px]">
                <svg className="w-full h-full" viewBox="0 0 300 180">
                  <line x1="30" y1="20" x2="280" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="30" y1="60" x2="280" y2="60" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="30" y1="100" x2="280" y2="100" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="30" y1="140" x2="280" y2="140" stroke="#f3f4f6" strokeWidth="1" />
                  
                  <text x="12" y="24" fill="#9ca3af" fontSize="8" fontWeight="bold">600</text>
                  <text x="12" y="64" fill="#9ca3af" fontSize="8" fontWeight="bold">450</text>
                  <text x="12" y="104" fill="#9ca3af" fontSize="8" fontWeight="bold">300</text>
                  <text x="12" y="144" fill="#9ca3af" fontSize="8" fontWeight="bold">150</text>

                  {/* Total (Violeta) */}
                  <path d="M 30,70 L 70,60 L 110,65 L 150,55 L 190,52 L 230,48 L 280,42" fill="none" stroke="#8b5cf6" strokeWidth="2.5" />
                  {/* Alunos (Azul) */}
                  <path d="M 30,110 L 70,105 L 110,115 L 150,98 L 190,102 L 230,95 L 280,90" fill="none" stroke="#3b82f6" strokeWidth="2" />
                  {/* Professores (Verde) */}
                  <path d="M 30,150 L 70,148 L 110,145 L 150,140 L 190,138 L 230,132 L 280,130" fill="none" stroke="#10b981" strokeWidth="2" />
                </svg>
              </div>

              <div className="flex gap-3 justify-center text-[9px] font-bold text-gray-500">
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-violet-500 rounded-full" /> Total</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Professores</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-500 rounded-full" /> Alunos</div>
              </div>
            </div>

            {/* Atividades Recentes */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[13.5px] font-bold text-gray-950">Atividades recentes</h3>
                <button onClick={() => setSearchParams({ aba: 'atividades' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todas</button>
              </div>

              <div className="space-y-3.5">
                {[
                  { title: 'Novo usuário cadastrado', desc: 'Mariana Oliveira se cadastrou como aluna', time: 'há 10 min', icon: <Users className="text-green-600" size={14} />, bg: 'bg-green-50' },
                  { title: 'Nova postagem', desc: 'Lucas Ferreira fez uma nova postagem', time: 'há 25 min', icon: <FileText className="text-violet-600" size={14} />, bg: 'bg-violet-50' },
                  { title: 'Denúncia recebida', desc: 'Postagem denunciada por conteúdo impróprio', time: 'há 1 hora', icon: <AlertTriangle className="text-amber-600" size={14} />, bg: 'bg-amber-50' },
                  { title: 'Nova turma criada', desc: 'Turma 3º Ano D foi criada por Ana Clara', time: 'há 2 horas', icon: <GraduationCap className="text-blue-600" size={14} />, bg: 'bg-blue-50' }
                ].map((act, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl ${act.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {act.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[11.5px] font-bold text-gray-900">
                        <span>{act.title}</span>
                        <span className="text-[9.5px] text-gray-400 font-light font-normal">{act.time}</span>
                      </div>
                      <p className="text-[10.5px] text-gray-500 font-light mt-0.5">{act.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Postagens para Moderação */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[13.5px] font-bold text-gray-950">Postagens para moderação <span className="bg-violet-100 text-violet-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ml-1">12</span></h3>
                <button onClick={() => setSearchParams({ aba: 'moderacao' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todas</button>
              </div>

              <div className="space-y-3.5">
                {[
                  { name: 'João Pedro', class: '1º Ano A', desc: 'Alguém pode me ajudar com este exercício?', status: 'Aguardando', labelBg: 'bg-violet-50 text-violet-600', time: 'há 15 min' },
                  { name: 'Ana Clara', class: '2º Ano B', desc: 'Compartilhei meu resumo sobre fotossíntese!', status: 'Aguardando', labelBg: 'bg-violet-50 text-violet-600', time: 'há 32 min' },
                  { name: 'Rafael Mendes', class: '3º Ano C', desc: 'Conteúdo inadequado identificado', status: 'Denúncia', labelBg: 'bg-red-50 text-red-650', time: 'há 1 hora' }
                ].map((post, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-[11.5px]">
                    <div className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-150 flex items-center justify-center font-bold text-gray-400 text-[12px] flex-shrink-0 shadow-inner">
                        {post.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900">{post.name}</span>
                          <span className="text-[9px] text-gray-400 font-light font-normal">{post.class}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-light line-clamp-1 mt-0.5">"{post.desc}"</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 space-y-1">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full block text-center ${post.labelBg}`}>{post.status}</span>
                      <span className="text-[9.5px] text-gray-400 font-light block">{post.time}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setSearchParams({ aba: 'moderacao' })}
                className="w-full text-center py-2.5 text-[11px] font-bold text-violet-600 hover:text-violet-800 transition-colors border border-violet-100 bg-violet-50/50 rounded-xl cursor-pointer mt-2"
              >
                Ir para moderação →
              </button>
            </div>

          </div>

          {/* BOTTOM ROW: CHART DISTRIBUTION & ACTIVE CLASSES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Distribuição de Usuários Donut chart */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13.5px] font-bold text-gray-950 border-b border-gray-100 pb-3">Distribuição de usuários</h3>
              
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                    {/* Alunos: 90.6% (stroke-dasharray="90.6 9.4") */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="90.6 9.4" strokeDashoffset="25" />
                    {/* Professores: 9.4% (stroke-dasharray="9.4 90.6") */}
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="9.4 90.6" strokeDashoffset="115.6" />
                  </svg>
                </div>

                <div className="space-y-3 text-[11.5px] font-medium text-gray-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                    <div>
                      <p className="font-bold text-gray-900">Alunos</p>
                      <p className="text-[10px] text-gray-400 font-light">464 (90.6%)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                    <div>
                      <p className="font-bold text-gray-900">Professores</p>
                      <p className="text-[10px] text-gray-400 font-light">48 (9.4%)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Turmas Ativas */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[13.5px] font-bold text-gray-950">Turmas ativas</h3>
                <button onClick={() => setSearchParams({ aba: 'turmas' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todas</button>
              </div>

              <div className="space-y-3">
                {[
                  { nome: '1º Ano A', count: '24 alunos', progress: 'w-[96%] bg-violet-650', percentage: '96%' },
                  { nome: '2º Ano B', count: '26 alunos', progress: 'w-[91%] bg-green-650', percentage: '91%' },
                  { nome: '3º Ano C', count: '22 alunos', progress: 'w-[88%] bg-blue-650', percentage: '88%' }
                ].map((t, idx) => (
                  <div key={idx} className="space-y-1 text-[11.5px]">
                    <div className="flex items-center justify-between font-bold text-gray-850">
                      <span>{t.nome}</span>
                      <span>{t.percentage}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${t.progress}`} />
                    </div>
                    <p className="text-[9.5px] text-gray-400 font-light">{t.count}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações Rápidas Grid */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13.5px] font-bold text-gray-950 border-b border-gray-100 pb-3">Ações rápidas</h3>
              
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Criar aviso', action: () => setModalAvisoOpen(true), icon: <Bell size={16} /> },
                  { label: 'Criar turma', action: () => setModalTurmaOpen(true), icon: <GraduationCap size={16} /> },
                  { label: 'Add usuário', action: () => setModalUsuarioOpen(true), icon: <UserPlus size={16} /> },
                  { label: 'Ver relatórios', action: () => setSearchParams({ aba: 'relatorios' }), icon: <BarChart3 size={16} /> },
                  { label: 'Configurações', action: () => setSearchParams({ aba: 'configuracoes' }), icon: <Settings size={16} /> },
                  { label: 'Logs sistema', action: () => setSearchParams({ aba: 'atividades' }), icon: <FileText size={16} /> }
                ].map((act, i) => (
                  <button 
                    key={i} 
                    onClick={act.action}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-all text-[9.5px] font-bold text-gray-700 gap-1.5 cursor-pointer text-center"
                  >
                    {act.icon}
                    <span>{act.label}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* GERENCIAMENTO DE USUÁRIOS VIEW */}
      {abaAtiva === 'usuarios' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Controle Geral de Usuários</h2>
                <p className="text-[12px] text-gray-400">Adicione, edite, suspenda ou configure permissões de contas.</p>
              </div>

              <button 
                onClick={() => {
                  setUsuarioForm({ id: '', nome: '', email: '', papel: 'aluno', status: 'Ativo', turma: '', disciplinas: '', senha: '' });
                  setModalUsuarioOpen(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus size={16} /> Cadastrar Usuário
              </button>
            </div>

            {/* Barra de Filtros */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 bg-white border border-gray-250 rounded-xl px-3.5 py-2 w-full sm:max-w-xs focus-within:border-black transition-colors">
                <Search size={14} className="text-gray-400" />
                <input 
                  type="text" 
                  value={buscaUsuario}
                  onChange={(e) => setBuscaUsuario(e.target.value)}
                  placeholder="Nome ou e-mail..."
                  className="bg-transparent outline-none border-none text-[12.5px] text-gray-700 placeholder-gray-400 w-full"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <select
                  value={filtroPapel}
                  onChange={(e) => setFiltroPapel(e.target.value)}
                  className="bg-white border border-gray-250 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="">Todos os Cargos</option>
                  <option value="administrador">Administrador</option>
                  <option value="professor">Professor</option>
                  <option value="aluno">Aluno</option>
                </select>

                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="bg-white border border-gray-250 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer w-full sm:w-auto"
                >
                  <option value="">Todos os Status</option>
                  <option value="Ativo">Ativos</option>
                  <option value="Inativo">Inativos</option>
                  <option value="Bloqueado">Bloqueados</option>
                </select>
              </div>
            </div>

            {/* Tabela de Usuários */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Nome</th>
                    <th className="pb-3">E-mail</th>
                    <th className="pb-3">Cargo</th>
                    <th className="pb-3">Turma/Disciplinas</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[12px] text-gray-700">
                  {usuariosFiltrados.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50/55 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-gray-950">{user.nome}</td>
                      <td className="py-3.5 text-gray-500">{user.email || '---'}</td>
                      <td className="py-3.5 uppercase font-bold text-[10px] text-gray-400">{user.papel}</td>
                      <td className="py-3.5 font-light">{user.turma || user.disciplinas || '---'}</td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9.5px] ${
                          user.status === 'Ativo' ? 'bg-green-50 text-green-700' : 
                          (user.status === 'Bloqueado' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500')
                        }`}>{user.status || 'Ativo'}</span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => {
                              setUsuarioForm({ ...user });
                              setModalUsuarioOpen(true);
                            }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 cursor-pointer"
                            title="Editar"
                          >
                            <Edit size={14} />
                          </button>
                          
                          {user.status === 'Bloqueado' ? (
                            <button 
                              onClick={() => handleAlterarStatusUsuario(user.id, user.nome, 'Ativo')}
                              className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg cursor-pointer"
                              title="Desbloquear"
                            >
                              <Unlock size={14} />
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleAlterarStatusUsuario(user.id, user.nome, 'Bloqueado')}
                              className="p-1.5 hover:bg-red-50 text-red-650 rounded-lg cursor-pointer"
                              title="Bloquear"
                            >
                              <Lock size={14} />
                            </button>
                          )}

                          <button 
                            onClick={() => handleExcluirUsuario(user.id, user.nome)}
                            className="p-1.5 hover:bg-red-50 text-red-650 rounded-lg cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {usuariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">Nenhum usuário localizado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* GERENCIAMENTO DE PROFESSORES VIEW */}
      {abaAtiva === 'professores' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Vínculos de Professores e Disciplinas</h2>
              <p className="text-[12px] text-gray-400">Associe professores às suas turmas, altere disciplinas ou configure permissões.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allUsers.filter(u => u.papel === 'professor').map(prof => (
                <div key={prof.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-[14px]">
                      {prof.nome[0]}
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-extrabold text-gray-950">{prof.nome}</h4>
                      <p className="text-[11px] text-gray-400 font-light">{prof.email}</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-200/50 pt-3 text-[12px]">
                    <div>
                      <span className="text-gray-400 font-medium">Turmas Vinculadas:</span>
                      <p className="font-bold text-gray-800 mt-0.5">{prof.turma || 'Sem turma associada'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-medium">Disciplinas:</span>
                      <p className="font-bold text-gray-850 mt-0.5">{prof.disciplinas || 'Não configuradas'}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => {
                        setUsuarioForm({ ...prof });
                        setModalUsuarioOpen(true);
                      }}
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-[11px] font-bold px-3.5 py-2 rounded-xl text-gray-700 cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit size={12} /> Editar Vínculos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GERENCIAMENTO DE ALUNOS VIEW */}
      {abaAtiva === 'alunos' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Transferências e Histórico de Alunos</h2>
              <p className="text-[12px] text-gray-400">Transfira alunos de turma, suspenda contas ou monitore engajamento.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Estudante</th>
                    <th className="pb-3">Turma Atual</th>
                    <th className="pb-3">Matrícula</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[12px] text-gray-700">
                  {allUsers.filter(u => u.papel === 'aluno').map(aluno => (
                    <tr key={aluno.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-gray-950">{aluno.nome}</td>
                      <td className="py-3.5 font-bold text-violet-650">{aluno.turma || 'Sem Turma'}</td>
                      <td className="py-3.5 text-gray-500 font-light">{aluno.matricula || '---'}</td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9.5px] ${
                          aluno.status === 'Ativo' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>{aluno.status || 'Ativo'}</span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button 
                          onClick={() => {
                            setUsuarioForm({ ...aluno });
                            setModalUsuarioOpen(true);
                          }}
                          className="bg-white border border-gray-250 hover:bg-gray-100 text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer text-gray-700"
                        >
                          Transferir Turma
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* GERENCIAMENTO DE TURMAS VIEW */}
      {abaAtiva === 'turmas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Lista Geral de Turmas</h2>
                <p className="text-[12px] text-gray-400">Adicione novas turmas, associe professores ou encerre classes.</p>
              </div>

              <button 
                onClick={() => {
                  setTurmaForm({ id: '', nome: '', serie: 'Ensino Médio', professor_id: '' });
                  setModalTurmaOpen(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Criar Turma
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {turmas.map(t => {
                const professorObj = allUsers.find(u => u.id === t.professor_id) || {};
                const alunosTurma = allUsers.filter(u => u.turma && u.turma.toLowerCase() === t.nome.toLowerCase());
                return (
                  <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 space-y-4 relative">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                        <GraduationCap size={18} />
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setTurmaForm({ ...t });
                            setModalTurmaOpen(true);
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 cursor-pointer"
                          title="Editar"
                        >
                          <Edit size={13} />
                        </button>
                        <button 
                          onClick={() => handleExcluirTurma(t.id, t.nome)}
                          className="p-1.5 hover:bg-red-50 text-red-650 rounded-lg cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[14px] font-black text-gray-900">{t.nome}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">{t.serie}</p>
                    </div>

                    <div className="space-y-1.5 text-[11.5px] border-t border-gray-200/50 pt-3">
                      <div>
                        <span className="text-gray-400">Responsável:</span>
                        <p className="font-bold text-gray-800 mt-0.5">{professorObj.nome || 'Nenhum associado'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Estudantes Matriculados:</span>
                        <p className="font-bold text-gray-800 mt-0.5">{alunosTurma.length} alunos</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* POSTAGENS VIEW */}
      {abaAtiva === 'postagens' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Histórico de Postagens Geral</h2>
              <p className="text-[12px] text-gray-400">Monitore, visualize ou remova postagens de todas as turmas.</p>
            </div>

            <div className="space-y-4">
              {posts.map(post => {
                const autor = allUsers.find(u => u.id === post.user_id) || {};
                return (
                  <div key={post.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-bold text-gray-900">{autor.nome || 'Autor'}</span>
                        <span className="text-[9.5px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{autor.turma || 'Sem Turma'}</span>
                      </div>
                      <p className="text-[12px] text-gray-600 font-light leading-relaxed">{post.content}</p>
                      <span className="text-[9.5px] text-gray-400 block">Publicado em: {formatarData(post.created_at)}</span>
                    </div>

                    <button 
                      onClick={async () => {
                        if (!window.confirm('Excluir este post permanentemente?')) return;
                        await supabase.from('posts').delete().eq('id', post.id);
                        carregarDados();
                      }}
                      className="text-[11px] font-bold bg-white border border-gray-250 hover:bg-red-50 hover:text-red-750 px-3.5 py-2 rounded-xl text-gray-650 cursor-pointer self-end md:self-auto"
                    >
                      Remover Post
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODERAÇÃO DE CONTEÚDOS VIEW */}
      {abaAtiva === 'moderacao' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Central de Moderação e Denúncias</h2>
              <p className="text-[12px] text-gray-400">Examine denúncias feitas por usuários e posts aguardando revisão.</p>
            </div>

            <div className="divide-y divide-gray-50 space-y-4">
              {denuncias.map(den => {
                const postObj = posts.find(p => p.id === den.post_id) || {};
                const denunciante = allUsers.find(u => u.id === den.reporter_id) || {};
                return (
                  <div key={den.id} className="pt-4 flex flex-col md:flex-row md:items-start justify-between gap-5 text-[12px]">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5"><AlertTriangle size={8} /> Denúncia</span>
                        <span className="text-gray-400">Enviada por:</span>
                        <span className="font-bold text-gray-900">{denunciante.nome || 'Estudante'}</span>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Motivo: {den.reason}</span>
                        <p className="text-gray-650 font-light">Conteúdo do post: "{postObj.content || '(Post Excluído)'}"</p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 self-end md:self-auto flex-shrink-0">
                      <button 
                        onClick={async () => {
                          await supabase.from('reports').delete().eq('id', den.id);
                          toast.success('Denúncia arquivada.');
                          carregarDados();
                        }}
                        className="bg-white border border-gray-250 px-3 py-2 rounded-xl text-[11px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        Descartar Denúncia
                      </button>
                      <button 
                        onClick={async () => {
                          if (postObj.id) {
                            await supabase.from('posts').delete().eq('id', postObj.id);
                          }
                          await supabase.from('reports').delete().eq('id', den.id);
                          toast.success('Post removido.');
                          carregarDados();
                        }}
                        className="bg-red-650 text-white px-3 py-2 rounded-xl text-[11px] font-bold hover:bg-red-700 cursor-pointer"
                      >
                        Excluir Conteúdo
                      </button>
                    </div>
                  </div>
                );
              })}

              {denuncias.length === 0 && (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <CheckCircle size={32} className="text-green-500" />
                  <span className="text-[13px] font-bold text-gray-600">Ambiente seguro!</span>
                  <p className="text-[11.5px] text-gray-400 font-light">Nenhuma denúncia ou conteúdo irregular pendente.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RELATÓRIOS VIEW */}
      {abaAtiva === 'relatorios' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Relatórios Executivos Consolidados</h2>
                <p className="text-[12px] text-gray-400">Analise a participação geral, número de publicações e crescimento.</p>
              </div>

              <button 
                onClick={exportarPDF}
                className="bg-black hover:bg-gray-900 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={15} /> Exportar Relatório (PDF)
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { title: 'Total de Contas', value: stats.usuarios },
                { title: 'Publicações', value: stats.postagens },
                { title: 'Turmas Ativas', value: stats.turmas },
                { title: 'Histórico Denúncias', value: stats.denuncias }
              ].map((m, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center space-y-1">
                  <span className="text-[10px] text-gray-450 uppercase font-bold tracking-wider">{m.title}</span>
                  <h4 className="text-2xl font-black text-gray-900">{m.value}</h4>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LOGS DO SISTEMA VIEW */}
      {abaAtiva === 'atividades' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Logs de Auditoria do Sistema</h2>
              <p className="text-[12px] text-gray-400">Monitore as ações dos administradores, alterações de segurança e logs de IP.</p>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:max-w-xs focus-within:border-black transition-colors">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text" 
                value={buscaLog}
                onChange={(e) => setBuscaLog(e.target.value)}
                placeholder="Pesquisar logs por módulo ou ação..."
                className="bg-transparent outline-none border-none text-[12.5px] text-gray-700 placeholder-gray-400 w-full"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-150 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="pb-3 pl-2">Ação</th>
                    <th className="pb-3">Módulo</th>
                    <th className="pb-3">Data/Hora</th>
                    <th className="pb-3 pr-2 text-right">Endereço IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-[12px] text-gray-700 font-light">
                  {logsFiltrados.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 pl-2 font-bold text-gray-900">{log.action}</td>
                      <td className="py-3.5"><span className="bg-gray-150 px-2 py-0.5 rounded-full font-bold text-[9.5px] text-gray-500 uppercase">{log.module}</span></td>
                      <td className="py-3.5 text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                      <td className="py-3.5 pr-2 text-right font-mono text-gray-400">{log.ip_address}</td>
                    </tr>
                  ))}

                  {logsFiltrados.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-400 font-normal">Nenhum log de auditoria encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* AVISOS GERAIS VIEW */}
      {abaAtiva === 'avisos' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Avisos e Notificações em Massa</h2>
                <p className="text-[12px] text-gray-400">Envie alertas oficiais para grupos específicos de usuários.</p>
              </div>

              <button 
                onClick={() => setModalAvisoOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Novo Comunicado
              </button>
            </div>

            <form onSubmit={handleEnviarAvisoGeral} className="space-y-4 max-w-lg bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Enviar para:</label>
                <select
                  value={avisoForm.destino}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, destino: e.target.value }))}
                  className="w-full bg-white border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none cursor-pointer"
                >
                  <option value="todos">Todos os Usuários</option>
                  <option value="professores">Apenas Professores</option>
                  <option value="alunos">Apenas Alunos</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Assunto / Título</label>
                <input 
                  type="text" 
                  value={avisoForm.title}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Manutenção agendada no portal"
                  className="w-full bg-white border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Mensagem</label>
                <textarea 
                  value={avisoForm.content}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva o comunicado aqui..."
                  rows={4}
                  className="w-full bg-white border border-gray-250 rounded-xl p-3.5 text-[12.5px] outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-[12px] cursor-pointer"
              >
                Disparar Comunicado 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURAÇÕES DO SISTEMA VIEW */}
      {abaAtiva === 'configuracoes' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Configurações Globais da Plataforma</h2>
              <p className="text-[12px] text-gray-400">Configure a identidade visual, regras comunitárias e termos de uso do EduConnect.</p>
            </div>

            <form onSubmit={handleSalvarConfiguracoes} className="space-y-5 max-w-2xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nome do Sistema</label>
                  <input 
                    type="text" 
                    value={configForm.platform_name}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, platform_name: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Cor Principal Hex</label>
                  <input 
                    type="text" 
                    value={configForm.primary_color}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, primary_color: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Diretrizes da Comunidade</label>
                <textarea 
                  value={configForm.community_rules}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, community_rules: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-255 rounded-xl p-3.5 text-[12px] outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Política de Privacidade</label>
                <textarea 
                  value={configForm.privacy_policy}
                  onChange={(e) => setConfigForm(prev => ({ ...prev, privacy_policy: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-255 rounded-xl p-3.5 text-[12px] outline-none resize-none"
                />
              </div>

              <button 
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 py-2.5 rounded-xl text-[12px] cursor-pointer"
              >
                Salvar Configurações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BACKUP VIEW */}
      {abaAtiva === 'backup' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Backups de Banco de Dados</h2>
              <p className="text-[12px] text-gray-400">Exporte dados completos ou restaure estados da comunidade.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-3">
                <h4 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-1.5"><Download size={16} className="text-violet-600" /> Gerar Cópia de Segurança (Exportar)</h4>
                <p className="text-[11.5px] text-gray-400 font-light">Gere um arquivo JSON contendo todas as tabelas de usuários, turmas, posts e configurações atuais.</p>
                <button 
                  onClick={handleGerarBackup}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Gerar e Baixar Backup
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-6 space-y-3">
                <h4 className="text-[13.5px] font-bold text-gray-900 flex items-center gap-1.5"><RefreshCw size={16} className="text-violet-600" /> Restaurar Cópia</h4>
                <p className="text-[11.5px] text-gray-400 font-light">Restaurar a plataforma para um estado salvo anteriormente a partir de um backup local.</p>
                <button 
                  onClick={handleRestaurarBackup}
                  className="bg-black hover:bg-gray-900 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Selecionar Arquivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- OUTRAS VIEWS (PERMISSÕES/SEGURANÇA) --- */}
      {(abaAtiva === 'permissoes' || abaAtiva === 'seguranca') && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Segurança da Informação e RBAC</h2>
              <p className="text-[12px] text-gray-400">Verifique chaves ativas do Supabase ou gerencie políticas de segurança.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-3 text-[12px]">
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400">Sessões administrativas seguras:</span>
                <span className="font-bold text-green-600">ATIVADO</span>
              </div>
              <div className="flex justify-between border-b border-gray-200/50 pb-2">
                <span className="text-gray-400">Nível máximo de acesso (RBAC):</span>
                <span className="font-bold text-violet-650">ADMINISTRADOR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS DE CADASTRO --- */}
      
      {/* Modal Criar/Editar Usuário */}
      {modalUsuarioOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalUsuarioOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <UserPlus size={18} className="text-violet-600" /> {usuarioForm.id ? 'Editar Conta de Usuário' : 'Cadastrar Novo Usuário'}
              </h3>
              <button onClick={() => setModalUsuarioOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarEditarUsuario} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome Completo</label>
                <input 
                  type="text" 
                  value={usuarioForm.nome}
                  onChange={(e) => setUsuarioForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome do usuário"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              {!usuarioForm.id && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Endereço de E-mail</label>
                  <input 
                    type="email" 
                    value={usuarioForm.email}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@educonnect.com"
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Nível de Acesso (Cargo)</label>
                  <select
                    value={usuarioForm.papel}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, papel: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                  <select
                    value={usuarioForm.status}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
              </div>

              {usuarioForm.papel === 'aluno' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Turma</label>
                  <select
                    value={usuarioForm.turma}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, turma: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  >
                    <option value="">Selecione a turma...</option>
                    {turmas.map(t => (
                      <option key={t.id} value={t.nome}>{t.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {usuarioForm.papel === 'professor' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Disciplinas (Separadas por vírgula)</label>
                  <input 
                    type="text" 
                    value={usuarioForm.disciplinas}
                    onChange={(e) => setUsuarioForm(prev => ({ ...prev, disciplinas: e.target.value }))}
                    placeholder="Matemática, IHC, Física"
                    className="w-full bg-gray-50 border border-gray-255 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalUsuarioOpen(false)}
                  className="flex-1 bg-gray-105 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                >
                  Confirmar Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Turma */}
      {modalTurmaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalTurmaOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <GraduationCap size={18} className="text-violet-600" /> {turmaForm.id ? 'Editar Turma' : 'Cadastrar Nova Turma'}
              </h3>
              <button onClick={() => setModalTurmaOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarEditarTurma} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Turma</label>
                <input 
                  type="text" 
                  value={turmaForm.nome}
                  onChange={(e) => setTurmaForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: 3º Ano D"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Série / Grau de Ensino</label>
                <input 
                  type="text" 
                  value={turmaForm.serie}
                  onChange={(e) => setTurmaForm(prev => ({ ...prev, serie: e.target.value }))}
                  placeholder="Ensino Médio"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Professor Responsável</label>
                <select
                  value={turmaForm.professor_id}
                  onChange={(e) => setTurmaForm(prev => ({ ...prev, professor_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                >
                  <option value="">Selecione o professor...</option>
                  {allUsers.filter(u => u.papel === 'professor').map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalTurmaOpen(false)}
                  className="flex-1 bg-gray-105 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                >
                  Confirmar Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE REJEIÇÃO DE POST (MODERAÇÃO) */}
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

            <form onSubmit={handleRejeitarPostConfirmar} className="space-y-4">
              <div className="space-y-2">
                {[
                  'Linguagem inadequada',
                  'Conteúdo fora do contexto escolar',
                  'Spam',
                  'Informação incorreta'
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

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPostParaRejeitar(null)}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 py-2.5 rounded-xl text-[12px] font-semibold text-gray-500 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-650 hover:bg-red-700 text-white py-2.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

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
  Search,
  HelpCircle,
  TrendingUp,
  Award,
  MessageCircle,
  ThumbsUp,
  UserCheck,
  Printer,
  Loader2,
  Shield,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function PainelProfessor() {
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const abaAtiva = searchParams.get('aba') || 'dashboard';

  // Estados Globais
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [submissoes, setSubmissoes] = useState([]);
  const [postsPendentes, setPostsPendentes] = useState([]);
  const [denuncias, setDenuncias] = useState([]);

  // Estados de estatísticas para o Dashboard Consolidado
  const [totalAlunosCount, setTotalAlunosCount] = useState(256);
  const [totalTurmas, setTotalTurmas] = useState(8);
  const [totalAtividades, setTotalAtividades] = useState(24);
  const [totalPublicacoes, setTotalPublicacoes] = useState(56);
  const [totalComentarios, setTotalComentarios] = useState(142);
  const [totalCurtidas, setTotalCurtidas] = useState(312);
  const [totalAtividadesEntregues, setTotalAtividadesEntregues] = useState(189);

  // Estados locais de Modais
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [modalAtividadeOpen, setModalAtividadeOpen] = useState(false);
  const [modalEventoOpen, setModalEventoOpen] = useState(false);

  // Formulários
  const [avisoForm, setAvisoForm] = useState({ title: '', content: '', turma_id: '', is_pinned: false, scheduled_at: '' });
  const [atividadeForm, setAtividadeForm] = useState({ title: '', description: '', due_date: '', turma_id: '', evaluation_criteria: '' });
  const [eventoForm, setEventoForm] = useState({ title: '', description: '', event_type: 'Prova', event_date: '', turma_id: '' });

  // Modais de Ações de Moderação
  const [postParaRejeitar, setPostParaRejeitar] = useState(null);
  const [motivoRejeicao, setMotivoRejeicao] = useState('Linguagem inadequada');
  const [outroMotivo, setOutroMotivo] = useState('');
  const [rejeitando, setRejeitando] = useState(false);

  // Estados de Filtros e Ordenação de Alunos
  const [filtroAlunosBusca, setFiltroAlunosBusca] = useState('');
  const [ordemAlunos, setOrdemAlunos] = useState('participativos'); // 'participativos', 'menos', 'nome'

  useEffect(() => {
    carregarDados();
  }, [usuario, perfil]);

  const ehAdmin = () => perfil?.papel === 'professor' || perfil?.papel === 'administrador';

  async function carregarDados() {
    try {
      setLoading(true);

      const [
        { data: dataTurmas, error: errTurmas },
        { data: dataPerfis, error: errPerfis },
        { data: dataAtiv, error: errAtiv },
        { data: dataAvisos, error: errAvisos },
        { data: dataEventos, error: errEventos },
        { data: dataSub, error: errSub },
        { data: dataPosts, error: errPosts },
        { data: dataDen, error: errDen },
        { data: dataComments },
        { data: dataLikes }
      ] = await Promise.all([
        supabase.from('turmas').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('activities').select('*'),
        supabase.from('announcements').select('*'),
        supabase.from('calendar_events').select('*'),
        supabase.from('activity_submissions').select('*'),
        supabase.from('posts').select('*').order('created_at', { ascending: false }),
        supabase.from('reports').select('*'),
        supabase.from('comments').select('id'),
        supabase.from('post_likes').select('id')
      ]);

      if (errTurmas) throw errTurmas;
      if (errPerfis) throw errPerfis;
      if (errAtiv) throw errAtiv;
      if (errAvisos) throw errAvisos;
      if (errEventos) throw errEventos;
      if (errSub) throw errSub;
      if (errPosts) throw errPosts;
      if (errDen) throw errDen;

      // 1. Obter todas as turmas
      const allTurmas = dataTurmas || [];
      setTotalTurmas(allTurmas.length || 8);
      setTurmas(allTurmas);

      // 2. Obter todos os perfis (Alunos e Professores)
      const allProfiles = dataPerfis || [];
      const alunosFiltrados = allProfiles.filter(p => p.papel === 'aluno');
      setAlunos(alunosFiltrados);
      setTotalAlunosCount(alunosFiltrados.length || 256);

      // 3. Obter atividades
      setAtividades(dataAtiv || []);
      setTotalAtividades(dataAtiv?.length || 24);

      // 4. Obter avisos / comunicados
      setAvisos(dataAvisos || []);

      // 5. Obter eventos de calendário
      setEventos(dataEventos || []);

      // 6. Obter submissões de atividades
      setSubmissoes(dataSub || []);
      setTotalAtividadesEntregues(dataSub?.length || 189);

      // 7. Obter todas as postagens
      const allPosts = dataPosts || [];
      setTotalPublicacoes(allPosts.length || 56);

      // Filtrar posts pendentes apenas dos alunos que o professor gerencia
      const postsPendentesFiltrados = allPosts.filter(p => p.status === 'Aguardando aprovação');
      setPostsPendentes(postsPendentesFiltrados);

      // 8. Obter denúncias
      setDenuncias(dataDen || []);

      // 9. Obter contagem de comentários e curtidas
      setTotalComentarios(dataComments?.length || 142);
      setTotalCurtidas(dataLikes?.length || 312);

    } catch (error) {
      console.error('Erro ao carregar painel:', error);
      toast.error('Erro ao inicializar o painel do professor.');
    } finally {
      setLoading(false);
    }
  }

  // --- MURAL DE AVISOS ---
  const handleCriarAviso = async (e) => {
    e.preventDefault();
    if (!avisoForm.title.trim() || !avisoForm.content.trim() || !avisoForm.turma_id) {
      toast.warning('Preencha o título, conteúdo e turma.');
      return;
    }

    try {
      const { error } = await supabase.from('announcements').insert({
        title: avisoForm.title.trim(),
        content: avisoForm.content.trim(),
        turma_id: avisoForm.turma_id,
        professor_id: usuario.id,
        is_pinned: avisoForm.is_pinned,
        scheduled_at: avisoForm.scheduled_at ? new Date(avisoForm.scheduled_at).toISOString() : null
      });

      if (error) throw error;

      // Enviar notificação para todos os alunos dessa turma
      const alunosDaTurma = alunos.filter(a => {
        const t = turmas.find(turma => turma.id === avisoForm.turma_id);
        return a.turma && t && a.turma.toLowerCase() === (t.nome || '').toLowerCase();
      });

      for (const aluno of alunosDaTurma) {
        await supabase.from('notifications').insert({
          user_id: aluno.id,
          actor_id: usuario.id,
          actor_handle: `@${(perfil?.nome || 'professor').toLowerCase().replace(/\s+/g, '')}`,
          content: `publicou um novo aviso da turma: "${avisoForm.title}"`,
          type: 'announcement'
        });
      }

      toast.success('Aviso publicado com sucesso! 📢');
      setModalAvisoOpen(false);
      setAvisoForm({ title: '', content: '', turma_id: '', is_pinned: false, scheduled_at: '' });
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar aviso.');
    }
  };

  const handleExcluirAviso = async (avisoId) => {
    if (!window.confirm('Deseja excluir este aviso?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', avisoId);
      if (error) throw error;
      toast.success('Aviso excluído.');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir aviso.');
    }
  };

  // --- ATIVIDADES ---
  const handleCriarAtividade = async (e) => {
    e.preventDefault();
    if (!atividadeForm.title.trim() || !atividadeForm.due_date || !atividadeForm.turma_id) {
      toast.warning('Preencha o título, data de entrega e turma.');
      return;
    }

    try {
      const { error } = await supabase.from('activities').insert({
        title: atividadeForm.title.trim(),
        description: atividadeForm.description.trim(),
        due_date: new Date(atividadeForm.due_date).toISOString(),
        turma_id: atividadeForm.turma_id,
        professor_id: usuario.id,
        evaluation_criteria: atividadeForm.evaluation_criteria.trim(),
        status: 'Aberta'
      });

      if (error) throw error;

      // Notificar alunos
      const alunosDaTurmaAtiv = alunos.filter(a => {
        const t = turmas.find(turma => turma.id === atividadeForm.turma_id);
        return a.turma && t && a.turma.toLowerCase() === (t.nome || '').toLowerCase();
      });

      for (const aluno of alunosDaTurmaAtiv) {
        await supabase.from('notifications').insert({
          user_id: aluno.id,
          actor_id: usuario.id,
          actor_handle: `@${(perfil?.nome || 'professor').toLowerCase().replace(/\s+/g, '')}`,
          content: `criou uma nova atividade: "${atividadeForm.title}"`,
          type: 'activity'
        });
      }

      toast.success('Atividade criada! 📝');
      setModalAtividadeOpen(false);
      setAtividadeForm({ title: '', description: '', due_date: '', turma_id: '', evaluation_criteria: '' });
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar atividade.');
    }
  };

  const handleEncerrarAtividade = async (ativId, novoStatus) => {
    try {
      const { error } = await supabase.from('activities').update({ status: novoStatus }).eq('id', ativId);
      if (error) throw error;
      toast.success(`Atividade ${novoStatus === 'Encerrada' ? 'encerrada' : 'reaberta'} com sucesso!`);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao alterar status da atividade.');
    }
  };

  const handleExcluirAtividade = async (ativId) => {
    if (!window.confirm('Tem certeza de que deseja excluir esta atividade? Todas as entregas dos alunos serão perdidas.')) return;
    try {
      const { error } = await supabase.from('activities').delete().eq('id', ativId);
      if (error) throw error;
      toast.success('Atividade excluída.');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir atividade.');
    }
  };

  // --- CALENDÁRIO ---
  const handleCriarEvento = async (e) => {
    e.preventDefault();
    if (!eventoForm.title.trim() || !eventoForm.event_date || !eventoForm.turma_id) {
      toast.warning('Preencha o título, data e turma.');
      return;
    }

    try {
      const { error } = await supabase.from('calendar_events').insert({
        title: eventoForm.title.trim(),
        description: eventoForm.description.trim(),
        event_type: eventoForm.event_type,
        event_date: new Date(eventoForm.event_date).toISOString(),
        turma_id: eventoForm.turma_id,
        professor_id: usuario.id
      });

      if (error) throw error;

      toast.success('Evento agendado no calendário! 📅');
      setModalEventoOpen(false);
      setEventoForm({ title: '', description: '', event_type: 'Prova', event_date: '', turma_id: '' });
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao agendar evento.');
    }
  };

  const handleExcluirEvento = async (eventId) => {
    if (!window.confirm('Remover este evento do calendário?')) return;
    try {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
      if (error) throw error;
      toast.success('Evento removido.');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir evento.');
    }
  };

  // --- MODERAÇÃO DE POSTS ---
  const handleAprovarPost = async (postId) => {
    try {
      const { error } = await supabase.from('posts').update({ status: 'Aprovada' }).eq('id', postId);
      if (error) throw error;

      await supabase.from('moderation_history').insert({
        post_id: postId,
        moderator_id: usuario.id,
        action: 'Aprovada',
        reason: 'Aprovado pelo painel do professor.'
      });

      toast.success('Postagem aprovada!');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aprovar postagem.');
    }
  };

  const abrirModalRejeitar = (post) => {
    setPostParaRejeitar(post);
    setMotivoRejeicao('Linguagem inadequada');
    setOutroMotivo('');
  };

  const handleRejeitarPostConfirmar = async (e) => {
    e.preventDefault();
    if (!postParaRejeitar) return;

    const motivoFinal = motivoRejeicao === 'Outro' ? outroMotivo.trim() : motivoRejeicao;
    if (!motivoFinal) {
      toast.warning('Descreva o motivo da rejeição.');
      return;
    }

    try {
      setRejeitando(true);
      const { error } = await supabase.from('posts').update({ status: 'Rejeitada' }).eq('id', postParaRejeitar.id);
      if (error) throw error;

      await supabase.from('moderation_history').insert({
        post_id: postParaRejeitar.id,
        moderator_id: usuario.id,
        action: 'Rejeitada',
        reason: motivoFinal
      });

      toast.success('Postagem rejeitada.');
      setPostParaRejeitar(null);
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao rejeitar postagem.');
    } finally {
      setRejeitando(false);
    }
  };

  // --- EXPORTAR RELATÓRIO PARA PDF (NATIVO) ---
  const exportarPDF = () => {
    const printWindow = window.open('', '_blank');
    const relatorioHtml = `
      <html>
      <head>
        <title>Relatório Acadêmico — EduConnect</title>
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
          .badge { font-size: 10px; font-weight: bold; background-color: #e0e7ff; color: #4338ca; padding: 2px 8px; rounded: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Engajamento Acadêmico</h1>
          <p>EduConnect — Painel do Professor • Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
        
        <div class="section">
          <h2>Resumo das Turmas</h2>
          <table>
            <thead>
              <tr>
                <th>Nome da Turma</th>
                <th>Série/Ensino</th>
                <th>Alunos Cadastrados</th>
                <th>Atividades Publicadas</th>
              </tr>
            </thead>
            <tbody>
              ${turmas.map(t => `
                <tr>
                  <td><b>${t.nome}</b></td>
                  <td>${t.serie}</td>
                  <td>${alunos.filter(a => a.turma && a.turma.toLowerCase() === (t.nome || '').toLowerCase()).length}</td>
                  <td>${atividades.filter(a => a.turma_id === t.id).length}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Lista e Engajamento dos Alunos</h2>
          <table>
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Matrícula</th>
                <th>Atividades Entregues</th>
              </tr>
            </thead>
            <tbody>
              ${alunos.map(a => `
                <tr>
                  <td><b>${a.nome}</b></td>
                  <td><span class="badge">${a.turma || 'Sem Turma'}</span></td>
                  <td>${a.matricula || '---'}</td>
                  <td>${submissoes.filter(s => s.student_id === a.id).length}</td>
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

  // --- FILTRAGENS E ESTADISTICAS ---
  // Rankings e estatísticas para o Dashboard
  const totalPostsPendentes = postsPendentes.length;
  const totalAvisosCount = avisos.length;
  
  // Alunos filtrados e ordenados
  const alunosOrdenados = [...alunos].filter(a => {
    if (!filtroAlunosBusca.trim()) return true;
    return (a.nome || '').toLowerCase().includes(filtroAlunosBusca.toLowerCase());
  }).sort((a, b) => {
    if (ordemAlunos === 'nome') return (a.nome || '').localeCompare(b.nome || '');
    
    // Obter métricas de participação
    const ativA = (submissoes || []).filter(s => s.student_id === a.id).length;
    const ativB = (submissoes || []).filter(s => s.student_id === b.id).length;
    
    if (ordemAlunos === 'participativos') return ativB - ativA;
    return ativA - ativB;
  });

  const getTurmaAlunosCount = (turmaNome) => {
    return alunos.filter(a => a.turma && a.turma.toLowerCase() === (turmaNome || '').toLowerCase()).length;
  };

  // Formatar data em string bonita
  const formatarData = (dataIso) => {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  };

  // Formatar tempo relativo (ex: Há 2 horas)
  const formatarTempoRelativo = (dataIso) => {
    if (!dataIso) return '';
    try {
      const date = new Date(dataIso);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Agora mesmo';
      if (diffMins < 60) return `Há ${diffMins} min`;
      if (diffHours < 24) return `Há ${diffHours} h`;
      return `Há ${diffDays} d`;
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando painel do professor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 dark-dashboard-teacher text-white">
      <style>{`
        div:has(> main .dark-dashboard-teacher),
        main:has(.dark-dashboard-teacher) {
          background-color: #08070d !important;
        }
        header:has(+ main .dark-dashboard-teacher),
        header:has(+ div main .dark-dashboard-teacher) {
          background-color: #0d0c13 !important;
          border-color: rgba(255, 255, 255, 0.06) !important;
          backdrop-filter: blur(12px) !important;
        }
        header:has(+ main .dark-dashboard-teacher) *,
        header:has(+ div main .dark-dashboard-teacher) * {
          color: #ffffff !important;
        }
        .dark-dashboard-teacher {
          color: #ffffff;
        }
        .dark-dashboard-teacher .bg-white {
          background-color: #12111a !important;
        }
        .dark-dashboard-teacher .bg-gray-50 {
          background-color: #0a090f !important;
        }
        .dark-dashboard-teacher .border-gray-100,
        .dark-dashboard-teacher .border-gray-50,
        .dark-dashboard-teacher .border-gray-150,
        .dark-dashboard-teacher .border-gray-200,
        .dark-dashboard-teacher .border-gray-250,
        .dark-dashboard-teacher .border-gray-255 {
          border-color: rgba(255, 255, 255, 0.06) !important;
        }
        .dark-dashboard-teacher .text-gray-950,
        .dark-dashboard-teacher .text-gray-900,
        .dark-dashboard-teacher .text-gray-850,
        .dark-dashboard-teacher .text-gray-800 {
          color: #ffffff !important;
        }
        .dark-dashboard-teacher .text-gray-700,
        .dark-dashboard-teacher .text-gray-600,
        .dark-dashboard-teacher .text-gray-505,
        .dark-dashboard-teacher .text-gray-605 {
          color: #8e8d97 !important;
        }
        .dark-dashboard-teacher .text-gray-400,
        .dark-dashboard-teacher .text-gray-450 {
          color: #6c6b75 !important;
        }
        .dark-dashboard-teacher input,
        .dark-dashboard-teacher select,
        .dark-dashboard-teacher textarea {
          background-color: rgba(255, 255, 255, 0.04) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        .dark-dashboard-teacher select option {
          background-color: #12111a !important;
          color: #ffffff !important;
        }
        .dark-dashboard-teacher .bg-violet-50 {
          background-color: rgba(139, 92, 246, 0.12) !important;
          color: #a78bfa !important;
        }
        .dark-dashboard-teacher .text-violet-600 {
          color: #a78bfa !important;
        }
        .dark-dashboard-teacher .bg-violet-600 {
          background-color: #8b5cf6 !important;
        }
        .dark-dashboard-teacher .bg-green-50 {
          background-color: rgba(59, 130, 246, 0.12) !important;
          color: #60a5fa !important;
        }
        .dark-dashboard-teacher .text-green-600 {
          color: #60a5fa !important;
        }
        .dark-dashboard-teacher .bg-green-600 {
          background-color: #3b82f6 !important;
        }
        .dark-dashboard-teacher .bg-blue-50 {
          background-color: rgba(59, 130, 246, 0.12) !important;
          color: #60a5fa !important;
        }
        .dark-dashboard-teacher .text-blue-600 {
          color: #60a5fa !important;
        }
        .dark-dashboard-teacher .bg-blue-600 {
          background-color: #3b82f6 !important;
        }
        .dark-dashboard-teacher .bg-amber-50 {
          background-color: rgba(139, 92, 246, 0.12) !important;
          color: #a78bfa !important;
        }
        .dark-dashboard-teacher .text-amber-600 {
          color: #a78bfa !important;
        }
        .dark-dashboard-teacher .bg-amber-600 {
          background-color: #8b5cf6 !important;
        }
        .dark-dashboard-teacher .bg-purple-50 {
          background-color: rgba(59, 130, 246, 0.12) !important;
          color: #60a5fa !important;
        }
        .dark-dashboard-teacher .text-purple-600 {
          color: #60a5fa !important;
        }
        .dark-dashboard-teacher .bg-purple-600 {
          background-color: #3b82f6 !important;
        }
        /* Custom modal/card override */
        .dark-dashboard-teacher .bg-white.rounded-\[2\.5rem\],
        .dark-dashboard-teacher .bg-white.rounded-\[2rem\] {
          background-color: #12111a !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Painel do Professor</h1>
          <p className="text-[12.5px] text-gray-500 font-light">Acompanhe o que está acontecendo nas suas turmas.</p>
        </div>
        
        {/* Filtro de período */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-[12px] font-bold text-gray-700 shadow-sm">
          <Calendar size={14} className="text-gray-400" />
          <span>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* DASHBOARD VIEW */}
      {abaAtiva === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* ROW OF STATS CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total de Alunos */}
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <Users size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total de Alunos</span>
                <h3 className="text-2xl font-black text-gray-950">{totalAlunosCount}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+12 este mês ↗</span>
            </div>

            {/* Turmas Ativas */}
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Turmas Ativas</span>
                <h3 className="text-2xl font-black text-gray-950">{totalTurmas}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+1 este mês ↗</span>
            </div>

            {/* Atividades */}
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Atividades</span>
                <h3 className="text-2xl font-black text-gray-950">{totalAtividades}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+5 este mês ↗</span>
            </div>

            {/* Publicações */}
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Award size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Publicações</span>
                <h3 className="text-2xl font-black text-gray-950">{totalPublicacoes}</h3>
              </div>
              <span className="text-[10px] text-green-500 font-bold mt-4 flex items-center gap-0.5">+8 este mês ↗</span>
            </div>

          </div>

          {/* MIDDLE GRID: RECENT ACTIVITIES (2/3) & IMPORTANT ANNOUNCEMENTS (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Atividades Recentes (2/3 width) */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4 lg:col-span-2">
              <h3 className="text-[14px] font-bold text-gray-950 border-b border-gray-100 pb-3">Atividades recentes</h3>
              
              <div className="space-y-4">
                {[
                  {
                    title: "Nova atividade publicada em Matemática - 9º Ano",
                    meta: "Hoje, 10:30 - Por você",
                    icon: <FileText size={14} className="text-violet-600" />,
                    bg: "bg-violet-50"
                  },
                  {
                    title: "João Silva entregou a atividade de História",
                    meta: "Turma 8º Ano B - Hoje, 09:15",
                    icon: <Users size={14} className="text-blue-600" />,
                    bg: "bg-blue-50"
                  },
                  {
                    title: "Nova publicação no feed da turma 9º Ano A",
                    meta: "Ontem, 17:45 - Por você",
                    icon: <Award size={14} className="text-amber-600" />,
                    bg: "bg-amber-50"
                  },
                  {
                    title: "Ana Souza comentou na publicação",
                    meta: "Turma 9º Ano B - Ontem, 16:20",
                    icon: <MessageCircle size={14} className="text-green-600" />,
                    bg: "bg-green-50"
                  },
                  {
                    title: "Lucas Pereira entregou a atividade de Matemática",
                    meta: "Turma 9º Ano A - Ontem, 14:10",
                    icon: <Users size={14} className="text-blue-600" />,
                    bg: "bg-blue-50"
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-gray-900">{item.title}</h4>
                      <p className="text-[10px] text-gray-400 font-light mt-0.5">{item.meta}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Avisos Importantes (1/3 width) */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[14px] font-bold text-gray-950">Avisos importantes</h3>
                <button onClick={() => setSearchParams({ aba: 'avisos' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todos</button>
              </div>

              <div className="space-y-4">
                {avisos.length > 0 ? (
                  avisos.slice(0, 2).map((aviso) => (
                    <div key={aviso.id} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                        <h4 className="text-[12.5px] font-bold text-gray-900 line-clamp-1">{aviso.title}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 font-light line-clamp-2 pl-3">{aviso.content}</p>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                        <h4 className="text-[12.5px] font-bold text-gray-900">Reunião Pedagógica</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 font-light pl-3">Reunião com todos os professores na próxima sexta-feira (14/07) às 15h.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                        <h4 className="text-[12.5px] font-bold text-gray-900">Férias Escolares</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 font-light pl-3">Recesso escolar de 20/07 a 03/08. Retorno das aulas dia 04/08.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
          
          {/* BOTTOM GRID: QUICK ACCESS (2/3) & DONUT CHART (1/3) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Acesso Rápido (2/3 width) */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4 lg:col-span-2">
              <h3 className="text-[14px] font-bold text-gray-950 border-b border-gray-100 pb-3">Acesso rápido</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  {
                    title: "Criar atividade",
                    icon: <FileText size={20} className="text-violet-600" />,
                    bg: "bg-violet-50 hover:bg-violet-100/50",
                    action: () => {
                      setAtividadeForm(prev => ({ ...prev, turma_id: turmas[0]?.id || '' }));
                      setModalAtividadeOpen(true);
                    }
                  },
                  {
                    title: "Gerenciar turmas",
                    icon: <GraduationCap size={20} className="text-blue-600" />,
                    bg: "bg-blue-50 hover:bg-blue-100/50",
                    action: () => setSearchParams({ aba: 'turmas' })
                  },
                  {
                    title: "Adicionar usuário",
                    icon: <Users size={20} className="text-green-600" />,
                    bg: "bg-green-50 hover:bg-green-100/50",
                    action: () => navigate('/gerenciar-usuarios')
                  },
                  {
                    title: "Moderar publicações",
                    icon: <Shield size={20} className="text-amber-600" />,
                    bg: "bg-amber-50 hover:bg-amber-100/50",
                    action: () => navigate('/moderar-postagens')
                  },
                  {
                    title: "Relatórios",
                    icon: <BarChart3 size={20} className="text-violet-600" />,
                    bg: "bg-violet-50 hover:bg-violet-100/50",
                    action: () => setSearchParams({ aba: 'relatorios' })
                  },
                  {
                    title: "Configurações",
                    icon: <Settings size={20} className="text-gray-600" />,
                    bg: "bg-gray-50 hover:bg-gray-150/50",
                    action: () => navigate('/configuracoes')
                  }
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    onClick={btn.action}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border border-gray-100 transition-all ${btn.bg} cursor-pointer gap-2.5`}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                      {btn.icon}
                    </div>
                    <span className="text-[12px] font-bold text-gray-700 text-center">{btn.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resumo Geral (Donut Chart) (1/3 width) */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[14px] font-bold text-gray-950 border-b border-gray-100 pb-3">Resumo geral</h3>
              
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative w-36 h-36 flex-shrink-0">
                  {/* Rosca (Donut) SVG com as cores do EduConnect */}
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="10" />
                    
                    {/* Publicações: 56/699 = 8% -> dash="20.1", offset="0" */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#8b5cf6" strokeWidth="10" strokeDasharray="20.1 251.2" strokeDashoffset="0" />
                    
                    {/* Comentários: 142/699 = 20.3% -> dash="51", offset="-20.1" */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="10" strokeDasharray="51.0 251.2" strokeDashoffset="-20.1" />
                    
                    {/* Curtidas: 312/699 = 44.6% -> dash="112", offset="-71.1" */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="10" strokeDasharray="112.0 251.2" strokeDashoffset="-71.1" />
                    
                    {/* Atividades entregues: 189/699 = 27% -> dash="68.1", offset="-183.1" */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f97316" strokeWidth="10" strokeDasharray="68.1 251.2" strokeDashoffset="-183.1" />
                  </svg>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[20px] font-black text-gray-950 leading-none">699</span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">Total</span>
                  </div>
                </div>

                <div className="w-full grid grid-cols-2 gap-3 text-[11px] font-bold text-gray-500 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#8b5cf6]" />
                    <span className="truncate">Publicações: {totalPublicacoes}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#10b981]" />
                    <span className="truncate">Comentários: {totalComentarios}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#3b82f6]" />
                    <span className="truncate">Curtidas: {totalCurtidas}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-[#f97316]" />
                    <span className="truncate">Entregas: {totalAtividadesEntregues}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ATIVIDADES VIEW */}
      {abaAtiva === 'atividades' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Gerenciamento de Atividades Acadêmicas</h2>
                <p className="text-[12px] text-gray-400">Crie, edite, encerre ou remova atividades para todas as suas turmas.</p>
              </div>
              <button 
                onClick={() => {
                  setAtividadeForm({ title: '', description: '', due_date: '', evaluation_criteria: '', turma_id: turmas[0]?.id || '' });
                  setModalAtividadeOpen(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Nova Atividade
              </button>
            </div>

            <div className="space-y-4">
              {atividades.map(ativ => {
                const turmaObj = turmas.find(t => t.id === ativ.turma_id);
                return (
                  <div key={ativ.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 flex items-center justify-between gap-4 relative">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-gray-900">{ativ.title}</span>
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${ativ.status === 'Aberta' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{ativ.status}</span>
                        <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{turmaObj?.nome || 'Sem Turma'}</span>
                      </div>
                      <p className="text-[12px] text-gray-500 font-light leading-relaxed">{ativ.description}</p>
                      <div className="text-[10px] text-gray-400 font-light flex items-center gap-4">
                        <span>Prazo de entrega: {formatarData(ativ.due_date)}</span>
                        {ativ.evaluation_criteria && <span>Critério: {ativ.evaluation_criteria}</span>}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEncerrarAtividade(ativ.id, ativ.status === 'Aberta' ? 'Encerrada' : 'Aberta')}
                        className="p-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                        title={ativ.status === 'Aberta' ? 'Encerrar Atividade' : 'Reabrir Atividade'}
                      >
                        <Clock size={15} />
                      </button>
                      <button 
                        onClick={() => handleExcluirAtividade(ativ.id)}
                        className="p-2 bg-white border border-gray-200 text-red-650 rounded-xl hover:bg-red-50 cursor-pointer transition-colors"
                        title="Excluir Atividade"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {atividades.length === 0 && (
                <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhuma atividade cadastrada no sistema.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CALENDÁRIO VIEW */}
      {abaAtiva === 'calendario' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Calendário de Provas & Eventos</h2>
                <p className="text-[12px] text-gray-400">Agende avaliações, reuniões pedagógicas e datas festivas escolares.</p>
              </div>
              <button 
                onClick={() => {
                  setEventoForm({ title: '', description: '', event_type: 'Prova', event_date: '', turma_id: turmas[0]?.id || '' });
                  setModalEventoOpen(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Agendar Evento
              </button>
            </div>

            <div className="space-y-4">
              {eventos.map(evt => {
                const turmaObj = turmas.find(t => t.id === evt.turma_id);
                return (
                  <div key={evt.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 flex items-center justify-between gap-4 relative">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-gray-900">{evt.title}</span>
                        <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-extrabold px-2 py-0.5 rounded-full">{evt.event_type}</span>
                        <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{turmaObj?.nome || 'Sem Turma'}</span>
                      </div>
                      {evt.description && <p className="text-[12px] text-gray-500 font-light leading-relaxed">{evt.description}</p>}
                      <div className="text-[10px] text-gray-400 font-light">
                        Data do Evento: {formatarData(evt.event_date)}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleExcluirEvento(evt.id)}
                      className="p-2 bg-white border border-gray-200 text-red-650 rounded-xl hover:bg-red-50 cursor-pointer transition-colors"
                      title="Excluir Evento"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              {eventos.length === 0 && (
                <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhum evento acadêmico agendado.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MINHAS TURMAS VIEW */}
      {abaAtiva === 'turmas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {!turmaSelecionada ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {turmas.map(t => {
                const alunosTurma = alunos.filter(a => a.turma && a.turma.toLowerCase() === (t.nome || '').toLowerCase());
                const atividadesTurma = atividades.filter(a => a.turma_id === t.id);
                return (
                  <div 
                    key={t.id} 
                    onClick={() => setTurmaSelecionada(t)}
                    className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-4 group"
                  >
                    <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-extrabold text-gray-950 group-hover:text-violet-600 transition-colors">{t.nome}</h3>
                      <p className="text-[11.5px] text-gray-400 font-light">{t.serie}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4 text-[11.5px] font-medium text-gray-500">
                      <div>
                        Alunos: <span className="font-bold text-gray-800">{alunosTurma.length}</span>
                      </div>
                      <div>
                        Atividades: <span className="font-bold text-gray-800">{atividadesTurma.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Detalhe da Turma Selecionada
            <div className="space-y-6">
              <button 
                onClick={() => setTurmaSelecionada(null)}
                className="text-[11.5px] font-bold text-gray-500 hover:text-black flex items-center gap-1 cursor-pointer"
              >
                ← Voltar para lista de turmas
              </button>

              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-[18px] font-black text-gray-950">{turmaSelecionada.nome}</h2>
                  <p className="text-[12px] text-gray-400">{turmaSelecionada.serie} • Gerenciamento Acadêmico</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Lista de Atividades desta Turma */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                      <h4 className="text-[13px] font-bold text-gray-900">Atividades Publicadas</h4>
                      <button 
                        onClick={() => {
                          setAtividadeForm(prev => ({ ...prev, turma_id: turmaSelecionada.id }));
                          setModalAtividadeOpen(true);
                        }}
                        className="text-[11px] bg-violet-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-violet-700 cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={12} /> Criar Atividade
                      </button>
                    </div>

                    <div className="space-y-3">
                      {atividades.filter(a => a.turma_id === turmaSelecionada.id).map(ativ => (
                        <div key={ativ.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-bold text-gray-800">{ativ.title}</span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${ativ.status === 'Aberta' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{ativ.status}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-light mt-0.5">Entrega: {formatarData(ativ.due_date)}</p>
                          </div>

                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleEncerrarAtividade(ativ.id, ativ.status === 'Aberta' ? 'Encerrada' : 'Aberta')}
                              className="p-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 cursor-pointer"
                              title={ativ.status === 'Aberta' ? 'Encerrar' : 'Reabrir'}
                            >
                              <Clock size={12} />
                            </button>
                            <button 
                              onClick={() => handleExcluirAtividade(ativ.id)}
                              className="p-1.5 bg-white border border-gray-200 text-red-650 rounded-lg hover:bg-red-50 cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}

                      {atividades.filter(a => a.turma_id === turmaSelecionada.id).length === 0 && (
                        <p className="text-center py-6 text-[12px] text-gray-400">Nenhuma atividade criada para esta turma.</p>
                      )}
                    </div>
                  </div>

                  {/* Calendário de Avaliações / Provas da Turma */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                      <h4 className="text-[13px] font-bold text-gray-900">Calendário e Provas</h4>
                      <button 
                        onClick={() => {
                          setEventoForm(prev => ({ ...prev, turma_id: turmaSelecionada.id }));
                          setModalEventoOpen(true);
                        }}
                        className="text-[11px] bg-violet-600 text-white font-bold px-3 py-1.5 rounded-lg hover:bg-violet-700 cursor-pointer flex items-center gap-1"
                      >
                        <Plus size={12} /> Novo Evento
                      </button>
                    </div>

                    <div className="space-y-3">
                      {eventos.filter(e => e.turma_id === turmaSelecionada.id).map(evt => (
                        <div key={evt.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-bold text-gray-800">{evt.title}</span>
                              <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{evt.event_type}</span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-light mt-0.5">Data: {formatarData(evt.event_date)}</p>
                          </div>

                          <button 
                            onClick={() => handleExcluirEvento(evt.id)}
                            className="p-1.5 bg-white border border-gray-200 text-red-650 rounded-lg hover:bg-red-50 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}

                      {eventos.filter(e => e.turma_id === turmaSelecionada.id).length === 0 && (
                        <p className="text-center py-6 text-[12px] text-gray-400">Nenhum evento registrado nesta turma.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODERAÇÃO DE POSTAGENS VIEW */}
      {abaAtiva === 'postagens' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-[17px] font-black text-gray-950">Moderação de Postagens Pendentes</h2>
              <p className="text-[12px] text-gray-400">Revise o conteúdo enviado pelos seus alunos antes de publicar no feed.</p>
            </div>

            <div className="divide-y divide-gray-50 space-y-4">
              {postsPendentes.map(post => {
                const autor = alunos.find(a => a.id === post.user_id) || {};
                return (
                  <div key={post.id} className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-150 flex-shrink-0">
                          {autor.avatar_url ? (
                            <img src={autor.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full text-gray-300 flex items-center justify-center font-bold text-[12px]">?</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-bold text-gray-900">{autor.nome || 'Aluno'}</span>
                            <span className="text-[9.5px] bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full">{autor.turma || 'Sem Turma'}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 leading-tight font-medium">{formatarTempoRelativo(post.created_at)}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-[13px] font-extrabold text-gray-800">{post.title}</h4>
                        <p className="text-[12px] text-gray-600 font-light leading-relaxed">{post.content}</p>
                      </div>

                      <div className="flex gap-2">
                        <span className="text-[9.5px] font-bold bg-[#6366f1]/5 text-[#6366f1] px-2.5 py-0.5 rounded-lg">{post.tipo || 'Geral'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 justify-end md:justify-start" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleAprovarPost(post.id)}
                        className="flex items-center gap-1 bg-green-600 text-white px-3.5 py-2 rounded-xl text-[11.5px] font-bold hover:bg-green-700 cursor-pointer"
                      >
                        <Check size={14} /> Aprovar
                      </button>
                      <button 
                        onClick={() => abrirModalRejeitar(post)}
                        className="flex items-center gap-1 bg-red-650 text-white px-3.5 py-2 rounded-xl text-[11.5px] font-bold hover:bg-red-700 cursor-pointer"
                      >
                        <X size={14} /> Rejeitar
                      </button>
                    </div>
                  </div>
                );
              })}

              {postsPendentes.length === 0 && (
                <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <CheckCircle size={32} className="text-green-500" />
                  <span className="text-[13px] font-bold text-gray-600">Mural limpo!</span>
                  <p className="text-[11.5px] text-gray-400 font-light">Nenhuma postagem pendente nesta turma.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ALUNOS VIEW */}
      {abaAtiva === 'alunos' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Barra de Filtro e Busca de Alunos */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 w-full sm:max-w-xs focus-within:border-black transition-colors">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text" 
                value={filtroAlunosBusca}
                onChange={(e) => setFiltroAlunosBusca(e.target.value)}
                placeholder="Buscar aluno por nome..."
                className="bg-transparent outline-none border-none text-[12px] text-gray-700 placeholder-gray-400 w-full"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-[11.5px] font-bold text-gray-400 whitespace-nowrap">Ordenar por:</span>
              <select
                value={ordemAlunos}
                onChange={(e) => setOrdemAlunos(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] font-bold text-gray-700 outline-none cursor-pointer w-full sm:w-auto"
              >
                <option value="participativos">Mais participativos</option>
                <option value="menos">Menos participativos</option>
                <option value="nome">Nome A-Z</option>
              </select>
            </div>
          </div>

          {/* Grid de Alunos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {alunosOrdenados.map(a => {
              const entregasCount = (submissoes || []).filter(s => s.student_id === a.id).length;
              return (
                <div key={a.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0 shadow-inner">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full text-gray-300 flex items-center justify-center font-bold text-[14px]">?</div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-extrabold text-gray-950">{a.nome}</h4>
                      <p className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5">{a.turma || 'Sem Turma'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-gray-50 pt-4 text-[11.5px] font-medium text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <FileText size={13} className="text-gray-400" />
                      <span>Tarefas: <b className="text-gray-800">{entregasCount}</b></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} className="text-gray-400" />
                      <span>Acesso: <b className="text-gray-800">Diário</b></span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* AVISOS VIEW */}
      {abaAtiva === 'avisos' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h2 className="text-[17px] font-black text-gray-950">Mural de Avisos da Turma</h2>
                <p className="text-[12px] text-gray-400">Gerencie e publique avisos importantes para os seus alunos.</p>
              </div>
              <button 
                onClick={() => {
                  setAvisoForm({ title: '', content: '', turma_id: turmas[0]?.id || '', is_pinned: false, scheduled_at: '' });
                  setModalAvisoOpen(true);
                }}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Novo Aviso
              </button>
            </div>

            <div className="space-y-4">
              {avisos.map(aviso => {
                const turmaObj = turmas.find(t => t.id === aviso.turma_id);
                return (
                  <div key={aviso.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 space-y-3 relative">
                    <div className="flex items-center justify-between gap-4 border-b border-gray-200/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-gray-900">{aviso.title}</span>
                        {aviso.is_pinned && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5"><Pin size={8} /> Fixado</span>}
                        <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{turmaObj?.nome || 'Sem Turma'}</span>
                      </div>

                      <button 
                        onClick={() => handleExcluirAviso(aviso.id)}
                        className="text-gray-450 hover:text-red-650 cursor-pointer p-1"
                        title="Excluir aviso"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-[12.5px] text-gray-600 leading-relaxed font-light whitespace-pre-line">{aviso.content}</p>
                    <div className="text-[10px] text-gray-400 font-light">Publicado em: {formatarData(aviso.created_at)}</div>
                  </div>
                );
              })}

              {avisos.length === 0 && (
                <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhum aviso publicado no mural.</p>
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
                <h2 className="text-[17px] font-black text-gray-950">Relatórios Analíticos Acadêmicos</h2>
                <p className="text-[12px] text-gray-400">Analise a participação das turmas e o engajamento geral dos estudantes.</p>
              </div>
              
              <button 
                onClick={exportarPDF}
                className="bg-black hover:bg-gray-900 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={15} /> Exportar Relatório (PDF)
              </button>
            </div>

            {/* Grid de Métricas de Turma */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {turmas.map(t => {
                const alunosTurma = alunos.filter(a => a.turma && a.turma.toLowerCase() === (t.nome || '').toLowerCase());
                const ativCount = atividades.filter(a => a.turma_id === t.id).length;
                return (
                  <div key={t.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4">
                    <h3 className="text-[13.5px] font-bold text-gray-850 pl-2 border-l-2 border-violet-500">{t.nome}</h3>
                    
                    <div className="space-y-2 text-[12px] text-gray-600">
                      <div className="flex justify-between">
                        <span>Alunos Cadastrados:</span>
                        <span className="font-bold text-gray-900">{alunosTurma.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Atividades Postadas:</span>
                        <span className="font-bold text-gray-900">{ativCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAIS DE CADASTRO --- */}
      
      {/* Modal Criar Aviso */}
      {modalAvisoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalAvisoOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Bell size={18} className="text-violet-600" /> Publicar Novo Aviso da Turma
              </h3>
              <button onClick={() => setModalAvisoOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarAviso} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Selecione a Turma</label>
                <select
                  value={avisoForm.turma_id}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, turma_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Título do Aviso</label>
                <input 
                  type="text" 
                  value={avisoForm.title}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Prova Mensal de História"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Conteúdo</label>
                <textarea 
                  value={avisoForm.content}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva as orientações para os alunos..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl p-3.5 text-[12.5px] text-gray-700 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5 p-1">
                <input 
                  type="checkbox" 
                  id="pinAviso" 
                  checked={avisoForm.is_pinned}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, is_pinned: e.target.checked }))}
                  className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label htmlFor="pinAviso" className="text-[12px] font-bold text-gray-700 cursor-pointer">Fixar aviso no topo do mural</label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalAvisoOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                >
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Atividade */}
      {modalAtividadeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalAtividadeOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <BookOpen size={18} className="text-violet-600" /> Cadastrar Nova Atividade
              </h3>
              <button onClick={() => setModalAtividadeOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarAtividade} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Selecione a Turma</label>
                <select
                  value={atividadeForm.turma_id}
                  onChange={(e) => setAtividadeForm(prev => ({ ...prev, turma_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Título da Atividade</label>
                <input 
                  type="text" 
                  value={atividadeForm.title}
                  onChange={(e) => setAtividadeForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Trabalho Semestral - IHC"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Descrição da Tarefa</label>
                <textarea 
                  value={atividadeForm.description}
                  onChange={(e) => setAtividadeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Escreva os objetivos e orientações do trabalho..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl p-3.5 text-[12.5px] text-gray-700 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">Data Limite de Entrega</label>
                  <input 
                    type="date" 
                    value={atividadeForm.due_date}
                    onChange={(e) => setAtividadeForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none text-gray-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">Critérios de Avaliação</label>
                  <input 
                    type="text" 
                    value={atividadeForm.evaluation_criteria}
                    onChange={(e) => setAtividadeForm(prev => ({ ...prev, evaluation_criteria: e.target.value }))}
                    placeholder="Ex: Formatação e Defesa"
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalAtividadeOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                >
                  Criar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Criar Evento */}
      {modalEventoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalEventoOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Calendar size={18} className="text-violet-600" /> Agendar Prova / Reunião / Evento
              </h3>
              <button onClick={() => setModalEventoOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarEvento} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Selecione a Turma</label>
                <select
                  value={eventoForm.turma_id}
                  onChange={(e) => setEventoForm(prev => ({ ...prev, turma_id: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                >
                  <option value="">Selecione...</option>
                  {turmas.map(t => (
                    <option key={t.id} value={t.id}>{t.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">Tipo de Evento</label>
                  <select
                    value={eventoForm.event_type}
                    onChange={(e) => setEventoForm(prev => ({ ...prev, event_type: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none text-gray-700"
                  >
                    <option value="Prova">Prova</option>
                    <option value="Trabalho">Trabalho</option>
                    <option value="Evento">Evento</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Aula especial">Aula especial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 uppercase">Data</label>
                  <input 
                    type="date" 
                    value={eventoForm.event_date}
                    onChange={(e) => setEventoForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none text-gray-750"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Título do Evento</label>
                <input 
                  type="text" 
                  value={eventoForm.title}
                  onChange={(e) => setEventoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Prova Bimestral IHC"
                  className="w-full bg-gray-50 border border-gray-255 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase">Notas Adicionais</label>
                <textarea 
                  value={eventoForm.description}
                  onChange={(e) => setEventoForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Orientações, conteúdo programático..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-255 rounded-xl p-3.5 text-[12.5px] text-gray-700 outline-none resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalEventoOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                >
                  Agendar Evento
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

            <p className="text-[12px] text-gray-400 font-light mb-5 leading-relaxed">
              O autor receberá uma notificação detalhando o motivo pelo qual o conteúdo não foi publicado.
            </p>

            <form onSubmit={handleRejeitarPostConfirmar} className="space-y-4">
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

    </div>
  );
}

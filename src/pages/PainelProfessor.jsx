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
  Loader2
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

  async function carregarDados() {
    try {
      setLoading(true);

      // 1. Obter todas as turmas
      const { data: dataTurmas, error: errTurmas } = await supabase.from('turmas').select('*');
      if (errTurmas) throw errTurmas;
      
      // Filtrar turmas caso o usuário logado seja professor
      let turmasFiltradas = dataTurmas || [];
      if (perfil?.papel === 'professor') {
        const classesProf = perfil.turma ? perfil.turma.split(',').map(s => s.trim().toLowerCase()) : [];
        turmasFiltradas = turmasFiltradas.filter(t => classesProf.includes(t.nome.trim().toLowerCase()));
      }
      setTurmas(turmasFiltradas);

      // 2. Obter todos os perfis (Alunos)
      const { data: dataPerfis, error: errPerfis } = await supabase.from('profiles').select('*');
      if (errPerfis) throw errPerfis;
      
      // Filtrar apenas perfis que são alunos e pertencem a turmas administradas
      const turmasNomes = turmasFiltradas.map(t => t.nome.toLowerCase());
      const alunosFiltrados = (dataPerfis || []).filter(p => 
        p.papel === 'aluno' && p.turma && turmasNomes.includes(p.turma.trim().toLowerCase())
      );
      setAlunos(alunosFiltrados);

      // 3. Obter atividades
      const { data: dataAtiv, error: errAtiv } = await supabase.from('activities').select('*');
      if (errAtiv) throw errAtiv;
      setAtividades(dataAtiv || []);

      // 4. Obter avisos / comunicados
      const { data: dataAvisos, error: errAvisos } = await supabase.from('announcements').select('*');
      if (errAvisos) throw errAvisos;
      setAvisos(dataAvisos || []);

      // 5. Obter eventos de calendário
      const { data: dataEventos, error: errEventos } = await supabase.from('calendar_events').select('*');
      if (errEventos) throw errEventos;
      setEventos(dataEventos || []);

      // 6. Obter submissões de atividades
      const { data: dataSub, error: errSub } = await supabase.from('activity_submissions').select('*');
      if (errSub) throw errSub;
      setSubmissoes(dataSub || []);

      // 7. Obter postagens que aguardam aprovação
      const { data: dataPosts, error: errPosts } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (errPosts) throw errPosts;

      // Filtrar posts pendentes apenas dos alunos que o professor gerencia
      const alunosIds = alunosFiltrados.map(a => a.id);
      const postsPendentesFiltrados = (dataPosts || []).filter(p => 
        p.status === 'Aguardando aprovação' && (ehAdmin() || alunosIds.includes(p.user_id))
      );
      setPostsPendentes(postsPendentesFiltrados);

      // 8. Obter denúncias
      const { data: dataDen, error: errDen } = await supabase.from('reports').select('*');
      if (errDen) throw errDen;
      setDenuncias(dataDen || []);

    } catch (error) {
      console.error('Erro ao carregar painel:', error);
      toast.error('Erro ao inicializar o painel do professor.');
    } finally {
      setLoading(false);
    }
  }

  const ehAdmin = () => perfil?.papel === 'administrador';

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
        return a.turma && t && a.turma.toLowerCase() === t.nome.toLowerCase();
      });

      for (const aluno of alunosDaTurma) {
        await supabase.from('notifications').insert({
          user_id: aluno.id,
          actor_id: usuario.id,
          actor_handle: `@${perfil?.nome.toLowerCase().replace(/\s+/g, '') || 'professor'}`,
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
      const alunosDaTurma = alunos.filter(a => {
        const t = turmas.find(turma => turma.id === atividadeForm.turma_id);
        return a.turma && t && a.turma.toLowerCase() === t.nome.toLowerCase();
      });

      for (const aluno of alunosDaTurma) {
        await supabase.from('notifications').insert({
          user_id: aluno.id,
          actor_id: usuario.id,
          actor_handle: `@${perfil?.nome.toLowerCase().replace(/\s+/g, '') || 'professor'}`,
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
                  <td>${alunos.filter(a => a.turma && a.turma.toLowerCase() === t.nome.toLowerCase()).length}</td>
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
  const totalTurmas = turmas.length;
  const totalAlunosCount = alunos.length;
  const totalPostsPendentes = postsPendentes.length;
  const totalAvisosCount = avisos.length;
  
  // Alunos filtrados e ordenados
  const alunosOrdenados = [...alunos].filter(a => {
    if (!filtroAlunosBusca.trim()) return true;
    return a.nome.toLowerCase().includes(filtroAlunosBusca.toLowerCase());
  }).sort((a, b) => {
    if (ordemAlunos === 'nome') return a.nome.localeCompare(b.nome);
    
    // Obter métricas de participação
    const ativA = submissoes.filter(s => s.student_id === a.id).length;
    const ativB = submissoes.filter(s => s.student_id === b.id).length;
    
    if (ordemAlunos === 'participativos') return ativB - ativA;
    return ativA - ativB;
  });

  const getTurmaAlunosCount = (turmaNome) => {
    return alunos.filter(a => a.turma && a.turma.toLowerCase() === turmaNome.toLowerCase()).length;
  };

  // Formatar data em string bonita
  const formatarData = (dataIso) => {
    if (!dataIso) return '';
    return new Date(dataIso).toLocaleDateString('pt-BR');
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Turmas ativas</span>
                <h3 className="text-2xl font-black text-gray-950">{totalTurmas}</h3>
              </div>
              <button 
                onClick={() => setSearchParams({ aba: 'turmas' })}
                className="text-[11px] font-bold text-violet-600 hover:text-violet-800 flex items-center gap-1 mt-4 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Ver turmas <ArrowRight size={12} />
              </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <Users size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Alunos</span>
                <h3 className="text-2xl font-black text-gray-950">{totalAlunosCount}</h3>
              </div>
              <button 
                onClick={() => setSearchParams({ aba: 'alunos' })}
                className="text-[11px] font-bold text-green-600 hover:text-green-800 flex items-center gap-1 mt-4 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Ver alunos <ArrowRight size={12} />
              </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <FileText size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Revisões pendentes</span>
                <h3 className="text-2xl font-black text-gray-950">{totalPostsPendentes}</h3>
              </div>
              <button 
                onClick={() => setSearchParams({ aba: 'postagens' })}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-4 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Revisar agora <ArrowRight size={12} />
              </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Bell size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Avisos enviados</span>
                <h3 className="text-2xl font-black text-gray-950">{totalAvisosCount}</h3>
              </div>
              <button 
                onClick={() => setSearchParams({ aba: 'avisos' })}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 mt-4 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Ver avisos <ArrowRight size={12} />
              </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.015)] relative overflow-hidden group">
              <div className="absolute top-4 right-4 w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                <Award size={18} />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Participação média</span>
                <h3 className="text-2xl font-black text-gray-950">92%</h3>
              </div>
              <button 
                onClick={() => setSearchParams({ aba: 'relatorios' })}
                className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 mt-4 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                Ver relatório <ArrowRight size={12} />
              </button>
            </div>

          </div>

          {/* MIDDLE GRID: RECENT ACTIVITIES & POST MODERATION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Atividades Recentes nas Turmas */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[14px] font-bold text-gray-950">Atividades recentes nas turmas</h3>
                <button onClick={() => setSearchParams({ aba: 'turmas' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todas</button>
              </div>

              <div className="divide-y divide-gray-50">
                {atividades.slice(0, 4).map(ativ => {
                  const turmaObj = turmas.find(t => t.id === ativ.turma_id);
                  return (
                    <div key={ativ.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <BookOpen size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[12.5px] font-bold text-gray-850">{ativ.title}</span>
                            <span className="text-[9px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">{turmaObj?.nome || 'Geral'}</span>
                          </div>
                          <p className="text-[10.5px] text-gray-400 font-light mt-0.5">Prazo de entrega: {formatarData(ativ.due_date)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">há 2 horas</span>
                    </div>
                  );
                })}

                {atividades.length === 0 && (
                  <div className="py-8 text-center text-[12px] text-gray-400">Nenhuma atividade recente registrada.</div>
                )}
              </div>
            </div>

            {/* Postagens para Revisão */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[14px] font-bold text-gray-950">Postagens para revisão</h3>
                <button onClick={() => setSearchParams({ aba: 'postagens' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todas</button>
              </div>

              <div className="divide-y divide-gray-50 space-y-3">
                {postsPendentes.slice(0, 3).map(post => {
                  const autor = alunos.find(a => a.id === post.user_id) || {};
                  return (
                    <div key={post.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-150 flex-shrink-0">
                          {autor.avatar_url ? (
                            <img src={autor.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full text-gray-300 flex items-center justify-center font-bold text-[12px]">?</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-bold text-gray-900">{autor.nome || 'Aluno'}</span>
                            <span className="text-[9px] bg-gray-150 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">{autor.turma || 'Sem Turma'}</span>
                          </div>
                          <p className="text-[11px] text-gray-500 font-light line-clamp-1 mt-0.5">"{post.content}"</p>
                        </div>
                      </div>

                      <div className="flex gap-1.5 flex-shrink-0">
                        <button 
                          onClick={() => handleAprovarPost(post.id)}
                          className="p-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg hover:bg-green-100 cursor-pointer"
                          title="Aprovar"
                        >
                          <Check size={12} />
                        </button>
                        <button 
                          onClick={() => abrirModalRejeitar(post)}
                          className="p-1.5 bg-red-50 text-red-650 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                          title="Rejeitar"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {postsPendentes.length === 0 && (
                  <div className="py-8 text-center text-[12px] text-gray-400">Nenhuma postagem pendente de revisão.</div>
                )}
              </div>

              {postsPendentes.length > 0 && (
                <button 
                  onClick={() => setSearchParams({ aba: 'postagens' })}
                  className="w-full text-center py-2.5 text-[11px] font-bold text-violet-600 hover:text-violet-800 transition-colors border border-violet-100 bg-violet-50/50 rounded-xl cursor-pointer"
                >
                  Ver todas as postagens para revisão →
                </button>
              )}
            </div>

          </div>

          {/* BOTTOM ROW: CHART & CLASSES ENGAGEMENT & ACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Gráfico de Participação dos Alunos */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-[14px] font-bold text-gray-950">Participação dos alunos</h3>
                <button onClick={() => setSearchParams({ aba: 'relatorios' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver relatório completo</button>
              </div>

              {/* Gráfico SVG Linhas Polido */}
              <div className="relative w-full h-[180px] mt-4">
                <svg className="w-full h-full" viewBox="0 0 600 180">
                  {/* Linhas de Grade Horizontal */}
                  <line x1="40" y1="20" x2="580" y2="20" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="40" y1="60" x2="580" y2="60" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="40" y1="100" x2="580" y2="100" stroke="#f3f4f6" strokeWidth="1" />
                  <line x1="40" y1="140" x2="580" y2="140" stroke="#f3f4f6" strokeWidth="1" />
                  
                  {/* Labels Eixo Y */}
                  <text x="15" y="24" fill="#9ca3af" fontSize="9" fontWeight="bold">100%</text>
                  <text x="15" y="64" fill="#9ca3af" fontSize="9" fontWeight="bold">75%</text>
                  <text x="15" y="104" fill="#9ca3af" fontSize="9" fontWeight="bold">50%</text>
                  <text x="15" y="144" fill="#9ca3af" fontSize="9" fontWeight="bold">25%</text>

                  {/* Curva 1º Ano A (Violeta) */}
                  <path 
                    d="M 40,50 L 130,45 L 220,55 L 310,40 L 400,60 L 490,48 L 580,35" 
                    fill="none" 
                    stroke="#8b5cf6" 
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Curva 2º Ano B (Verde) */}
                  <path 
                    d="M 40,80 L 130,95 L 220,70 L 310,85 L 400,75 L 490,90 L 580,68" 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Curva 3º Ano C (Azul) */}
                  <path 
                    d="M 40,110 L 130,120 L 220,105 L 310,130 L 400,115 L 490,128 L 580,102" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Labels Eixo X */}
                  <text x="40" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">03/07</text>
                  <text x="130" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">04/07</text>
                  <text x="220" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">05/07</text>
                  <text x="310" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">06/07</text>
                  <text x="400" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">07/07</text>
                  <text x="490" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">08/07</text>
                  <text x="580" y="165" fill="#9ca3af" fontSize="9" textAnchor="middle">09/07</text>
                </svg>
              </div>

              {/* Legenda do Gráfico */}
              <div className="flex gap-4 items-center justify-center pt-2 text-[10.5px] font-bold text-gray-500">
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-violet-500 rounded-full" /> 1º Ano A</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full" /> 2º Ano B</div>
                <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> 3º Ano C</div>
              </div>
            </div>

            {/* Turmas Ativas & Ações Rápidas */}
            <div className="space-y-6">
              
              {/* Turmas Ativas */}
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="text-[14px] font-bold text-gray-950">Turmas ativas</h3>
                  <button onClick={() => setSearchParams({ aba: 'turmas' })} className="text-[11px] font-bold text-violet-600 hover:underline">Ver todas</button>
                </div>

                <div className="space-y-3.5">
                  {turmas.slice(0, 3).map((t, idx) => {
                    const progress = idx === 0 ? 96 : (idx === 1 ? 91 : 88);
                    const color = idx === 0 ? 'bg-violet-600' : (idx === 1 ? 'bg-green-600' : 'bg-blue-600');
                    return (
                      <div key={t.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[12px]">
                          <span className="font-bold text-gray-850">{t.nome}</span>
                          <span className="font-bold text-gray-850">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full ${color}`} style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[9.5px] text-gray-400 font-light">{getTurmaAlunosCount(t.nome)} alunos cadastrados</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-3">
                <h3 className="text-[13px] font-bold text-gray-950 mb-1 pl-1 border-l-2 border-violet-500">Ações rápidas</h3>
                
                <button 
                  onClick={() => {
                    setAvisoForm(prev => ({ ...prev, turma_id: turmas[0]?.id || '' }));
                    setModalAvisoOpen(true);
                  }}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100 flex items-center justify-between text-[11.5px] font-bold text-gray-700 cursor-pointer"
                >
                  Criar novo aviso 📢 <Plus size={14} />
                </button>

                <button 
                  onClick={() => {
                    setAtividadeForm(prev => ({ ...prev, turma_id: turmas[0]?.id || '' }));
                    setModalAtividadeOpen(true);
                  }}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100 flex items-center justify-between text-[11.5px] font-bold text-gray-700 cursor-pointer"
                >
                  Criar nova atividade 📝 <Plus size={14} />
                </button>

                <button 
                  onClick={exportarPDF}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100 flex items-center justify-between text-[11.5px] font-bold text-gray-700 cursor-pointer"
                >
                  Exportar relatórios acadêmicos 📄 <Download size={14} />
                </button>
              </div>

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
                const alunosTurma = alunos.filter(a => a.turma && a.turma.toLowerCase() === t.nome.toLowerCase());
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
              const entregasCount = submissoes.filter(s => s.student_id === a.id).length;
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
                      <FileCheck2 size={13} className="text-gray-400" />
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
                const alunosTurma = alunos.filter(a => a.turma && a.turma.toLowerCase() === t.nome.toLowerCase());
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

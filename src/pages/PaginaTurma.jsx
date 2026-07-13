import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Bell, 
  Paperclip, 
  Search, 
  Plus, 
  Send, 
  Trash2, 
  Download, 
  Clock, 
  UserCheck, 
  AlertTriangle,
  Loader2,
  X,
  File,
  Image as ImageIcon,
  Video,
  FileSpreadsheet,
  FileCheck2,
  MessageCircle,
  ThumbsUp,
  Share2
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function PaginaTurma() {
  const { id: turmaId } = useParams();
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();

  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [turma, setTurma] = useState(null);
  const [professores, setProfessores] = useState([]);
  const [alunos, setAlunos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [avisos, setAvisos] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [arquivos, setArquivos] = useState([]);
  const [mensagensChat, setMensagensChat] = useState([]);
  
  // Abas
  const [abaAtiva, setAbaAtiva] = useState('feed'); // 'feed', 'avisos', 'atividades', 'arquivos', 'chat', 'participantes', 'calendario'
  
  // Estados de Formulários e Envios
  const [novoPostContent, setNovoPostContent] = useState('');
  const [novoPostTitle, setNovoPostTitle] = useState('');
  const [tipoPost, setTipoPost] = useState('Geral');
  
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef(null);

  // Modais de Criação
  const [modalAvisoOpen, setModalAvisoOpen] = useState(false);
  const [modalAtividadeOpen, setModalAtividadeOpen] = useState(false);
  const [modalEventoOpen, setModalEventoOpen] = useState(false);
  const [modalArquivoOpen, setModalArquivoOpen] = useState(false);

  // Form de Aviso
  const [avisoForm, setAvisoForm] = useState({ title: '', content: '', is_pinned: false });
  // Form de Atividade
  const [atividadeForm, setAtividadeForm] = useState({ title: '', description: '', due_date: '', evaluation_criteria: '' });
  // Form de Evento
  const [eventoForm, setEventoForm] = useState({ title: '', description: '', event_type: 'Prova', event_date: '' });
  // Form de Arquivo
  const [arquivoForm, setArquivoForm] = useState({ filename: '', file_url: '', category: 'PDFs' });

  // Filtros
  const [buscaParticipante, setBuscaParticipante] = useState('');
  const [buscaArquivo, setBuscaArquivo] = useState('');
  const [categoriaArquivo, setCategoriaArquivo] = useState('');

  useEffect(() => {
    if (!usuario || !perfil) return;
    carregarDadosTurma();
  }, [turmaId, usuario, perfil]);

  useEffect(() => {
    if (abaAtiva === 'chat') {
      scrollToBottom();
    }
  }, [mensagensChat, abaAtiva]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  async function carregarDadosTurma() {
    try {
      setLoading(true);

      const [
        { data: dataTurma, error: errT },
        { data: dataTP },
        { data: dataProfiles },
        { data: dataMat },
        { data: dataAvisos },
        { data: dataAtiv },
        { data: dataEvt },
        { data: dataArq },
        resChat,
        { data: dataPosts }
      ] = await Promise.all([
        supabase.from('turmas').select('*').eq('id', turmaId).single(),
        supabase.from('turma_professores').select('professor_id').eq('turma_id', turmaId),
        supabase.from('profiles').select('*'),
        supabase.from('matriculas').select('aluno_id').eq('turma_id', turmaId),
        supabase.from('announcements').select('*').eq('turma_id', turmaId).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('activities').select('*').eq('turma_id', turmaId).order('due_date'),
        supabase.from('calendar_events').select('*').eq('turma_id', turmaId).order('event_date'),
        supabase.from('turma_arquivos').select('*').eq('turma_id', turmaId).order('uploaded_at', { ascending: false }),
        supabase.from('turma_messages').select('*').eq('turma_id', turmaId).order('created_at').catch(() => ({ data: [] })),
        supabase.from('posts').select('*').order('created_at', { ascending: false })
      ]);

      if (errT) throw errT;
      setTurma(dataTurma);

      // Verificar segurança: Aluno só pode ver sua turma
      if (perfil?.papel === 'aluno' && (perfil.turma || '').toLowerCase() !== dataTurma.nome.toLowerCase()) {
        toast.error('Você não tem permissão para acessar esta turma.');
        navigate('/turmas');
        return;
      }

      // 2. Obter professores vinculados a essa turma
      const profIds = dataTP ? dataTP.map(tp => tp.professor_id) : [];
      if (dataProfiles) {
        setProfessores(dataProfiles.filter(p => profIds.includes(p.id) || (p.papel === 'professor' && (p.turma || '').toLowerCase().includes(dataTurma.nome.toLowerCase()))));
        // Alunos matriculados
        const alunoIds = dataMat ? dataMat.map(m => m.aluno_id) : [];
        setAlunos(dataProfiles.filter(p => alunoIds.includes(p.id) || (p.papel === 'aluno' && (p.turma || '').toLowerCase() === dataTurma.nome.toLowerCase())));
      }

      // 3. Obter avisos da turma
      setAvisos(dataAvisos || []);

      // 4. Obter atividades
      setAtividades(dataAtiv || []);

      // 5. Obter eventos
      setEventos(dataEvt || []);

      // 6. Obter arquivos
      setArquivos(dataArq || []);

      // 7. Obter mensagens do chat
      setMensagensChat(resChat?.data || []);

      // 8. Obter posts aprovados de alunos desta turma + posts de professores/admin
      if (dataProfiles && dataTurma) {
        const turmaAlunosIds = dataProfiles.filter(p => (p.turma || '').toLowerCase() === dataTurma.nome.toLowerCase()).map(p => p.id);
        if (dataPosts) {
          const postsFiltrados = dataPosts.filter(p => 
            p.status === 'Aprovada' && (turmaAlunosIds.includes(p.user_id) || p.user_id === usuario?.id)
          );
          setPosts(postsFiltrados);
        }
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir turma.');
    } finally {
      setLoading(false);
    }
  }

  const ehAdmin = () => perfil?.papel === 'professor' || perfil?.papel === 'administrador';
  const ehProfessor = () => perfil?.papel === 'professor' && (professores.some(p => p.id === usuario?.id) || ehAdmin());

  // --- POSTS ---
  const handleCriarPost = async (e) => {
    e.preventDefault();
    if (!novoPostContent.trim()) return;

    try {
      // Alunos precisam de aprovação, professores publicam direto
      const statusInicial = (ehAdmin() || ehProfessor()) ? 'Aprovada' : 'Aguardando aprovação';

      const { error } = await supabase.from('posts').insert({
        title: novoPostTitle.trim() || 'Publicação',
        content: novoPostContent.trim(),
        user_id: usuario.id,
        status: statusInicial,
        tipo: tipoPost
      });

      if (error) throw error;

      if (statusInicial === 'Aprovada') {
        toast.success('Postagem compartilhada no feed!');
      } else {
        toast.info('Postagem enviada para aprovação do professor. 🕒');
      }

      setNovoPostTitle('');
      setNovoPostContent('');
      carregarDadosTurma();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao postar.');
    }
  };

  // --- AVISOS ---
  const handleCriarAviso = async (e) => {
    e.preventDefault();
    if (!avisoForm.title.trim() || !avisoForm.content.trim()) return;

    try {
      const { error } = await supabase.from('announcements').insert({
        title: avisoForm.title.trim(),
        content: avisoForm.content.trim(),
        turma_id: turmaId,
        professor_id: usuario.id,
        is_pinned: avisoForm.is_pinned
      });

      if (error) throw error;

      toast.success('Aviso publicado no mural! 📢');
      setModalAvisoOpen(false);
      setAvisoForm({ title: '', content: '', is_pinned: false });
      carregarDadosTurma();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao postar aviso.');
    }
  };

  // --- ATIVIDADES ---
  const handleCriarAtividade = async (e) => {
    e.preventDefault();
    if (!atividadeForm.title.trim() || !atividadeForm.due_date) return;

    try {
      const { error } = await supabase.from('activities').insert({
        title: atividadeForm.title.trim(),
        description: atividadeForm.description.trim(),
        due_date: new Date(atividadeForm.due_date).toISOString(),
        turma_id: turmaId,
        professor_id: usuario.id,
        evaluation_criteria: atividadeForm.evaluation_criteria.trim(),
        status: 'Aberta'
      });

      if (error) throw error;

      toast.success('Atividade agendada com sucesso! 📝');
      setModalAtividadeOpen(false);
      setAtividadeForm({ title: '', description: '', due_date: '', evaluation_criteria: '' });
      carregarDadosTurma();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao cadastrar atividade.');
    }
  };

  // --- ARQUIVOS ---
  const handleUploadArquivo = async (e) => {
    e.preventDefault();
    if (!arquivoForm.filename.trim() || !arquivoForm.file_url.trim()) return;

    try {
      const { error } = await supabase.from('turma_arquivos').insert({
        turma_id: turmaId,
        user_id: usuario.id,
        filename: arquivoForm.filename.trim(),
        file_url: arquivoForm.file_url.trim(),
        category: arquivoForm.category
      });

      if (error) throw error;

      toast.success('Arquivo compartilhado! 📁');
      setModalArquivoOpen(false);
      setArquivoForm({ filename: '', file_url: '', category: 'PDFs' });
      carregarDadosTurma();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao compartilhar arquivo.');
    }
  };

  // --- EVENTOS ---
  const handleCriarEvento = async (e) => {
    e.preventDefault();
    if (!eventoForm.title.trim() || !eventoForm.event_date) return;

    try {
      const { error } = await supabase.from('calendar_events').insert({
        title: eventoForm.title.trim(),
        description: eventoForm.description.trim(),
        event_type: eventoForm.event_type,
        event_date: new Date(eventoForm.event_date).toISOString(),
        turma_id: turmaId,
        professor_id: usuario.id
      });

      if (error) throw error;

      toast.success('Evento agendado no calendário!');
      setModalEventoOpen(false);
      setEventoForm({ title: '', description: '', event_type: 'Prova', event_date: '' });
      carregarDadosTurma();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao agendar evento.');
    }
  };

  // --- CHAT DA TURMA ---
  const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    try {
      // Criar a mensagem (adiciona à tabela custom se existir, senão manter local para demo)
      const { error } = await supabase.from('turma_messages').insert({
        turma_id: turmaId,
        user_id: usuario.id,
        message: chatMessage.trim()
      });

      if (error) {
        // Fallback local caso tabela não exista
        const fallbackMsg = {
          id: Math.random().toString(),
          turma_id: turmaId,
          user_id: usuario.id,
          message: chatMessage.trim(),
          created_at: new Date().toISOString()
        };
        setMensagensChat(prev => [...prev, fallbackMsg]);
      }

      setChatMessage('');
      carregarDadosTurma();
    } catch (err) {
      console.error(err);
    }
  };

  // --- AUXILIARES ---
  const formatarTempoRelativo = (dataIso) => {
    if (!dataIso) return '';
    const diff = (new Date() - new Date(dataIso)) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} horas`;
    return `há ${Math.floor(diff / 86400)} dias`;
  };

  const getAutorNome = (userId) => {
    const p = professores.find(prof => prof.id === userId) || alunos.find(al => al.id === userId) || {};
    return p.nome || 'Usuário';
  };

  const getAutorAvatar = (userId) => {
    const p = professores.find(prof => prof.id === userId) || alunos.find(al => al.id === userId) || {};
    return p.avatar_url;
  };

  // Filtragens
  const participantesFiltrados = [...professores, ...alunos].filter(p => {
    if (!buscaParticipante.trim()) return true;
    return p.nome.toLowerCase().includes(buscaParticipante.toLowerCase());
  });

  const arquivosFiltrados = arquivos.filter(a => {
    const bateBusca = !buscaArquivo.trim() || a.filename.toLowerCase().includes(buscaArquivo.toLowerCase());
    const bateCat = !categoriaArquivo || a.category === categoriaArquivo;
    return bateBusca && bateCat;
  });

  if (loading || !turma) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando detalhes da turma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER DE CABEÇALHO DA TURMA */}
      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-[1.2rem] flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
            <GraduationCap size={24} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-black text-gray-950 tracking-tight">{turma.nome}</h2>
              <span className="text-[9.5px] bg-violet-100 text-violet-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase">{turma.turno}</span>
            </div>
            <p className="text-[12.5px] text-gray-500 font-light">{turma.serie} • {turma.curso || 'Ensino Regular'} • Código da Turma: <span className="font-bold font-mono text-violet-600 select-all">{turma.codigo}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-[12px] font-medium text-gray-500">
          <div>
            <span className="text-gray-400">Professores</span>
            <p className="font-bold text-gray-800 mt-0.5">{professores.map(p => p.nome).join(', ') || 'Nenhum'}</p>
          </div>
          <div>
            <span className="text-gray-400">Total de alunos</span>
            <p className="font-bold text-gray-800 mt-0.5">{alunos.length} matriculados</p>
          </div>
        </div>
      </div>

      {/* ABAS DO MENU INTERNO */}
      <div className="flex border-b border-gray-100 overflow-x-auto gap-4 select-none scrollbar-none">
        {[
          { id: 'feed', label: 'Feed', icon: <FileText size={15} /> },
          { id: 'avisos', label: 'Avisos', icon: <Bell size={15} /> },
          { id: 'atividades', label: 'Atividades', icon: <BookOpen size={15} /> },
          { id: 'arquivos', label: 'Arquivos', icon: <Paperclip size={15} /> },
          { id: 'chat', label: 'Chat', icon: <MessageSquare size={15} /> },
          { id: 'participantes', label: 'Participantes', icon: <Users size={15} /> },
          { id: 'calendario', label: 'Calendário', icon: <Calendar size={15} /> }
        ].map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`pb-3 text-[12.5px] font-bold transition-all relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap px-1 ${abaAtiva === aba.id ? 'text-violet-600 font-black' : 'text-gray-400 hover:text-gray-850'}`}
          >
            {aba.icon}
            <span>{aba.label}</span>
            {abaAtiva === aba.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full animate-in fade-in duration-200" />}
          </button>
        ))}
      </div>

      {/* CONTEÚDO DAS ABAS */}
      
      {/* ABA: FEED */}
      {abaAtiva === 'feed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
          
          {/* Coluna Principal: Criar Post + Feed */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Escrever Publicação */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-bold text-gray-950 pl-1 border-l-2 border-violet-500">Nova Publicação no Feed da Turma</h3>
              
              <form onSubmit={handleCriarPost} className="space-y-3">
                <input 
                  type="text" 
                  value={novoPostTitle}
                  onChange={(e) => setNovoPostTitle(e.target.value)}
                  placeholder="Título do post (opcional)..."
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />

                <textarea
                  value={novoPostContent}
                  onChange={(e) => setNovoPostContent(e.target.value)}
                  placeholder="Escreva algo ou compartilhe uma dúvida com a turma..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl p-3.5 text-[12.5px] outline-none resize-none"
                />

                <div className="flex items-center justify-between gap-4 pt-1">
                  <select
                    value={tipoPost}
                    onChange={(e) => setTipoPost(e.target.value)}
                    className="bg-white border border-gray-250 rounded-xl px-3 py-1.5 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
                  >
                    <option value="Geral">Categoria: Geral</option>
                    <option value="Dúvida">Dúvida</option>
                    <option value="Projeto">Projeto</option>
                    <option value="Ideia">Ideia</option>
                    <option value="Material de estudo">Material</option>
                  </select>

                  <button
                    type="submit"
                    className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12px] px-5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    <Send size={13} /> Publicar
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Publicações */}
            <div className="space-y-4">
              {posts.map(post => (
                <div key={post.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border border-gray-150 flex-shrink-0 shadow-inner">
                        {getAutorAvatar(post.user_id) ? (
                          <img src={getAutorAvatar(post.user_id)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[12px] font-bold text-gray-400">{getAutorNome(post.user_id)[0]}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-[13px] font-extrabold text-gray-900 block">{getAutorNome(post.user_id)}</span>
                        <span className="text-[10px] text-gray-400 font-light leading-tight">{formatarTempoRelativo(post.created_at)}</span>
                      </div>
                    </div>

                    <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{post.tipo || 'Geral'}</span>
                  </div>

                  <div className="space-y-1 pl-1">
                    <h4 className="text-[13.5px] font-extrabold text-gray-900">{post.title}</h4>
                    <p className="text-[12.5px] text-gray-600 font-light leading-relaxed whitespace-pre-line">{post.content}</p>
                  </div>
                </div>
              ))}

              {posts.length === 0 && (
                <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhuma postagem publicada no feed desta turma.</p>
              )}
            </div>

          </div>

          {/* Coluna Direita: Próximos Avisos & Avisos Rápidos */}
          <div className="space-y-6">
            
            {/* Próximos Avisos */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2 flex items-center justify-between">
                Próximos avisos
                <span className="text-[10px] text-gray-400 font-light">Ver todos</span>
              </h3>

              <div className="space-y-3.5">
                {avisos.slice(0, 3).map(aviso => (
                  <div key={aviso.id} className="space-y-1.5 text-[11.5px]">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-850 block">{aviso.title}</span>
                      {aviso.is_pinned && <span className="text-[8px] bg-amber-50 text-amber-700 font-extrabold px-1 rounded-md">Fixado</span>}
                    </div>
                    <p className="text-gray-500 font-light line-clamp-2 leading-relaxed">"{aviso.content}"</p>
                  </div>
                ))}

                {avisos.length === 0 && (
                  <p className="text-center py-6 text-gray-400 font-light">Sem novos avisos no mural.</p>
                )}
              </div>
            </div>

            {/* Próximas Atividades */}
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Atividades da Turma</h3>
              
              <div className="space-y-3">
                {atividades.slice(0, 3).map(ativ => (
                  <div key={ativ.id} className="flex items-center justify-between gap-4 p-2 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-gray-850 block leading-tight">{ativ.title}</span>
                        <span className={`text-[8.5px] font-extrabold ${ativ.status === 'Aberta' ? 'text-green-600' : 'text-red-600'} block mt-0.5`}>{ativ.status}</span>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-gray-400 font-bold flex-shrink-0">{new Date(ativ.due_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}

                {atividades.length === 0 && (
                  <p className="text-center py-6 text-gray-400 font-light">Sem próximas atividades agendadas.</p>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ABA: AVISOS */}
      {abaAtiva === 'avisos' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-[16px] font-black text-gray-950">Mural de Avisos da Turma</h3>
              <p className="text-[12px] text-gray-400">Acompanhe comunicados emitidos por professores e coordenadores.</p>
            </div>

            {ehProfessor() && (
              <button
                onClick={() => setModalAvisoOpen(true)}
                className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Novo Aviso
              </button>
            )}
          </div>

          <div className="space-y-4">
            {avisos.map(aviso => (
              <div key={aviso.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 space-y-3 relative">
                <div className="flex items-center justify-between border-b border-gray-200/50 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-bold text-gray-900">{aviso.title}</span>
                    {aviso.is_pinned && <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-0.5">Fixado</span>}
                  </div>

                  {ehProfessor() && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('Excluir aviso?')) return;
                        await supabase.from('announcements').delete().eq('id', aviso.id);
                        carregarDadosTurma();
                      }}
                      className="text-gray-400 hover:text-red-650 cursor-pointer p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <p className="text-[12.5px] text-gray-600 font-light leading-relaxed whitespace-pre-line">{aviso.content}</p>
                <span className="text-[9.5px] text-gray-400 block">Enviado em: {new Date(aviso.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}

            {avisos.length === 0 && (
              <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhum aviso no mural desta turma.</p>
            )}
          </div>
        </div>
      )}

      {/* ABA: ATIVIDADES */}
      {abaAtiva === 'atividades' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-[16px] font-black text-gray-950">Atividades e Tarefas</h3>
              <p className="text-[12px] text-gray-400">Acompanhe seus prazos de entrega e critérios de notas.</p>
            </div>

            {ehProfessor() && (
              <button
                onClick={() => setModalAtividadeOpen(true)}
                className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Criar Atividade
              </button>
            )}
          </div>

          <div className="space-y-4">
            {atividades.map(ativ => (
              <div key={ativ.id} className="bg-gray-50 border border-gray-100 rounded-[1.8rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13.5px] font-bold text-gray-900">{ativ.title}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ativ.status === 'Aberta' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{ativ.status}</span>
                  </div>
                  <p className="text-[12.5px] text-gray-500 font-light">{ativ.description || 'Sem descrição cadastrada.'}</p>
                  {ativ.evaluation_criteria && <p className="text-[10px] text-violet-600 font-bold">Critério: {ativ.evaluation_criteria}</p>}
                </div>

                <div className="flex items-center gap-4 text-[11px] self-end md:self-auto flex-shrink-0">
                  <div className="text-right">
                    <span className="text-gray-400 block">Prazo final:</span>
                    <b className="text-gray-800 block mt-0.5">{new Date(ativ.due_date).toLocaleDateString('pt-BR')}</b>
                  </div>

                  {ehProfessor() && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('Excluir atividade?')) return;
                        await supabase.from('activities').delete().eq('id', ativ.id);
                        carregarDadosTurma();
                      }}
                      className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-xl cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {atividades.length === 0 && (
              <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhuma atividade registrada para esta turma.</p>
            )}
          </div>
        </div>
      )}

      {/* ABA: ARQUIVOS */}
      {abaAtiva === 'arquivos' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-[16px] font-black text-gray-950">Biblioteca de Arquivos Compartilhados</h3>
              <p className="text-[12px] text-gray-400">Baixe ou envie materiais de estudo, PDFs, apresentações e planos de ensino.</p>
            </div>

            <button
              onClick={() => setModalArquivoOpen(true)}
              className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={16} /> Compartilhar Arquivo
            </button>
          </div>

          {/* Filtros de Categoria */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 justify-between">
            <div className="flex items-center gap-2 bg-white border border-gray-250 rounded-xl px-3.5 py-1.5 w-full sm:max-w-xs focus-within:border-black transition-all">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text" 
                value={buscaArquivo}
                onChange={(e) => setBuscaArquivo(e.target.value)}
                placeholder="Pesquisar arquivos..."
                className="bg-transparent outline-none border-none text-[12px] text-gray-700 placeholder-gray-400 w-full"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {['PDFs', 'Imagens', 'Documentos', 'Planilhas', 'Apresentações', 'Vídeos'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoriaArquivo(prev => prev === cat ? '' : cat)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${categoriaArquivo === cat ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Arquivos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {arquivosFiltrados.map(arq => {
              const autorName = getAutorNome(arq.user_id);
              return (
                <div key={arq.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 space-y-4 relative flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-9 h-9 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center">
                      <File size={18} />
                    </div>
                    <div>
                      <h4 className="text-[12.5px] font-extrabold text-gray-900 truncate pr-6" title={arq.filename}>{arq.filename}</h4>
                      <p className="text-[9.5px] text-gray-400 font-light mt-0.5">Enviado por: {autorName}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-200/50 pt-3">
                    <span className="text-[10px] bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-md">{arq.category}</span>
                    <div className="flex items-center gap-1">
                      <a 
                        href={arq.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-1.5 bg-white border border-gray-200 rounded-lg text-gray-550 hover:bg-gray-100 cursor-pointer"
                        title="Download"
                      >
                        <Download size={12} />
                      </a>
                      
                      {(ehProfessor() || arq.user_id === usuario?.id) && (
                        <button
                          onClick={async () => {
                            if (!window.confirm('Excluir arquivo?')) return;
                            await supabase.from('turma_arquivos').delete().eq('id', arq.id);
                            carregarDadosTurma();
                          }}
                          className="p-1.5 bg-white border border-gray-200 rounded-lg text-red-650 hover:bg-red-50 cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {arquivosFiltrados.length === 0 && (
              <div className="col-span-full py-12 text-center text-gray-400 text-[12.5px]">Nenhum arquivo encontrado.</div>
            )}
          </div>
        </div>
      )}

      {/* ABA: CHAT */}
      {abaAtiva === 'chat' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[480px] justify-between animate-in fade-in duration-300">
          
          {/* Header do Chat */}
          <div className="border-b border-gray-100 pb-3 flex items-center gap-2">
            <MessageSquare size={16} className="text-violet-600" />
            <h3 className="text-[13.5px] font-bold text-gray-900">Mural de Conversação Real-Time</h3>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping ml-1" />
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 scrollbar-thin">
            {mensagensChat.map((msg) => {
              const isMe = msg.user_id === usuario?.id;
              const autorName = getAutorNome(msg.user_id);
              const avatar = getAutorAvatar(msg.user_id);
              return (
                <div key={msg.id} className={`flex gap-2.5 max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 mt-0.5 shadow-sm">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-gray-400">{autorName[0]}</div>
                    )}
                  </div>
                  <div className={`p-3.5 rounded-[1.4rem] text-[12px] shadow-[0_1px_5px_rgba(0,0,0,0.01)] ${isMe ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                    {!isMe && <span className="font-extrabold text-[10px] text-violet-700 block mb-0.5">{autorName}</span>}
                    <p className="font-light leading-relaxed">{msg.message}</p>
                    <span className={`text-[8.5px] font-light block mt-1 text-right ${isMe ? 'text-violet-100' : 'text-gray-400'}`}>{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Form Enviar Mensagem */}
          <form onSubmit={handleSendChatMessage} className="border-t border-gray-100 pt-3 flex gap-2.5 items-center">
            <input 
              type="text" 
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Digite sua mensagem para a turma..."
              className="flex-1 bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
            />
            <button 
              type="submit"
              className="bg-violet-650 hover:bg-violet-700 text-white p-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* ABA: PARTICIPANTES */}
      {abaAtiva === 'participantes' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-50 pb-4 gap-4">
            <div>
              <h3 className="text-[16px] font-black text-gray-950">Participantes da Classe</h3>
              <p className="text-[12px] text-gray-400">Visualize professores responsáveis e colegas matriculados.</p>
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-250 rounded-xl px-3.5 py-1.5 w-full sm:max-w-xs focus-within:border-black transition-all">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text" 
                value={buscaParticipante}
                onChange={(e) => setBuscaParticipante(e.target.value)}
                placeholder="Pesquisar participantes..."
                className="bg-transparent outline-none border-none text-[12px] text-gray-700 placeholder-gray-400 w-full"
              />
            </div>
          </div>

          <div className="space-y-6">
            
            {/* Professores */}
            <div className="space-y-3">
              <h4 className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider pl-1">Professores</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participantesFiltrados.filter(p => p.papel === 'professor').map(prof => (
                  <div key={prof.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0 shadow-inner">
                      {prof.avatar_url ? (
                        <img src={prof.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{prof.nome[0]}</div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-[13px] font-extrabold text-gray-950">{prof.nome}</h5>
                      <span className="text-[10px] bg-violet-100 text-violet-750 font-bold px-2 py-0.5 rounded-full mt-1 inline-block">{prof.disciplinas || 'Coordenador'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Alunos */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[12.5px] font-bold text-gray-400 uppercase tracking-wider pl-1">Colegas de Classe</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {participantesFiltrados.filter(p => p.papel === 'aluno').map(aluno => (
                  <div key={aluno.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0 shadow-inner">
                      {aluno.avatar_url ? (
                        <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{aluno.nome[0]}</div>
                      )}
                    </div>
                    <div>
                      <h5 className="text-[13px] font-extrabold text-gray-950">{aluno.nome}</h5>
                      <span className="text-[9.5px] text-gray-400 mt-0.5 block font-light">Matrícula: {aluno.matricula || '---'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ABA: CALENDÁRIO */}
      {abaAtiva === 'calendario' && (
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-gray-50 pb-4">
            <div>
              <h3 className="text-[16px] font-black text-gray-950">Calendário de Atividades e Provas</h3>
              <p className="text-[12px] text-gray-400">Agende avaliações, trabalhos ou visualize prazos escolares.</p>
            </div>

            {ehProfessor() && (
              <button
                onClick={() => setModalEventoOpen(true)}
                className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12px] px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <Plus size={16} /> Novo Evento
              </button>
            )}
          </div>

          <div className="space-y-4">
            {eventos.map(evt => (
              <div key={evt.id} className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-gray-900">{evt.title}</span>
                    <span className="text-[9px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full">{evt.event_type}</span>
                  </div>
                  <p className="text-[11.5px] text-gray-550 font-light">{evt.description || 'Sem notas adicionais.'}</p>
                </div>

                <div className="flex items-center gap-4 text-[11px] flex-shrink-0">
                  <div className="text-right">
                    <span className="text-gray-400 block">Agendado para:</span>
                    <b className="text-gray-800 block mt-0.5">{new Date(evt.event_date).toLocaleDateString('pt-BR')}</b>
                  </div>

                  {ehProfessor() && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('Excluir evento do calendário?')) return;
                        await supabase.from('calendar_events').delete().eq('id', evt.id);
                        carregarDadosTurma();
                      }}
                      className="p-2 bg-white border border-gray-200 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-xl cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {eventos.length === 0 && (
              <p className="text-center py-12 text-gray-400 text-[12.5px]">Nenhum evento no calendário da turma.</p>
            )}
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
                <label className="text-[10px] font-bold text-gray-500 uppercase">Título do Aviso</label>
                <input 
                  type="text" 
                  value={avisoForm.title}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Prova Bimestral de História"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Conteúdo</label>
                <textarea 
                  value={avisoForm.content}
                  onChange={(e) => setAvisoForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva as orientações para os alunos da turma..."
                  rows={4}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl p-3.5 text-[12.5px] outline-none resize-none"
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
                <label className="text-[10px] font-bold text-gray-500 uppercase">Título da Atividade</label>
                <input 
                  type="text" 
                  value={atividadeForm.title}
                  onChange={(e) => setAtividadeForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Trabalho Semestral - IHC"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Descrição da Tarefa</label>
                <textarea 
                  value={atividadeForm.description}
                  onChange={(e) => setAtividadeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Escreva os objetivos e orientações do trabalho..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl p-3.5 text-[12.5px] outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Data Limite de Entrega</label>
                  <input 
                    type="date" 
                    value={atividadeForm.due_date}
                    onChange={(e) => setAtividadeForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none text-gray-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Critérios de Avaliação</label>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Tipo de Evento</label>
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
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Data</label>
                  <input 
                    type="date" 
                    value={eventoForm.event_date}
                    onChange={(e) => setEventoForm(prev => ({ ...prev, event_date: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none text-gray-750"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Título do Evento</label>
                <input 
                  type="text" 
                  value={eventoForm.title}
                  onChange={(e) => setEventoForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Prova Bimestral IHC"
                  className="w-full bg-gray-50 border border-gray-255 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Notas Adicionais</label>
                <textarea 
                  value={eventoForm.description}
                  onChange={(e) => setEventoForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Orientações, conteúdo programático..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-255 rounded-xl p-3.5 text-[12.5px] outline-none resize-none"
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

      {/* Modal Compartilhar Arquivo */}
      {modalArquivoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalArquivoOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Paperclip size={18} className="text-violet-600" /> Compartilhar Arquivo na Turma
              </h3>
              <button onClick={() => setModalArquivoOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadArquivo} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome do Arquivo</label>
                <input 
                  type="text" 
                  value={arquivoForm.filename}
                  onChange={(e) => setArquivoForm(prev => ({ ...prev, filename: e.target.value }))}
                  placeholder="Ex: Aula 01 - Introdução ao Design.pdf"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">URL do Arquivo (Simulado)</label>
                  <input 
                    type="text" 
                    value={arquivoForm.file_url}
                    onChange={(e) => setArquivoForm(prev => ({ ...prev, file_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Categoria</label>
                  <select
                    value={arquivoForm.category}
                    onChange={(e) => setArquivoForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-255 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  >
                    <option value="PDFs">PDFs</option>
                    <option value="Imagens">Imagens</option>
                    <option value="Documentos">Documentos</option>
                    <option value="Planilhas">Planilhas</option>
                    <option value="Apresentações">Apresentações</option>
                    <option value="Vídeos">Vídeos</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalArquivoOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer"
                >
                  Compartilhar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

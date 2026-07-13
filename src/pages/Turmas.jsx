import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  Search, 
  SlidersHorizontal, 
  MoreHorizontal, 
  ArrowRight, 
  Plus, 
  UserPlus, 
  BarChart3, 
  Loader2, 
  X,
  Trash2,
  Edit,
  Clock,
  UserCheck
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function Turmas() {
  const navigate = useNavigate();
  const { usuario, perfil } = useAuth();

  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [turmas, setTurmas] = useState([]);
  const [todosPerfis, setTodosPerfis] = useState([]);
  const [matriculas, setMatriculas] = useState([]);
  const [turmaProfessores, setTurmaProfessores] = useState([]);
  const [atividades, setAtividades] = useState([]);
  
  // Abas e Filtros
  const [abaAtiva, setAbaAtiva] = useState('minhas'); // 'minhas' ou 'todas'
  const [busca, setBusca] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');

  // Estados locais de Modais
  const [modalCriarOpen, setModalCriarOpen] = useState(false);
  
  // Formulários
  const [turmaForm, setTurmaForm] = useState({
    nome: '',
    serie: '',
    curso: '',
    turno: 'Manhã',
    ano_letivo: 2026,
    descricao: '',
    max_alunos: 40,
    status: 'Ativa',
    professores_ids: []
  });

  useEffect(() => {
    carregarDados();
  }, [usuario, perfil]);

  async function carregarDados() {
    try {
      setLoading(true);

      const [
        { data: dataTurmas, error: errTurmas },
        { data: dataMat, error: errMat },
        { data: dataTP, error: errTP },
        { data: dataP, error: errP },
        { data: dataAtiv, error: errAtiv }
      ] = await Promise.all([
        supabase.from('turmas').select('*').order('nome'),
        supabase.from('matriculas').select('*'),
        supabase.from('turma_professores').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('activities').select('*').order('due_date')
      ]);

      if (errTurmas) throw errTurmas;
      if (errMat) throw errMat;
      if (errTP) throw errTP;
      if (errP) throw errP;
      if (errAtiv) throw errAtiv;

      setTurmas(dataTurmas || []);
      setMatriculas(dataMat || []);
      setTurmaProfessores(dataTP || []);
      setTodosPerfis(dataP || []);
      setAtividades(dataAtiv || []);

    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar lista de turmas.');
    } finally {
      setLoading(false);
    }
  }

  const ehAdmin = () => perfil?.papel === 'professor' || perfil?.papel === 'administrador';
  const ehProfessor = () => perfil?.papel === 'professor';

  // Verificar se o usuário atual é professor ou está vinculado a essa turma
  const souVinculadoATurma = (turmaId) => {
    if (ehAdmin()) return true;
    if (ehProfessor()) {
      return turmaProfessores.some(tp => tp.turma_id === turmaId && tp.professor_id === usuario.id);
    }
    // Aluno
    const tNome = turmas.find(t => t.id === turmaId)?.nome;
    return perfil?.turma && tNome && perfil.turma.toLowerCase() === tNome.toLowerCase();
  };

  // Criar Turma
  const handleCriarTurma = async (e) => {
    e.preventDefault();
    if (!turmaForm.nome.trim() || !turmaForm.serie.trim()) {
      toast.warning('Preencha nome da turma e série/ano.');
      return;
    }

    try {
      const codigoTurma = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data: novaTurma, error: errT } = await supabase.from('turmas').insert({
        nome: turmaForm.nome.trim(),
        serie: turmaForm.serie.trim(),
        curso: turmaForm.curso.trim(),
        turno: turmaForm.turno,
        ano_letivo: parseInt(turmaForm.ano_letivo),
        descricao: turmaForm.descricao.trim(),
        max_alunos: parseInt(turmaForm.max_alunos),
        status: turmaForm.status,
        codigo: codigoTurma
      }).select().single();

      if (errT) throw errT;

      // Vincular professores selecionados
      if (turmaForm.professores_ids.length > 0 && novaTurma) {
        const inserts = turmaForm.professores_ids.map(profId => ({
          turma_id: novaTurma.id,
          professor_id: profId
        }));
        await supabase.from('turma_professores').insert(inserts);
      }

      // Log administrativo
      await supabase.from('system_logs').insert({
        user_id: usuario.id,
        action: `Criou a turma ${turmaForm.nome} com código ${codigoTurma}`,
        module: 'Turmas'
      });

      toast.success('Turma criada com sucesso! 🎉');
      setModalCriarOpen(false);
      setTurmaForm({
        nome: '',
        serie: '',
        curso: '',
        turno: 'Manhã',
        ano_letivo: 2026,
        descricao: '',
        max_alunos: 40,
        status: 'Ativa',
        professores_ids: []
      });
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao criar turma.');
    }
  };

  // Excluir Turma
  const handleExcluirTurma = async (tId, tNome) => {
    if (!ehAdmin()) {
      toast.error('Apenas administradores podem excluir turmas.');
      return;
    }
    if (!window.confirm(`Tem certeza de que deseja excluir permanentemente a turma ${tNome}?`)) return;

    try {
      const { error } = await supabase.from('turmas').delete().eq('id', tId);
      if (error) throw error;

      await supabase.from('system_logs').insert({
        user_id: usuario.id,
        action: `Excluiu permanentemente a turma ${tNome}`,
        module: 'Turmas'
      });

      toast.success('Turma excluída com sucesso.');
      carregarDados();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir turma.');
    }
  };

  // Filtragem de turmas para exibição
  const turmasFiltradas = turmas.filter(t => {
    const bateBusca = !busca.trim() || t.nome.toLowerCase().includes(busca.toLowerCase());
    const bateFiltro = !filtroTurno || t.turno === filtroTurno;
    
    if (abaAtiva === 'minhas') {
      return bateBusca && bateFiltro && souVinculadoATurma(t.id);
    }
    
    // Aluno só vê as dele mesmo na listagem geral para maior privacidade
    if (perfil?.papel === 'aluno') {
      return bateBusca && bateFiltro && souVinculadoATurma(t.id);
    }
    
    return bateBusca && bateFiltro;
  });

  // Estatísticas superiores
  const totalMinhasTurmas = turmas.filter(t => souVinculadoATurma(t.id)).length;
  
  // Alunos matriculados nas minhas turmas
  const minhasTurmasIds = turmas.filter(t => souVinculadoATurma(t.id)).map(t => t.id);
  const totalAlunosTurmas = matriculas.filter(m => minhasTurmasIds.includes(m.turma_id)).length;

  const totalAtividadesMes = atividades.filter(a => {
    const date = new Date(a.due_date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const proximasAtivSemana = atividades.filter(a => {
    const date = new Date(a.due_date);
    const now = new Date();
    const diff = (date - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  // Obter próxima atividade de uma turma específica
  const getProximaAtividade = (turmaId) => {
    const ativs = atividades.filter(a => a.turma_id === turmaId && new Date(a.due_date) > new Date());
    if (ativs.length === 0) return null;
    return ativs[0];
  };

  // Obter participantes alunos da turma
  const getAlunosMatriculados = (turmaId) => {
    const alunoIds = matriculas.filter(m => m.turma_id === turmaId).map(m => m.aluno_id);
    return todosPerfis.filter(p => alunoIds.includes(p.id));
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando gerenciador de turmas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Turmas</h1>
          <p className="text-[12.5px] text-gray-500 font-light">Gerencie suas turmas e acompanhe as atividades dos alunos.</p>
        </div>

        {(ehAdmin() || ehProfessor()) && (
          <button 
            onClick={() => setModalCriarOpen(true)}
            className="bg-violet-650 hover:bg-violet-700 text-white font-bold text-[12px] px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer self-start md:self-auto"
          >
            <Plus size={16} /> Criar turma
          </button>
        )}
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <GraduationCap size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Minhas turmas</span>
            <span className="text-xl font-black text-gray-950">{totalMinhasTurmas}</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Turmas ativas</span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Alunos</span>
            <span className="text-xl font-black text-gray-950">{totalAlunosTurmas || 128}</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Alunos no total</span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Atividades</span>
            <span className="text-xl font-black text-gray-950">{totalAtividadesMes || 24}</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Atividades este mês</span>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-[0_2px_10px_rgba(0,0,0,0.01)] flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Próximas atividades</span>
            <span className="text-xl font-black text-gray-950">{proximasAtivSemana || 5}</span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Esta semana</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: LIST OF CLASSES */}
        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-6 lg:col-span-2">
          
          {/* Menu / Abas e Pesquisa */}
          <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-100 pb-3 gap-4">
            
            <div className="flex gap-4 border-b sm:border-none border-gray-50 w-full sm:w-auto">
              <button 
                onClick={() => setAbaAtiva('minhas')}
                className={`pb-2.5 text-[12.5px] font-bold transition-all relative cursor-pointer ${abaAtiva === 'minhas' ? 'text-violet-650 font-black' : 'text-gray-400 hover:text-gray-800'}`}
              >
                Minhas turmas
                {abaAtiva === 'minhas' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-650 rounded-full" />}
              </button>

              {perfil?.papel !== 'aluno' && (
                <button 
                  onClick={() => setAbaAtiva('todas')}
                  className={`pb-2.5 text-[12.5px] font-bold transition-all relative cursor-pointer ${abaAtiva === 'todas' ? 'text-violet-650 font-black' : 'text-gray-400 hover:text-gray-800'}`}
                >
                  Todas as turmas
                  {abaAtiva === 'todas' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-650 rounded-full" />}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-250 rounded-xl px-3.5 py-1.5 w-full sm:max-w-xs focus-within:border-black transition-all">
              <Search size={14} className="text-gray-400" />
              <input 
                type="text" 
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar turma..."
                className="bg-transparent outline-none border-none text-[12px] text-gray-700 placeholder-gray-400 w-full"
              />
            </div>

          </div>

          {/* List of classes */}
          <div className="divide-y divide-gray-50 space-y-4">
            {turmasFiltradas.map(t => {
              const alunosTurma = getAlunosMatriculados(t.id);
              const proximaAtiv = getProximaAtividade(t.id);
              const ehProf = ehProfessor() && souVinculadoATurma(t.id);
              
              return (
                <div 
                  key={t.id}
                  onClick={() => navigate(`/turma/${t.id}`)}
                  className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/50 rounded-2xl p-2.5 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm mt-1">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-extrabold text-gray-950">{t.nome}</span>
                        {ehProf && <span className="text-[8px] bg-violet-100 text-violet-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Você é professor</span>}
                      </div>
                      <p className="text-[11.5px] text-gray-400 font-light mt-0.5">{t.serie} • {t.turno}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap gap-6 text-[11px] font-medium text-gray-500">
                    <div>
                      <span className="block text-gray-400">Alunos</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {alunosTurma.slice(0, 4).map(aluno => (
                            <div key={aluno.id} className="w-5 h-5 rounded-full bg-gray-200 border border-white overflow-hidden shadow-sm flex-shrink-0">
                              {aluno.avatar_url ? (
                                <img src={aluno.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-400">{aluno.nome[0]}</div>
                              )}
                            </div>
                          ))}
                        </div>
                        <span className="font-bold text-gray-800">{alunosTurma.length} alunos</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-gray-400">Próxima atividade</span>
                      {proximaAtiv ? (
                        <div className="mt-1">
                          <span className="font-bold text-gray-850 block">{proximaAtiv.title}</span>
                          <span className="text-[9px] text-gray-400 font-light block">{new Date(proximaAtiv.due_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-light block mt-1">Sem atividades</span>
                      )}
                    </div>

                    {ehAdmin() && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluirTurma(t.id, t.nome);
                        }}
                        className="p-2 bg-white hover:bg-red-50 hover:text-red-750 text-gray-400 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-center self-center"
                        title="Excluir Turma"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {turmasFiltradas.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-[12.5px]">Nenhuma turma cadastrada ou vinculada.</div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: HIGHLIGHTED CLASS, UPCOMING EVENTS & ACTIONS */}
        <div className="space-y-6">
          
          {/* Turma em destaque */}
          {turmas.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2">Turma em destaque</h3>
              
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h4 className="text-[14px] font-black text-gray-900">{turmas[0].nome}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">{turmas[0].serie}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-50 pt-4 text-[11px]">
                <div>
                  <span className="text-gray-400 block">Alunos</span>
                  <b className="text-gray-900 text-[13px]">{getAlunosMatriculados(turmas[0].id).length}</b>
                </div>
                <div>
                  <span className="text-gray-400 block">Atividades</span>
                  <b className="text-gray-900 text-[13px]">{atividades.filter(a => a.turma_id === turmas[0].id).length}</b>
                </div>
                <div>
                  <span className="text-gray-400 block">Participação</span>
                  <b className="text-gray-900 text-[13px]">96%</b>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/turma/${turmas[0].id}`)}
                className="w-full text-center py-2.5 text-[11.5px] font-bold text-white bg-violet-650 hover:bg-violet-700 rounded-xl cursor-pointer transition-colors mt-2"
              >
                Acessar turma
              </button>
            </div>
          )}

          {/* Atividades próximas list */}
          <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm space-y-4">
            <h3 className="text-[13px] font-bold text-gray-950 border-b border-gray-100 pb-2 flex items-center justify-between">
              Atividades próximas
              <span className="text-[10px] text-gray-400 font-light">Ver todas</span>
            </h3>

            <div className="space-y-3 text-[11px]">
              {atividades.slice(0, 4).map((act, idx) => {
                const turmaObj = turmas.find(t => t.id === act.turma_id);
                return (
                  <div key={act.id} className="flex items-center justify-between gap-4 p-2 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen size={13} />
                      </div>
                      <div>
                        <span className="font-bold text-gray-850 block leading-tight">{act.title}</span>
                        <span className="text-[9.5px] text-gray-400 font-light block mt-0.5">{turmaObj?.nome || 'Geral'}</span>
                      </div>
                    </div>
                    <span className="text-[9.5px] text-gray-400 font-bold flex-shrink-0">{new Date(act.due_date).toLocaleDateString('pt-BR')}</span>
                  </div>
                );
              })}

              {atividades.length === 0 && (
                <p className="text-center py-6 text-gray-400 font-light">Sem próximas atividades.</p>
              )}
            </div>
          </div>

          {/* Gerenciar turmas quick actions */}
          {(ehAdmin() || ehProfessor()) && (
            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-3">
              <h3 className="text-[13px] font-bold text-gray-950 mb-1 pl-1 border-l-2 border-violet-500">Gerenciar turmas</h3>
              
              <button 
                onClick={() => setModalCriarOpen(true)}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-700 cursor-pointer"
              >
                + Criar nova turma <Plus size={14} />
              </button>

              <button 
                onClick={() => navigate('/admin?aba=usuarios')}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-700 cursor-pointer"
              >
                Convidar alunos <UserPlus size={14} />
              </button>

              <button 
                onClick={() => navigate('/admin?aba=relatorios')}
                className="w-full text-left bg-gray-50 hover:bg-gray-100 transition-colors p-3 rounded-xl border border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-700 cursor-pointer"
              >
                Relatórios de turmas <BarChart3 size={14} />
              </button>
            </div>
          )}

        </div>

      </div>

      {/* MODAL CRIAR TURMA */}
      {modalCriarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalCriarOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <GraduationCap size={18} className="text-violet-600" /> Cadastrar Nova Turma
              </h3>
              <button onClick={() => setModalCriarOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarTurma} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nome da Turma</label>
                <input 
                  type="text" 
                  value={turmaForm.nome}
                  onChange={(e) => setTurmaForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: 1º Ano D"
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Série / Ano</label>
                  <input 
                    type="text" 
                    value={turmaForm.serie}
                    onChange={(e) => setTurmaForm(prev => ({ ...prev, serie: e.target.value }))}
                    placeholder="Ensino Médio"
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Turno</label>
                  <select
                    value={turmaForm.turno}
                    onChange={(e) => setTurmaForm(prev => ({ ...prev, turno: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Noite">Noite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Quantidade Máxima de Alunos</label>
                  <input 
                    type="number" 
                    value={turmaForm.max_alunos}
                    onChange={(e) => setTurmaForm(prev => ({ ...prev, max_alunos: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Status</label>
                  <select
                    value={turmaForm.status}
                    onChange={(e) => setTurmaForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Inativa">Inativa</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Descrição da Turma</label>
                <textarea 
                  value={turmaForm.descricao}
                  onChange={(e) => setTurmaForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Informações gerais sobre a turma..."
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl p-3.5 text-[12.5px] outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Vincular Professores Responsáveis</label>
                <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-xl p-2 bg-gray-50 space-y-1">
                  {todosPerfis.filter(p => p.papel === 'professor').map(prof => (
                    <label key={prof.id} className="flex items-center gap-2 text-[12px] text-gray-700 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={turmaForm.professores_ids.includes(prof.id)}
                        onChange={(e) => {
                          const ids = e.target.checked 
                            ? [...turmaForm.professores_ids, prof.id]
                            : turmaForm.professores_ids.filter(id => id !== prof.id);
                          setTurmaForm(prev => ({ ...prev, professores_ids: ids }));
                        }}
                        className="rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span>{prof.nome}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalCriarOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-[12px] font-bold text-gray-600 transition-all cursor-pointer"
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

    </div>
  );
}

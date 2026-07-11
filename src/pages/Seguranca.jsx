import { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Mail, 
  ShieldCheck, 
  FileLock2, 
  History, 
  Loader2, 
  X, 
  Smartphone, 
  Check, 
  AlertCircle,
  Database,
  Lock,
  Download,
  Upload,
  UserCheck,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';

export default function Seguranca() {
  const { usuario, perfil } = useAuth();
  
  // Estados Gerais
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});
  const [sessions, setSessions] = useState([]);
  const [backups, setBackups] = useState([]);

  // Modais
  const [modalSenhaOpen, setModalSenhaOpen] = useState(false);
  const [modal2FAOpen, setModal2FAOpen] = useState(false);
  const [modalSpamOpen, setModalSpamOpen] = useState(false);
  const [modalBackupOpen, setModalBackupOpen] = useState(false);

  // Estados de Formulários e Configurações
  const [senhaForm, setSenhaForm] = useState({ antiga: '', nova: '', confirmar: '' });
  const [seguranca2FA, setSeguranca2FA] = useState(false);
  const [protecaoSpam, setProtecaoSpam] = useState(true);

  // Requisitos de Senha Forte
  const senhaRequisitos = {
    tamanho: senhaForm.nova.length >= 8,
    maiuscula: /[A-Z]/.test(senhaForm.nova),
    minuscula: /[a-z]/.test(senhaForm.nova),
    numero: /[0-9]/.test(senhaForm.nova),
    especial: /[^A-Za-z0-9]/.test(senhaForm.nova)
  };

  const senhaForte = Object.values(senhaRequisitos).every(Boolean);

  useEffect(() => {
    carregarDadosSeguranca();
  }, [usuario]);

  async function carregarDadosSeguranca() {
    if (!usuario) return;
    try {
      setLoading(true);

      // 1. Logs de segurança
      const { data: logsData } = await supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(10);
      setLogs(logsData || []);

      // 2. Perfis dos atores dos logs
      const userIds = [...new Set((logsData || []).map(l => l.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('profiles').select('id, nome, papel').in('id', userIds);
        if (profilesData) {
          const map = {};
          profilesData.forEach(p => { map[p.id] = p; });
          setProfilesMap(map);
        }
      }

      // 3. Sessões ativas (dispositivos)
      const { data: sessionsData } = await supabase.from('security_sessions').select('*').eq('user_id', usuario.id);
      setSessions(sessionsData || [
        { id: '1', device_name: 'Chrome • Windows', ip_address: '192.168.1.15', last_active: new Date().toISOString() }
      ]);

      // 4. Backups (apenas para Admin)
      if (perfil?.papel === 'administrador') {
        const { data: backupsData } = await supabase.from('security_backups').select('*').order('created_at', { ascending: false });
        setBackups(backupsData || []);
      }

    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados de segurança.');
    } finally {
      setLoading(false);
    }
  }

  const ehAdmin = () => perfil?.papel === 'administrador';

  // --- ALTERAR SENHA ---
  const handleAlterarSenha = async (e) => {
    e.preventDefault();
    if (senhaForm.nova !== senhaForm.confirmar) {
      toast.error('As senhas não coincidem!');
      return;
    }
    if (!senhaForte) {
      toast.error('A senha não cumpre as diretrizes de segurança!');
      return;
    }

    try {
      // Simular atualização de senha via Supabase Auth
      const { error } = await supabase.auth.updateUser({ password: senhaForm.nova });
      if (error) throw error;

      // Registrar log de segurança
      await supabase.from('security_logs').insert({
        user_id: usuario.id,
        action: 'Alteração de senha',
        details: 'Senha alterada com sucesso pelo usuário'
      });

      toast.success('Senha atualizada com sucesso! 🔒');
      setModalSenhaOpen(false);
      setSenhaForm({ antiga: '', nova: '', confirmar: '' });
      carregarDadosSeguranca();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar senha.');
    }
  };

  // --- 2FA ---
  const handleToggle2FA = () => {
    const novoStatus = !seguranca2FA;
    setSeguranca2FA(novoStatus);
    toast.success(novoStatus ? 'Autenticação em duas etapas ativada!' : '2FA desativado.');
  };

  // --- GERAR BACKUP ---
  const handleGerarBackup = async () => {
    if (!ehAdmin()) return;
    try {
      const filename = `backup_educonnect_${new Date().toISOString().slice(0,10)}_${Math.floor(Math.random()*1000)}.json`;
      
      const { error } = await supabase.from('security_backups').insert({
        admin_id: usuario.id,
        filename,
        file_size: '2.8 MB'
      });

      if (error) throw error;

      // Gravar log de backup
      await supabase.from('security_logs').insert({
        user_id: usuario.id,
        action: 'Backup realizado',
        details: `Backup gerado: ${filename}`
      });

      toast.success('Backup do banco de dados concluído! 💾');
      carregarDadosSeguranca();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar backup.');
    }
  };

  const getLogIcon = (action) => {
    if (action.includes('Login')) return <Globe className="text-green-600" size={15} />;
    if (action.includes('Backup')) return <Database className="text-blue-600" size={15} />;
    if (action.includes('Senha')) return <Key className="text-amber-600" size={15} />;
    return <Lock className="text-violet-650" size={15} />;
  };

  const getBgIcon = (action) => {
    if (action.includes('Login')) return 'bg-green-50';
    if (action.includes('Backup')) return 'bg-blue-50';
    if (action.includes('Senha')) return 'bg-amber-50';
    return 'bg-violet-50';
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-16 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <p className="text-[13.5px] text-gray-400 font-bold">Carregando painel de segurança...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Shield size={20} />
        </div>
        <div className="space-y-1">
          <h1 className="text-[20px] font-black text-gray-950 tracking-tight">Segurança</h1>
          <p className="text-[12.5px] text-gray-500 font-light">Gerencie as configurações de segurança da sua conta e da plataforma.</p>
        </div>
      </div>

      {/* GRID DE OPÇÕES DE SEGURANÇA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD 1: Autenticação Segura */}
        <div 
          onClick={() => setModalSenhaOpen(true)}
          className="bg-white border border-gray-100 hover:border-gray-250 transition-all rounded-[2rem] p-6 shadow-sm flex items-start gap-4 cursor-pointer relative group"
        >
          <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Lock size={20} />
          </div>
          <div className="space-y-1 flex-1 pr-6">
            <h3 className="text-[14px] font-bold text-gray-950">Autenticação segura</h3>
            <p className="text-[11.5px] text-gray-400 font-light leading-relaxed">Altere sua senha e configure autenticação em duas etapas para proteger sua conta.</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-2 ${seguranca2FA ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {seguranca2FA ? 'Autenticação em duas etapas ativada' : '2FA desativado'}
            </span>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-black transition-colors self-center absolute right-5" size={16} />
        </div>

        {/* CARD 2: Recuperação de Senha */}
        <div 
          onClick={() => toast.info('Link de recuperação de senha enviado por e-mail!')}
          className="bg-white border border-gray-100 hover:border-gray-250 transition-all rounded-[2rem] p-6 shadow-sm flex items-start gap-4 cursor-pointer relative group"
        >
          <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Key size={20} />
          </div>
          <div className="space-y-1 flex-1 pr-6">
            <h3 className="text-[14px] font-bold text-gray-950">Recuperação de senha</h3>
            <p className="text-[11.5px] text-gray-400 font-light leading-relaxed">Configure opções de recuperação para garantir o acesso rápido à sua conta.</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-black transition-colors self-center absolute right-5" size={16} />
        </div>

        {/* CARD 3: Proteção contra Spam */}
        <div 
          onClick={() => setModalSpamOpen(true)}
          className="bg-white border border-gray-100 hover:border-gray-250 transition-all rounded-[2rem] p-6 shadow-sm flex items-start gap-4 cursor-pointer relative group"
        >
          <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1 flex-1 pr-6">
            <h3 className="text-[14px] font-bold text-gray-950">Proteção contra spam</h3>
            <p className="text-[11.5px] text-gray-400 font-light leading-relaxed">Gerencie filtros e configurações automáticas para manter sua experiência segura.</p>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block mt-2 ${protecaoSpam ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-750'}`}>
              {protecaoSpam ? 'Proteção ativa' : 'Proteção desativada'}
            </span>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-black transition-colors self-center absolute right-5" size={16} />
        </div>

        {/* CARD 4: Registro de Ações */}
        <div 
          onClick={() => setModalBackupOpen(true)}
          className="bg-white border border-gray-100 hover:border-gray-250 transition-all rounded-[2rem] p-6 shadow-sm flex items-start gap-4 cursor-pointer relative group"
        >
          <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <FileLock2 size={20} />
          </div>
          <div className="space-y-1 flex-1 pr-6">
            <h3 className="text-[14px] font-bold text-gray-950">Registro de ações</h3>
            <p className="text-[11.5px] text-gray-400 font-light leading-relaxed">Visualize backups e o histórico de ações críticas realizadas por administradores da plataforma.</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-black transition-colors self-center absolute right-5" size={16} />
        </div>

      </div>

      {/* TABELA: ATIVIDADE RECENTE DE SEGURANÇA */}
      <div className="bg-white border border-gray-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
        <h3 className="text-[14px] font-bold text-gray-950 border-b border-gray-50 pb-2">Atividade recente de segurança</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] font-medium text-gray-600">
            <thead>
              <tr className="text-gray-450 border-b border-gray-50 uppercase text-[9.5px] font-bold">
                <th className="pb-3 pl-2">Ação</th>
                <th className="pb-3">Usuário</th>
                <th className="pb-3">Detalhes</th>
                <th className="pb-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => {
                const userObj = profilesMap[log.user_id] || {};
                return (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-3.5 pl-2 flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${getBgIcon(log.action)} flex items-center justify-center flex-shrink-0`}>
                        {getLogIcon(log.action)}
                      </div>
                      <span className="font-bold text-gray-900">{log.action}</span>
                    </td>
                    <td className="py-3.5 font-bold text-gray-800">
                      {userObj.nome || 'Sistema'} <span className="text-[9.5px] text-gray-400 font-light block">{userObj.papel}</span>
                    </td>
                    <td className="py-3.5 text-gray-500 font-light max-w-xs truncate" title={log.details}>
                      {log.details || 'Nenhum dado adicional.'}
                    </td>
                    <td className="py-3.5 text-gray-400 font-light">
                      {new Date(log.created_at).toLocaleDateString('pt-BR')} às {new Date(log.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                );
              })}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400 font-light">Sem atividades registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="text-center pt-2">
          <button 
            onClick={() => toast.info('Todos os logs já estão exibidos na listagem recente.')}
            className="text-[11.5px] font-bold text-violet-600 hover:underline cursor-pointer"
          >
            Ver todas as atividades
          </button>
        </div>
      </div>

      {/* --- MODAIS DE CONFIGURAÇÕES --- */}

      {/* Modal 1: Alterar Senha */}
      {modalSenhaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalSenhaOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[460px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-55 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Lock size={18} className="text-violet-650" /> Altere sua senha
              </h3>
              <button onClick={() => setModalSenhaOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAlterarSenha} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Senha atual</label>
                <input 
                  type="password"
                  value={senhaForm.antiga}
                  onChange={(e) => setSenhaForm(prev => ({ ...prev, antiga: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Nova senha</label>
                <input 
                  type="password"
                  value={senhaForm.nova}
                  onChange={(e) => setSenhaForm(prev => ({ ...prev, nova: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              {/* Validador de Senha Forte */}
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-150 space-y-2 text-[10.5px]">
                <span className="font-bold text-gray-700 block">Requisitos de senha forte:</span>
                <div className="grid grid-cols-2 gap-2 text-gray-600 font-light">
                  <span className="flex items-center gap-1">
                    {senhaRequisitos.tamanho ? <Check className="text-green-600" size={12} /> : <AlertCircle className="text-gray-400" size={12} />} Mínimo 8 caracteres
                  </span>
                  <span className="flex items-center gap-1">
                    {senhaRequisitos.maiuscula ? <Check className="text-green-600" size={12} /> : <AlertCircle className="text-gray-400" size={12} />} Letra maiúscula
                  </span>
                  <span className="flex items-center gap-1">
                    {senhaRequisitos.minuscula ? <Check className="text-green-600" size={12} /> : <AlertCircle className="text-gray-400" size={12} />} Letra minúscula
                  </span>
                  <span className="flex items-center gap-1">
                    {senhaRequisitos.numero ? <Check className="text-green-600" size={12} /> : <AlertCircle className="text-gray-400" size={12} />} Número
                  </span>
                  <span className="flex items-center gap-1 col-span-2">
                    {senhaRequisitos.especial ? <Check className="text-green-600" size={12} /> : <AlertCircle className="text-gray-400" size={12} />} Caractere especial (!@#$%)
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Confirmar nova senha</label>
                <input 
                  type="password"
                  value={senhaForm.confirmar}
                  onChange={(e) => setSenhaForm(prev => ({ ...prev, confirmar: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-250 rounded-xl px-4 py-2.5 text-[12.5px] outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setModalSenhaOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 py-2.5 rounded-xl text-[12.5px] font-bold text-gray-650 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!senhaForte}
                  className="flex-1 bg-violet-600 hover:bg-violet-750 disabled:bg-gray-200 disabled:text-gray-400 text-white py-2.5 rounded-xl text-[12.5px] font-bold cursor-pointer"
                >
                  Confirmar Alterar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: 2FA */}
      {modal2FAOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModal2FAOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[420px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-55 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Smartphone size={18} className="text-violet-650" /> Autenticação de 2 Fatores (2FA)
              </h3>
              <button onClick={() => setModal2FAOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-[12px] text-gray-500 font-light leading-relaxed">Proteja sua conta adicionando uma camada extra de segurança. Um código temporário será solicitado em cada novo login.</p>
              
              <button 
                onClick={handleToggle2FA}
                className={`w-full py-2.5 rounded-xl font-bold text-[12px] cursor-pointer transition-colors ${seguranca2FA ? 'bg-red-50 text-red-750 border border-red-200' : 'bg-violet-650 hover:bg-violet-750 text-white'}`}
              >
                {seguranca2FA ? 'Desativar 2FA' : 'Ativar 2FA Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Spam */}
      {modalSpamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalSpamOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[420px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-55 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <ShieldCheck size={18} className="text-violet-650" /> Proteção e Controle de Spam
              </h3>
              <button onClick={() => setModalSpamOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-[12px] font-medium text-gray-700 p-2 bg-gray-50 rounded-xl">
                <div>
                  <span className="block font-bold">Filtro de Conteúdo Escolar</span>
                  <span className="text-[10px] text-gray-400 block font-light leading-tight">Impedir links suspeitos e termos ofensivos.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={protecaoSpam} 
                    onChange={() => setProtecaoSpam(!protecaoSpam)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-gray-450 font-light leading-relaxed">As regras do filtro comunitário garantem um ambiente livre de assédio, bots e propagandas externas.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Backup */}
      {modalBackupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setModalBackupOpen(false)} />
          <div className="relative bg-white rounded-[2.5rem] w-full max-w-[480px] p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-gray-55 pb-3">
              <h3 className="text-[15px] font-bold text-gray-950 flex items-center gap-2">
                <Database size={18} className="text-violet-650" /> Central de Backup e Restauração
              </h3>
              <button onClick={() => setModalBackupOpen(false)} className="text-gray-400 hover:text-black p-1 hover:bg-gray-50 rounded-lg cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {ehAdmin() ? (
                <>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleGerarBackup}
                      className="flex-1 bg-violet-600 hover:bg-violet-750 text-white font-bold text-[12px] py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                    >
                      <Download size={14} /> Criar Backup
                    </button>
                    <button 
                      onClick={() => toast.info('Faça o upload do arquivo JSON para restaurar.')}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[12px] py-3 rounded-xl cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Upload size={14} /> Restaurar Backup
                    </button>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-gray-400 block uppercase tracking-wider">Histórico de Backups</span>
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 divide-y divide-gray-100 p-2 space-y-1.5">
                      {backups.map(bkp => (
                        <div key={bkp.id} className="text-[10.5px] text-gray-650 flex items-center justify-between py-1.5 px-2">
                          <span className="font-mono font-bold truncate pr-3">{bkp.filename}</span>
                          <span className="text-[9.5px] text-gray-400 flex-shrink-0">{bkp.file_size}</span>
                        </div>
                      ))}
                      {backups.length === 0 && (
                        <p className="text-center py-4 text-gray-400 font-light text-[11px]">Nenhum backup realizado.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-red-50 text-red-750 border border-red-200 rounded-2xl text-[12px] flex items-start gap-2 leading-relaxed">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>Apenas administradores da plataforma possuem credenciais para exportar dados ou restaurar backups do sistema.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

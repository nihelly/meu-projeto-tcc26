import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  LockKeyhole 
} from 'lucide-react';
import logoEduconnect from '../assets/logo-educonnect.png';
import GeometricBackground from '../components/GeometricBackground';

const LogoGoogleSvg = () => (
  <svg className="w-4 h-4 mr-2 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [lembrarMe, setLembramMe] = useState(true);

  // Cadastro Público (Apenas Alunos)
  const [isRegistering, setIsRegistering] = useState(false);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');

  const lidarComSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !senha) {
      toast.warning('Atenção', { description: 'Por favor, preencha todos os campos.' });
      return;
    }

    setCarregando(true);

    try {
      if (isRegistering) {
        if (!nome.trim() || !matricula.trim()) {
          toast.warning('Atenção', { description: 'Por favor, insira o seu nome e número de matrícula.' });
          setCarregando(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: senha,
          options: {
            data: {
              nome: nome.trim(),
              matricula: matricula.trim(),
              papel: 'aluno' // Cadastro público é restrito a Aluno
            }
          }
        });

        if (error) throw error;

        toast.success('Cadastro solicitado! 📩', {
          description: 'Por favor, confirme o link de ativação enviado para o seu e-mail.',
        });
        
        setIsRegistering(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: senha,
        });

        if (error) throw error;
        if (!data.user) throw new Error('Falha ao obter sessão do usuário.');

        // Buscar perfil e redirecionar conforme o papel (RBAC)
        const { data: perfilData } = await supabase
          .from('profiles')
          .select('papel')
          .eq('id', data.user.id)
          .single();

        toast.success('Bem-vindo de volta ao EduConnect!');

        const papel = perfilData?.papel;
        if (papel === 'professor' || papel === 'administrador') {
          navigate('/professor');
        } else {
          navigate('/feed');
        }
      }
    } catch (error) {
      let desc = error.message;
      if (!isRegistering && error.message === 'Invalid login credentials') {
        desc = 'E-mail ou senha incorretos.';
      }
      toast.error(isRegistering ? 'Falha no cadastro' : 'Falha na autenticação', {
        description: desc,
      });
    } finally {
      setCarregando(false);
    }
  };

  const loginComGoogle = () => {
    toast.info('Autenticação com Google em desenvolvimento para o ambiente escolar.');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col items-center justify-center p-4 relative z-[1] overflow-hidden select-none transition-colors duration-300">
      <GeometricBackground />
      
      {/* CARD PRINCIPAL */}
      <div className="relative z-10 w-full max-w-[420px] bg-white dark:bg-zinc-950 rounded-[2rem] shadow-sm border border-gray-150 dark:border-zinc-800 p-8 flex flex-col items-center animate-in zoom-in-95 duration-300">
        
        {/* Logo EduConnect */}
        <div className="mb-4">
          <img src={logoEduconnect} alt="EduConnect" className="w-16 h-16 object-contain mx-auto" />
        </div>

        {/* Textos Principais */}
        <h1 className="text-[19px] font-black text-gray-950 text-center mb-1 tracking-tight leading-tight">
          {isRegistering ? 'Criar uma conta' : 'Bem-vindo de volta!'}
        </h1>
        <p className="text-[11px] text-gray-400 text-center mb-6 font-light leading-relaxed max-w-[280px] mx-auto">
          {isRegistering 
            ? 'Preencha os dados abaixo para se cadastrar como aluno.' 
            : 'Faça login para acessar sua conta e continuar conectando educação e pessoas.'}
        </p>

        {/* Formulário */}
        <form onSubmit={lidarComSubmit} className="w-full space-y-4">
          
          {/* Campo Nome (Apenas Cadastro) */}
          {isRegistering && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="nomeInput" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 block">
                Nome completo
              </label>
              <input
                id="nomeInput"
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Digite seu nome completo"
                className="w-full bg-[#fcfcfc] border border-gray-150 rounded-2xl py-2.5 px-4 text-[12px] font-medium text-gray-700 outline-none focus:bg-white focus:border-violet-600 transition-all"
              />
            </div>
          )}

          {/* Campo Matrícula (Apenas Cadastro) */}
          {isRegistering && (
            <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-200">
              <label htmlFor="matriculaInput" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 block">
                Número de matrícula
              </label>
              <input
                id="matriculaInput"
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Digite seu número de matrícula"
                className="w-full bg-[#fcfcfc] border border-gray-150 rounded-2xl py-2.5 px-4 text-[12px] font-medium text-gray-700 outline-none focus:bg-white focus:border-violet-600 transition-all"
              />
            </div>
          )}

          {/* E-mail */}
          <div className="space-y-1.5">
            <label htmlFor="emailInput" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 block">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                id="emailInput"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                className="w-full bg-[#fcfcfc] border border-gray-150 rounded-2xl py-2.5 pl-11 pr-4 text-[12px] font-medium text-gray-700 outline-none focus:bg-white focus:border-violet-600 transition-all"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <label htmlFor="senhaInput" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider pl-1 block">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                id="senhaInput"
                name="senha"
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-[#fcfcfc] border border-gray-150 rounded-2xl py-2.5 pl-11 pr-11 text-[12px] font-medium text-gray-700 outline-none focus:bg-white focus:border-violet-600 transition-all"
              />
              <button 
                type="button"
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black cursor-pointer"
              >
                {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Lembrar-me e Esqueci minha senha */}
          <div className="flex items-center justify-between text-[11px] font-medium text-gray-500 px-1 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={lembrarMe}
                onChange={() => setLembramMe(!lembrarMe)}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              Lembrar-me
            </label>
            <span 
              className="cursor-pointer hover:text-violet-750 hover:underline transition-all" 
              onClick={() => navigate('/fluxo-senha')}
            >
              Esqueci minha senha
            </span>
          </div>

          {/* Botão Entrar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-violet-600 hover:bg-violet-750 text-white font-bold py-3 rounded-2xl text-[12px] transition-all cursor-pointer shadow-sm shadow-indigo-500/10 flex items-center justify-center gap-1.5"
            >
              {carregando 
                ? (isRegistering ? 'Cadastrando...' : 'Entrando...') 
                : <>{isRegistering ? 'Registrar' : 'Entrar'} <ArrowRight size={14} /></>
              }
            </button>
          </div>

          {/* Divisor "ou continue com" */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-150"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-[10px] uppercase font-bold tracking-wider">ou continue com</span>
            <div className="flex-grow border-t border-gray-150"></div>
          </div>

          {/* Google Login */}
          <button 
            type="button"
            onClick={loginComGoogle}
            className="w-full bg-white border border-gray-150 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-2xl text-[12px] flex items-center justify-center cursor-pointer transition-all"
          >
            <LogoGoogleSvg /> Entrar com Google
          </button>

          {/* Rodapé Interno do Card: Acesso seguro */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-start gap-2.5 text-left">
            <ShieldCheck className="text-violet-650 flex-shrink-0 mt-0.5" size={16} />
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-gray-900 block leading-tight">Acesso seguro</span>
              <span className="text-[9.5px] text-gray-450 font-light leading-normal block">Sua conta é protegida com criptografia e todos os seus dados estão seguros.</span>
            </div>
          </div>

        </form>

        {/* Link para alternar Cadastro/Login público */}
        <div className="mt-6 text-[11px] text-gray-400 font-light">
          {isRegistering ? 'Já possui uma conta?' : 'Ainda não tem uma conta?'} {' '}
          <span 
            className="text-violet-650 font-bold hover:underline cursor-pointer ml-0.5"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? 'Fazer Login' : 'Cadastre-se'}
          </span>
        </div>

      </div>

      {/* DETALHES INFERIORES (RODAPÉ) */}
      <div className="w-full max-w-[800px] mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-white/90">
        
        {/* Bloco 1 */}
        <div className="flex flex-col items-center text-center space-y-1.5 p-2">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <UserCheck size={18} />
          </div>
          <span className="text-[12.5px] font-bold block">Um só login</span>
          <span className="text-[11px] text-white/70 font-light max-w-[200px] leading-snug">Acesse sua conta com segurança e praticidade.</span>
        </div>

        {/* Bloco 2 */}
        <div className="flex flex-col items-center text-center space-y-1.5 p-2">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <ShieldCheck size={18} />
          </div>
          <span className="text-[12.5px] font-bold block">Perfil detectado</span>
          <span className="text-[11px] text-white/70 font-light max-w-[200px] leading-snug">O sistema identifica seu perfil e libera apenas o que você pode acessar.</span>
        </div>

        {/* Bloco 3 */}
        <div className="flex flex-col items-center text-center space-y-1.5 p-2">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
            <LockKeyhole size={18} />
          </div>
          <span className="text-[12.5px] font-bold block">Ambiente seguro</span>
          <span className="text-[11px] text-white/70 font-light max-w-[200px] leading-snug">Seus dados, conversas e atividades sempre protegidos.</span>
        </div>

      </div>

      {/* Footer Text */}
      <div className="mt-8 text-[11px] text-white/40 flex items-center gap-1.5">
        <LockKeyhole size={11} /> EduConnect © 2025 - Todos os direitos reservados
      </div>

    </div>
  );
}

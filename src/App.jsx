import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

// Importação dos Layouts
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Importação do componente de proteção de rota
import { RotaProtegida } from './components/RotaProtegida';

// Importação das Páginas
import Login from './pages/login';
import FluxoSenha from './pages/FluxoSenha';
import Feed from './pages/Feed';
import CriarPost from './pages/CriarPost';
import Mensagens from './pages/Mensagens';
import Notificacoes from './pages/Notificacoes';
import CriarAviso from './pages/CriarAviso';
import Perfil from './pages/Perfil';
import EditarPerfil from './pages/EditarPerfil';
import Buscar from './pages/Buscar';
import Configuracoes from './pages/Configuracoes';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import ModerarPostagens from './pages/ModerarPostagens';
import PainelProfessor from './pages/PainelProfessor';
import PainelAdministrador from './pages/PainelAdministrador';
import Turmas from './pages/Turmas';
import PaginaTurma from './pages/PaginaTurma';

export default function App() {
  return (
    <Router>
      {/* Provedor global das notificações flutuantes (Toast) */}
      <Toaster position="top-right" richColors closeButton />

      <Routes>
        {/* ==================== ROTAS PÚBLICAS ==================== */}
        <Route path="/login" element={<Login />} />
        <Route path="/fluxo-senha" element={<FluxoSenha />} />

        {/* ==================== ROTAS PROTEGIDAS ==================== */}
        {/* Feed Principal */}
        <Route 
          path="/feed" 
          element={
            <RotaProtegida>
              <MainLayout><Feed /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Perfil Próprio (Sem ID na URL) */}
        <Route 
          path="/perfil" 
          element={
            <RotaProtegida>
              <MainLayout><Perfil /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Editar Perfil (DEVE vir ANTES de /perfil/:id) */}
        <Route 
          path="/perfil/editar" 
          element={
            <RotaProtegida>
              <MainLayout><EditarPerfil /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Perfil de outro usuário (Com ID na URL) */}
        <Route 
          path="/perfil/:id" 
          element={
            <RotaProtegida>
              <MainLayout><Perfil /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Criação de Postagem */}
        <Route 
          path="/criar-post" 
          element={
            <RotaProtegida>
              <MainLayout><CriarPost /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Criação de Aviso (Professor) */}
        <Route 
          path="/criar-aviso" 
          element={
            <RotaProtegida>
              <MainLayout><CriarAviso /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Mensagens */}
        <Route 
          path="/mensagens" 
          element={
            <RotaProtegida>
              <MainLayout><Mensagens /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Notificações */}
        <Route 
          path="/notificacoes" 
          element={
            <RotaProtegida>
              <MainLayout><Notificacoes /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Página de Busca */}
        <Route 
          path="/busca" 
          element={
            <RotaProtegida>
              <MainLayout><Buscar /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Configurações */}
        <Route 
          path="/configuracoes" 
          element={
            <RotaProtegida>
              <MainLayout><Configuracoes /></MainLayout>
            </RotaProtegida>
          } 
        />

        {/* Gerenciar Usuários (Administração) */}
        <Route 
          path="/gerenciar-usuarios" 
          element={
            <RotaProtegida apenasProfessor={true}>
              <AdminLayout><GerenciarUsuarios /></AdminLayout>
            </RotaProtegida>
          } 
        />

        {/* Moderar Postagens (Administração) */}
        <Route 
          path="/moderar-postagens" 
          element={
            <RotaProtegida apenasProfessor={true}>
              <AdminLayout><ModerarPostagens /></AdminLayout>
            </RotaProtegida>
          } 
        />

        {/* Painel do Professor (Professor/Admin) */}
        <Route 
          path="/professor" 
          element={
            <RotaProtegida apenasProfessor={true}>
              <AdminLayout><PainelProfessor /></AdminLayout>
            </RotaProtegida>
          } 
        />

        {/* Painel do Administrador (Apenas Admin) */}
        <Route 
          path="/admin" 
          element={
            <RotaProtegida apenasAdmin={true}>
              <AdminLayout><PainelAdministrador /></AdminLayout>
            </RotaProtegida>
          } 
        />

        {/* Organização por Turmas (Acesso para todos os logados) */}
        <Route 
          path="/turmas" 
          element={
            <RotaProtegida>
              <AdminLayout><Turmas /></AdminLayout>
            </RotaProtegida>
          } 
        />
        <Route 
          path="/turma/:id" 
          element={
            <RotaProtegida>
              <AdminLayout><PaginaTurma /></AdminLayout>
            </RotaProtegida>
          } 
        />

        {/* Redirecionamento padrão da raiz para o feed */}
        <Route path="/" element={<Navigate to="/feed" replace />} />

        {/* Fallback: Qualquer caminho inválido joga para o login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

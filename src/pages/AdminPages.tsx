import {
  ChartColumnIncreasing,
  ClipboardCheck,
  MapPin,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { EmptyState, Loading, Notice } from '../components/UI';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminWastes from '../components/admin/AdminWastes';
import AdminPoints from '../components/admin/AdminPoints';
import AdminSuggestions from '../components/admin/AdminSuggestions';
import AdminUsers from '../components/admin/AdminUsers';
import '../components/admin/admin.css';

export default function AdminPage() {
  const { user, loading, mode, error } = useApp();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;
  if (user.role !== 'admin')
    return (
      <EmptyState
        title="Esta área é exclusiva da administração"
        description="Sua conta pode pesquisar materiais, registrar descartes e contribuir com novos pontos de coleta."
        action={
          <Link to="/perfil" className="button primary">
            Ir para meu perfil
          </Link>
        }
      />
    );
  return (
    <div className="container page admin-page">
      <div className="admin-area-label">
        <ShieldCheck size={17} />
        <span>Painel administrativo</span>
        {mode === 'demo' && <span className="badge gray">Demonstração local</span>}
      </div>
      <nav className="admin-nav" aria-label="Navegação administrativa">
        <NavLink to="/admin" end>
          <ChartColumnIncreasing size={18} /> Visão geral
        </NavLink>
        <NavLink to="/admin/residuos">
          <Package size={18} /> Resíduos
        </NavLink>
        <NavLink to="/admin/pontos">
          <MapPin size={18} /> Pontos de coleta
        </NavLink>
        <NavLink to="/admin/sugestoes">
          <ClipboardCheck size={18} /> Sugestões
        </NavLink>
        <NavLink to="/admin/usuarios">
          <Users size={18} /> Usuários
        </NavLink>
      </nav>
      {error && <Notice tone="error">{error}</Notice>}
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="residuos" element={<AdminWastes />} />
        <Route path="pontos" element={<AdminPoints />} />
        <Route path="sugestoes" element={<AdminSuggestions />} />
        <Route path="usuarios" element={<AdminUsers />} />
        <Route
          path="*"
          element={
            <EmptyState
              title="Seção administrativa não encontrada"
              action={
                <Link className="button primary" to="/admin">
                  Voltar à visão geral
                </Link>
              }
            />
          }
        />
      </Routes>
    </div>
  );
}

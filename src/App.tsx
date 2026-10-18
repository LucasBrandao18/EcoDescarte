import { lazy, Suspense } from 'react';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import Layout from './components/Layout';
import { Loading } from './components/UI';
import HomePage from './pages/HomePage';
import { SearchPage, WasteDetailPage } from './pages/WastePages';
import { PointsPage, PointDetailPage } from './pages/PointPages';
import { AboutPage, OdsPage, NotFoundPage } from './pages/AboutPages';
import { LoginPage, RegisterPage, RecoverPage } from './pages/AuthPages';
import {
  ProfilePage,
  HistoryPage,
  SuggestPage,
  EcoPointsPage,
  DisposalPage,
} from './pages/UserPages';
const AdminPage = lazy(() => import('./pages/AdminPages'));
function UserLayout() {
  const { loading } = useApp();
  return <div className="container page">{loading ? <Loading /> : <Outlet />}</div>;
}
export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="descartar" element={<SearchPage />} />
              <Route path="residuos/:id" element={<WasteDetailPage />} />
              <Route path="pontos" element={<PointsPage />} />
              <Route path="mapa" element={<PointsPage mapOnly />} />
              <Route path="pontos/:id" element={<PointDetailPage />} />
              <Route path="entrar" element={<LoginPage />} />
              <Route path="cadastro" element={<RegisterPage />} />
              <Route path="recuperar-senha" element={<RecoverPage />} />
              <Route element={<UserLayout />}>
                <Route path="perfil" element={<ProfilePage />} />
                <Route path="meu-impacto" element={<ProfilePage />} />
                <Route path="historico" element={<HistoryPage />} />
                <Route path="sugerir-ponto" element={<SuggestPage />} />
                <Route path="ecopontos" element={<EcoPointsPage />} />
                <Route path="registrar-descarte" element={<DisposalPage />} />
              </Route>
              <Route path="sobre" element={<AboutPage />} />
              <Route path="ods-12" element={<OdsPage />} />
              <Route path="admin/*" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AppProvider>
    </BrowserRouter>
  );
}

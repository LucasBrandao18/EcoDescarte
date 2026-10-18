import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { formatDate, normalize, userStats } from '../../utils/domain';
import { Badge, EmptyState, PageHeading } from '../UI';

export default function AdminUsers() {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('');
  const users = data.users
    .filter(
      (user) =>
        (!query || normalize(`${user.name} ${user.email}`).includes(normalize(query))) &&
        (!role || user.role === role),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeading
        eyebrow="Administração"
        title="Nossa comunidade"
        description="Acompanhe os cadastros e a participação das pessoas no EcoDescarte."
      />
      <section className="panel">
        <div className="admin-filters">
          <div className="field">
            <label htmlFor="user-search">Pesquisar usuário</label>
            <input
              id="user-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome ou e-mail"
            />
          </div>
          <div className="field">
            <label htmlFor="user-role">Perfil</label>
            <select id="user-role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">Todos os perfis</option>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        <p className="admin-muted">
          {users.length} {users.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}
        </p>
        {users.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Perfil</th>
                  <th>Desde</th>
                  <th>Descartes</th>
                  <th>Sugestões</th>
                  <th>EcoPontos</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const stats = userStats(data, user.id);
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-user">
                          <span className="admin-avatar" aria-hidden="true">
                            {user.name
                              .split(/\s+/)
                              .filter(Boolean)
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </span>
                          <div>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={user.role === 'admin' ? 'green' : 'gray'}>
                          {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </Badge>
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{stats.disposals}</td>
                      <td>{stats.suggestions}</td>
                      <td>
                        <strong>{stats.ecoPoints}</strong>
                        <small>{stats.level}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Nenhuma pessoa encontrada"
            description="Tente buscar por outro nome ou e-mail."
          />
        )}
        <p className="admin-muted admin-table-note">
          A consulta é restrita à administração. A atribuição de administradores é feita de forma
          segura no servidor.
        </p>
      </section>
    </>
  );
}

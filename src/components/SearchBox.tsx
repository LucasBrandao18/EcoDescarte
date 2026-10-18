import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { searchWastes } from '../utils/domain';
export default function SearchBox({
  initial = '',
  large = false,
}: {
  initial?: string;
  large?: boolean;
}) {
  const { data } = useApp();
  const [value, setValue] = useState(initial);
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const id = useId();
  const matches = value.trim() ? searchWastes(data.wastes, value).slice(0, 5) : [];
  return (
    <form
      className={`search-box ${large ? 'large' : ''}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        setFocused(false);
        navigate(`/descartar?q=${encodeURIComponent(value.trim())}`);
      }}
    >
      <label className="sr-only" htmlFor={id}>
        O que você deseja descartar?
      </label>
      <Search size={23} />
      <input
        id={id}
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 180)}
        placeholder="O que você deseja descartar?"
        aria-controls={focused && matches.length ? `${id}-suggestions` : undefined}
      />
      <button className="button primary" type="submit">
        Buscar
      </button>
      {focused && matches.length > 0 && (
        <ul id={`${id}-suggestions`} className="autocomplete" aria-label="Sugestões de resíduos">
          {matches.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFocused(false);
                  navigate(`/residuos/${w.id}`);
                }}
              >
                <Search size={16} />
                {w.name}
                <small>{w.category}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

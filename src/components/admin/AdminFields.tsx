import {
  useEffect,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import { Notice } from '../UI';

export function AdminInput({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = props.id ?? props.name;
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <input {...props} id={id} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}

export function AdminTextarea({
  label,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const id = props.id ?? props.name;
  return (
    <div className="field admin-span">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea rows={3} {...props} id={id} />
    </div>
  );
}

export function AdminCheckbox({
  children,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { children: ReactNode }) {
  return (
    <label className="admin-checkbox">
      <input {...props} type="checkbox" />
      <span>{children}</span>
    </label>
  );
}

export function ConfirmStatus({
  name,
  active,
  busy,
  onConfirm,
  onCancel,
}: {
  name: string;
  active: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    confirmation.current?.focus();
  }, [name]);
  return (
    <div className="admin-confirm" role="alert" tabIndex={-1} ref={confirmation}>
      <AlertTriangle size={23} />
      <div>
        <strong>
          {active ? 'Desativar' : 'Reativar'} {name}?
        </strong>
        <p>
          {active
            ? 'O registro deixará de aparecer nas consultas públicas. O histórico existente será preservado.'
            : 'O registro voltará a aparecer nas consultas públicas.'}
        </p>
        <div className="admin-actions">
          <button
            type="button"
            className={`button ${active ? 'danger' : 'primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? 'Salvando…' : `Confirmar ${active ? 'desativação' : 'reativação'}`}
          </button>
          <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  return message ? <Notice tone="error">{message}</Notice> : null;
}

export const brazilStates = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export function coordinatesError(lat: string, lng: string) {
  if (!lat.trim() || !lng.trim()) return 'Informe a latitude e a longitude confirmadas do local.';
  if (
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lng)) ||
    Math.abs(Number(lat)) > 90 ||
    Math.abs(Number(lng)) > 180
  )
    return 'Informe uma latitude entre −90 e 90 e uma longitude entre −180 e 180.';
  return null;
}

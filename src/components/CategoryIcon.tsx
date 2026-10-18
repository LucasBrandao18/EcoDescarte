import {
  BatteryCharging,
  Wine,
  Cable,
  CircleEllipsis,
  Droplets,
  FileText,
  Laptop,
  Pill,
  Recycle,
  type LucideProps,
} from 'lucide-react';
import type { Category } from '../types';
const icons = {
  Eletrônicos: Laptop,
  Papel: FileText,
  Plástico: Recycle,
  Vidro: Wine,
  Metal: Cable,
  'Pilhas e baterias': BatteryCharging,
  Óleo: Droplets,
  Medicamentos: Pill,
  Outros: CircleEllipsis,
};
export default function CategoryIcon({ category, ...props }: LucideProps & { category: Category }) {
  const Icon = icons[category] || Recycle;
  return <Icon {...props} />;
}

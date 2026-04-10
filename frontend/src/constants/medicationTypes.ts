import { Pill, Droplets, Syringe, Eye, Ear } from 'lucide-react';
import type { MedicationType } from '../types';

export const MEDICATION_TYPES: Record<
  MedicationType,
  {
    label: string;
    icon: typeof Pill;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  oral: {
    label: 'Oral',
    icon: Pill,
    bgClass: 'bg-accent-pink/15',
    textClass: 'text-accent-pink',
    borderClass: 'border-accent-pink/30',
  },
  topical: {
    label: 'Topical',
    icon: Droplets,
    bgClass: 'bg-accent-teal/15',
    textClass: 'text-accent-teal',
    borderClass: 'border-accent-teal/30',
  },
  injection: {
    label: 'Injection',
    icon: Syringe,
    bgClass: 'bg-accent-purple/15',
    textClass: 'text-accent-purple',
    borderClass: 'border-accent-purple/30',
  },
  eye_drops: {
    label: 'Eye Drops',
    icon: Eye,
    bgClass: 'bg-accent-blue/15',
    textClass: 'text-accent-blue',
    borderClass: 'border-accent-blue/30',
  },
  ear_drops: {
    label: 'Ear Drops',
    icon: Ear,
    bgClass: 'bg-accent-pink/15',
    textClass: 'text-accent-pink',
    borderClass: 'border-accent-pink/30',
  },
  other: {
    label: 'Other',
    icon: Pill,
    bgClass: 'bg-surface-2',
    textClass: 'text-text-tertiary',
    borderClass: 'border-border-subtle',
  },
};

export const getMedicationTypeConfig = (type: MedicationType) =>
  MEDICATION_TYPES[type] || MEDICATION_TYPES.other;

export const TIME_OF_DAY_LABELS: Record<string, string> = {
  all_day: 'All Day',
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

export const DOSAGE_UNIT_LABELS: Record<string, string> = {
  tablet: 'tablet(s)',
  ml: 'mL',
  mg: 'mg',
  drops: 'drop(s)',
  puff: 'puff(s)',
  unit: 'unit(s)',
  application: 'application(s)',
};

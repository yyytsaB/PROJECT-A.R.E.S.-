import { HEALTH_FIELDS } from './core/telemetry/profileFields';
import type { ProfileEdits, ProfileField } from './core/telemetry/profileFields';

/** WHO adult BMI bands; shown as context only, not a health assessment. */
function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', tone: 'warn' };
  if (bmi < 25) return { label: 'Healthy range', tone: 'ok' };
  if (bmi < 30) return { label: 'Overweight', tone: 'warn' };
  return { label: 'Obese', tone: 'alert' };
}

interface Props { prefix: string; fieldValue(field: ProfileField): string; setField(field: ProfileField, value: string): void; errors: ProfileEdits; bmi: number | null; includeWeight?: boolean }
export function HealthMetricFields({ prefix, fieldValue, setField, errors, bmi, includeWeight = true }: Props) {
  const category = bmi === null ? null : bmiCategory(bmi);
  return <>
    {HEALTH_FIELDS.filter(field => includeWeight || field.key !== 'bodyWeightKg').map(field => <div className="health-field" data-field={field.key} key={field.key}>
      <label htmlFor={`${prefix}-${field.key}`}>{prefix === 'onboarding' && <span className="visually-hidden">Onboarding </span>}{field.key === 'systolicBpMmHg' || field.key === 'diastolicBpMmHg' ? <><span aria-hidden="true">{field.key === 'systolicBpMmHg' ? 'BP systolic' : 'BP diastolic'}</span><span className="visually-hidden">{field.label}</span></> : field.label}</label>{' '}
      <span className="unit-input" data-unit={field.unit}><input id={`${prefix}-${field.key}`} type="number" aria-label={`${prefix === 'onboarding' ? 'Onboarding ' : ''}${field.label}`} min="0" step="any" value={fieldValue(field.key)} onChange={event => setField(field.key, event.target.value)} aria-invalid={Boolean(errors[field.key])} aria-describedby={`${prefix}-${field.key}-error`} /></span>
      <p id={`${prefix}-${field.key}-error`} role={errors[field.key] ? 'alert' : undefined}>{errors[field.key]}</p>
    </div>)}
    <p className="bmi-readout"><span className="bmi-label">BMI · auto-calculated</span><output aria-label={prefix === 'onboarding' ? 'Calculated BMI' : 'Settings BMI'}>{bmi ?? '—'} kg/m²</output>{category && <span className="bmi-category" data-tone={category.tone}>{category.label}</span>}</p>
  </>;
}

import { HEALTH_FIELDS } from './core/telemetry/profileFields';
import type { ProfileEdits, ProfileField } from './core/telemetry/profileFields';

interface Props { prefix: string; fieldValue(field: ProfileField): string; setField(field: ProfileField, value: string): void; errors: ProfileEdits; bmi: number | null; includeWeight?: boolean }
export function HealthMetricFields({ prefix, fieldValue, setField, errors, bmi, includeWeight = true }: Props) {
  return <>
    {HEALTH_FIELDS.filter(field => includeWeight || field.key !== 'bodyWeightKg').map(field => <div key={field.key}>
      <label htmlFor={`${prefix}-${field.key}`}>{prefix === 'onboarding' ? 'Onboarding ' : ''}{field.label}</label>{' '}
      <input id={`${prefix}-${field.key}`} type="number" min="0" step="any" value={fieldValue(field.key)} onChange={event => setField(field.key, event.target.value)} aria-invalid={Boolean(errors[field.key])} aria-describedby={`${prefix}-${field.key}-error`} />
      <p id={`${prefix}-${field.key}-error`} role={errors[field.key] ? 'alert' : undefined}>{errors[field.key]}</p>
    </div>)}
    <p>BMI: <output aria-label={prefix === 'onboarding' ? 'Calculated BMI' : 'Settings BMI'}>{bmi ?? '—'} kg/m²</output></p>
  </>;
}

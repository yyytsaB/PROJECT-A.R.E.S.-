/** Local native SVGs exported from the team's rendered mission reference. */
export function ReferenceIcon({ name, className = '' }: { name: string; className?: string }) {
  return <img className={`reference-icon ${className}`} src={`/assets/icons/${name}.svg`} alt={`${name.replaceAll('-', ' ')} icon`} aria-hidden="true" width="20" height="20" />;
}

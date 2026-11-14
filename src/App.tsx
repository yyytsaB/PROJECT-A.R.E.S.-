import { loadMissionCatalog } from './core/catalog/missionCatalog';

export default function App() {
  const catalog = loadMissionCatalog();
  return <main>
    <h1>Project A.R.E.S. Command Center</h1>
    <section aria-labelledby="exercises-heading">
      <h2 id="exercises-heading">ARED resistance exercises</h2>
      <ul aria-label="ARED resistance exercises">
        {catalog.exercises.filter(e => e.kind === 'RESISTANCE').map(e => <li key={e.id}>{e.name}</li>)}
      </ul>
    </section>
    <section aria-labelledby="routes-heading">
      <h2 id="routes-heading">Planetary routes</h2>
      <ul aria-label="Planetary routes">
        {catalog.routes.map(r => <li key={r.id}>{r.name}: {r.totalDistanceKm} km</li>)}
      </ul>
    </section>
  </main>;
}

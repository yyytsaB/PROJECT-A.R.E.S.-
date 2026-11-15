import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import App from './App';

test('renders the accessible Command Center catalog summary with local visual assets', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('<h1>Project ARES Command Center</h1>');
  expect(html).toContain('aria-label="ARED resistance exercises"');
  for (const name of ['Squat', 'Deadlift', 'Overhead Press', 'Bicep Curl', 'Valles Marineris', 'Olympus Mons']) {
    expect(html).toContain(name);
  }
  expect(html).toContain('4000 km');
  expect(html).toContain('600 km');
  expect(html).toContain('src="/assets/ares-mark.svg"');
  expect(html).toContain('alt="ARES mission emblem"');
});

test('publishes accessible official NASA and 2026 partner citations with accurate resource usage', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('NASA Data &amp; Space Agency Partner Sources');
  expect(html).toContain('aria-labelledby="science-sources-heading"');
  for (const url of [
    'https://humanresearchroadmap.nasa.gov/',
    'https://science.nasa.gov/biological-physical/data/osdr/',
    'https://nlsp.nasa.gov/',
    'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    'https://www.asc-csa.gc.ca/eng/sciences/tbone.asp',
    'https://www.esa.int/ESA_Multimedia/Images/2026/01/Finding_the_echo',
    'https://humans-in-space.jaxa.jp/en/biz-lab/experiment/theme/detail/000854.html',
  ]) expect(html).toContain(`href="${url}"`);
  for (const term of ['2.5 hours', '0g', '0.16g', '0.38g', '4,000 km', '600 km', '30-day', 'Flight Surgeon', 'MARROW', 'TBone', '24-minute', 'Kibo']) expect(html).toContain(term);
  expect(html).toContain('team-defined');
  expect(html).toContain('diameter');
  expect(html).toContain('not imported');
});

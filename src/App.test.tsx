import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import App from './App';

test('renders the accessible unstyled Command Center catalog summary', () => {
  const html = renderToStaticMarkup(<App />);
  expect(html).toContain('<h1>Project A.R.E.S. Command Center</h1>');
  expect(html).toContain('aria-label="ARED resistance exercises"');
  for (const name of ['Squat', 'Deadlift', 'Overhead Press', 'Bicep Curl', 'Valles Marineris', 'Olympus Mons']) {
    expect(html).toContain(name);
  }
  expect(html).toContain('4000 km');
  expect(html).toContain('600 km');
  expect(html).not.toMatch(/class=|style=|<style|stylesheet/);
});

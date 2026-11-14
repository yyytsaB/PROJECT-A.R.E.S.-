import { readFileSync, readdirSync } from 'node:fs';
import ts from 'typescript';

const errors = [];
const coreFiles = readdirSync('src/core', { recursive: true, withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts'))
  .map(entry => `${entry.parentPath}/${entry.name}`);
function inspect(path, core) {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const report = (node, message) => errors.push(`${path}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${message}`);
  if (core && text.trimEnd().split(/\r?\n/).length > 250) report(source, 'Pure core files must stay within 250 lines.');
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const target = node.moduleSpecifier.text;
      if (core && /^(react(?:-dom)?(?:\/|$)|@mediapipe\/|@supabase\/)/.test(target)) report(node, 'Browser/framework imports belong outside the pure core.');
      if (!core && /\.(css|scss|sass)$/.test(target)) report(node, 'The semantic testbench must not import decorative styles.');
    }
    if (core && ts.isIdentifier(node) && ['window', 'document', 'localStorage', 'sessionStorage', 'navigator'].includes(node.text)) report(node, 'Inject browser resources at the adapter/hook boundary.');
    if (core && ts.isCallExpression(node) && ['Date.now', 'Math.random'].includes(node.expression.getText(source))) report(node, 'Inject nondeterministic values into the pure core.');
    if (core && ts.isNewExpression(node) && node.expression.getText(source) === 'Date' && !node.arguments?.length) report(node, 'Inject timestamps into the pure core.');
    if (!core && ts.isJsxAttribute(node) && ['className', 'style'].includes(node.name.getText(source))) report(node, 'Keep the developer testbench unstyled.');
    ts.forEachChild(node, visit);
  }
  visit(source);
}
coreFiles.forEach(path => inspect(path, true));
['src/App.tsx', 'src/OnboardingSection.tsx', 'src/HealthMetricFields.tsx'].forEach(path => inspect(path, false));
if (errors.length) { errors.forEach(error => console.error(error)); process.exitCode = 1; }
else console.log(`Architecture lint passed (${coreFiles.length} pure core files; semantic testbench checked).`);

import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const docsDir = path.join(rootDir, 'docs');
const templatePath = path.join(docsDir, 'mobile-korean-ime-report-template-2026-03-26.md');

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

if (!existsSync(templatePath)) {
  console.error(`Missing IME report template: ${templatePath}`);
  process.exit(1);
}

const stamp = formatDate(new Date());
const reportPath = path.join(docsDir, `mobile-korean-ime-report-${stamp}.md`);

if (existsSync(reportPath)) {
  console.log(`IME report already exists: ${reportPath}`);
  process.exit(0);
}

copyFileSync(templatePath, reportPath);
console.log(`Created IME report: ${reportPath}`);

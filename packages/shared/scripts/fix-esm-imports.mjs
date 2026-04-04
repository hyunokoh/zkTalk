/**
 * Post-build script: adds .js extensions to relative imports in dist/ files.
 * Needed because tsc with moduleResolution "bundler" doesn't add extensions,
 * but Node ESM requires them at runtime.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';

function fixDir(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      fixDir(full);
    } else if (full.endsWith('.js')) {
      let content = readFileSync(full, 'utf8');
      // Match: from './something' or from '../something' (without .js already)
      content = content.replace(
        /from\s+['"](\.[^'"]+)['"]/g,
        (match, importPath) => {
          if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
            return match;
          }
          return match.replace(importPath, importPath + '.js');
        },
      );
      writeFileSync(full, content);
    }
  }
}

fixDir(join(import.meta.dirname, '..', 'dist'));
console.log('✅ Fixed ESM imports in dist/');

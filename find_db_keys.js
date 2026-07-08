import fs from 'fs';
import path from 'path';

const srcDir = 'c:/tccfn/TCC1/meu-projeto-tcc';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.env') || file.endsWith('.json') || file.endsWith('.sql')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(srcDir);
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('service_role') || content.includes('postgres://') || content.includes('postgresql://') || content.includes('SUPABASE_SERVICE')) {
    console.log(`File: ${file}`);
  }
});

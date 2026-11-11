import { exec } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const raiz = import.meta.dirname;
const porta = Number(process.argv[2] || 8765);
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, 'http://local').pathname);
  if (caminho.endsWith('/')) caminho += 'index.html';
  const arquivo = resolve(raiz, `.${caminho}`);
  // .wasm e worker precisam de http, por isso a página não abre por file://
  if (!arquivo.startsWith(raiz + sep)) {
    res.writeHead(403).end('403');
    return;
  }
  try {
    const dados = await readFile(arquivo);
    res.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] || 'application/octet-stream' });
    res.end(dados);
  } catch {
    res.writeHead(404).end('404');
  }
}).listen(porta, () => {
  const url = `http://localhost:${porta}/`;
  console.log(`Alterar Situacao ADN em ${url}  (Ctrl+C para parar)`);
  if (!process.argv.includes('--no-open')) exec(`start "" "${url}"`);
});

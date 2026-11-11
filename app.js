import { Archive } from './vendor/libarchive.js';
import { alterar } from './adn.js';

const ehXml = (nome) => /\.xml$/i.test(nome);
const ehPacote = (nome) => /\.(zip|rar|7z)$/i.test(nome);
const $ = (id) => document.getElementById(id);

const ROTULO = {
  alterado: ['Alterado', 'ok'],
  ja: ['Já estava Processado com Sucesso', 'neutro'],
  sem: ['Sem a tag Em Processamento', 'neutro'],
  codificacao: ['Ignorado: não é UTF-8 (arquivo intacto)', 'ruim'],
  erro: ['Erro ao ler o arquivo', 'ruim'],
};

const entradas = new Map(); // caminho -> File
let resultados = [];

/* ---------- fila ---------- */
function adicionar(lista) {
  for (const f of lista) {
    const caminho = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
    entradas.set(caminho, f);
  }
  desenharFila();
}

function desenharFila() {
  const nomes = [...entradas.keys()];
  $('fila').hidden = nomes.length === 0;
  $('filaResumo').textContent = `${nomes.length} arquivo(s) na fila`;
  const ul = $('filaLista');
  ul.textContent = '';
  for (const nome of nomes) {
    const li = document.createElement('li');
    li.textContent = nome;
    ul.appendChild(li);
  }
  $('btnProcessar').disabled = nomes.length === 0;
}

function limpar() {
  entradas.clear();
  resultados = [];
  desenharFila();
  $('resultado').hidden = true;
  $('estadoVazio').hidden = false;
  $('aviso').textContent = '';
  $('aviso').className = 'aviso';
  $('btnProcessar').disabled = true;
}

/* ---------- processamento ---------- */
async function lerXmls() {
  const xmls = [];
  const ignorados = [];
  for (const [caminho, file] of entradas) {
    if (ehXml(caminho)) {
      xmls.push({ caminho, file });
    } else if (ehPacote(caminho)) {
      $('aviso').textContent = `Abrindo ${caminho}…`;
      const aberto = await Archive.open(file);
      try {
        for (const item of await aberto.getFilesArray()) {
          if (!ehXml(item.file.name)) continue;
          const pasta = item.path.replace(/\/$/, '');
          xmls.push({ caminho: pasta ? `${pasta}/${item.file.name}` : item.file.name, file: await item.file.extract() });
        }
      } finally {
        await aberto.close();
      }
    } else {
      ignorados.push(caminho);
    }
  }
  return { xmls, ignorados };
}

async function processar() {
  $('btnProcessar').disabled = true;
  $('btnBaixar').disabled = false;
  $('aviso').className = 'aviso';
  $('resultado').hidden = true;
  resultados = [];

  try {
    const { xmls, ignorados } = await lerXmls();

    for (let i = 0; i < xmls.length; i++) {
      const { caminho, file } = xmls[i];
      $('aviso').textContent = `Processando ${i + 1}/${xmls.length}: ${caminho}`;
      try {
        const original = new Uint8Array(await file.arrayBuffer());
        const r = alterar(original);
        resultados.push({ caminho, ...r, original: r.status === 'alterado' ? original : null });
      } catch (e) {
        resultados.push({ caminho, status: 'erro', bytes: null, original: null, motivo: e.message });
      }
    }

    mostrarResultado(ignorados);
  } catch (e) {
    $('aviso').className = 'aviso erro';
    $('aviso').textContent = `Falha ao ler os arquivos: ${e.message}`;
    $('btnProcessar').disabled = entradas.size === 0;
  }
}

function mostrarResultado(ignorados) {
  const contar = (st) => resultados.filter((r) => r.status === st).length;
  $('stAlterados').textContent = contar('alterado');
  $('stJa').textContent = contar('ja');
  $('stSem').textContent = contar('sem');
  $('stErro').textContent = contar('codificacao') + contar('erro');

  const corpo = $('corpoTabela');
  corpo.textContent = '';
  for (const r of resultados) {
    const [texto, classe] = ROTULO[r.status] || [r.status, ''];
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    td1.textContent = r.caminho;
    const td2 = document.createElement('td');
    td2.className = classe;
    td2.textContent = r.status === 'erro' && r.motivo ? `${texto}: ${r.motivo}` : texto;
    tr.append(td1, td2);
    corpo.appendChild(tr);
  }

  const temResultado = resultados.length > 0;
  $('resultado').hidden = !temResultado;
  $('estadoVazio').hidden = temResultado;
  $('btnProcessar').disabled = entradas.size === 0;
  $('btnBaixar').disabled = !resultados.some((r) => r.bytes);

  const partes = [`${resultados.length} XML(s) analisado(s)`];
  if (ignorados.length) partes.push(`${ignorados.length} arquivo(s) fora do padrão ignorado(s)`);
  $('aviso').textContent = partes.join(' · ');
}

/* ---------- download ---------- */
async function baixar() {
  const arquivos = new Map(); // pathname -> bytes
  for (const r of resultados) {
    if (!r.bytes) continue;
    arquivos.set(r.caminho, r.bytes);
    if (r.original) arquivos.set(`originais/${r.caminho}`, r.original);
  }
  if (!arquivos.size) {
    $('baixarInfo').textContent = 'Nada para baixar.';
    return;
  }

  $('btnBaixar').disabled = true;
  $('baixarInfo').textContent = 'Montando o ZIP…';
  try {
    const zip = new JSZip(); // global via <script> em index.html
    for (const [caminho, bytes] of arquivos) zip.file(caminho, bytes);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xml-situacao-adn-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('baixarInfo').textContent = `${arquivos.size} arquivo(s) no ZIP, com a pasta originais/.`;
  } catch (e) {
    $('baixarInfo').textContent = `Falha ao montar o ZIP: ${e.message}`;
  } finally {
    $('btnBaixar').disabled = false;
  }
}

/* ---------- eventos ---------- */
$('btnPasta').onclick = () => $('inPasta').click();
$('btnArquivos').onclick = () => $('inArquivos').click();
$('btnPacote').onclick = () => $('inPacote').click();
$('inPasta').onchange = (e) => adicionar(e.target.files);
$('inArquivos').onchange = (e) => adicionar(e.target.files);
$('inPacote').onchange = (e) => adicionar(e.target.files);
$('btnProcessar').onclick = processar;
$('btnBaixar').onclick = baixar;
$('btnLimpar').onclick = limpar;

const drop = $('drop');
drop.ondragover = (e) => {
  e.preventDefault();
  drop.classList.add('is-drag');
};
drop.ondragleave = () => drop.classList.remove('is-drag');
drop.ondrop = (e) => {
  e.preventDefault();
  drop.classList.remove('is-drag');
  adicionar(e.dataTransfer.files);
};

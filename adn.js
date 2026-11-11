// Regra do Alterar-SituacaoAdn.ps1: troca a tag nos XMLs, preservando o BOM.
export const ANTIGO = '<SituacaoAdn>Em Processamento</SituacaoAdn>';
export const NOVO = '<SituacaoAdn>Processado com Sucesso</SituacaoAdn>';
const BOM = new Uint8Array([0xEF, 0xBB, 0xBF]);

// Devolve { status, bytes }: status = alterado | ja | sem | codificacao
export function alterar(bytes) {
  const comBom = bytes.length > 2 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
  const corpo = comBom ? bytes.subarray(3) : bytes;

  let texto;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(corpo);
  } catch {
    // Diferente do .ps1, que corromperia o arquivo: aqui ele fica intacto.
    return { status: 'codificacao', bytes };
  }

  if (texto.includes(NOVO)) return { status: 'ja', bytes };
  if (!texto.includes(ANTIGO)) return { status: 'sem', bytes };

  const novo = new TextEncoder().encode(texto.split(ANTIGO).join(NOVO));
  if (!comBom) return { status: 'alterado', bytes: novo };

  const saida = new Uint8Array(novo.length + 3);
  saida.set(BOM, 0);
  saida.set(novo, 3);
  return { status: 'alterado', bytes: saida };
}

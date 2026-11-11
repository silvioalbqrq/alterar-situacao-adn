// node test.js
import assert from 'node:assert';
import { alterar } from './adn.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const xml = (situacao) => enc.encode(`<NFSE><SituacaoAdn>${situacao}</SituacaoAdn></NFSE>`);

const r1 = alterar(xml('Em Processamento'));
assert.equal(r1.status, 'alterado');
assert.equal(dec.decode(r1.bytes), '<NFSE><SituacaoAdn>Processado com Sucesso</SituacaoAdn></NFSE>');
assert.notEqual(r1.bytes[0], 0xEF); // sem BOM na entrada, sem BOM na saida

const comBom = new Uint8Array([0xEF, 0xBB, 0xBF, ...xml('Em Processamento')]);
const r2 = alterar(comBom);
assert.equal(r2.status, 'alterado');
assert.deepEqual([...r2.bytes.slice(0, 3)], [0xEF, 0xBB, 0xBF]);
assert.equal(r2.bytes[3], 0x3C);

assert.equal(alterar(r1.bytes).status, 'ja'); // idempotente
assert.equal(alterar(xml('Cancelado')).status, 'sem');
assert.equal(alterar(enc.encode('Situa\u00e7\u00e3o')).status, 'sem'); // acento ok em UTF-8

const latin1 = new Uint8Array([0x3C, 0x53, 0x69, 0x74, 0x75, 0x61, 0xE7, 0xE3, 0x6F, 0x3E]);
assert.equal(alterar(latin1).status, 'codificacao');

console.log('OK: alterar() passou nos 7 testes');

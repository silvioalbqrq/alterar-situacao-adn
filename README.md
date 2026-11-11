# Alterar Situação ADN (XML de NFS-e)

Site que faz o mesmo que o `Alterar-SituacaoAdn.ps1`: troca

```xml
<SituacaoAdn>Em Processamento</SituacaoAdn>
```

por

```xml
<SituacaoAdn>Processado com Sucesso</SituacaoAdn>
```

nos XMLs de NFS-e. Aceita **pasta**, **vários XMLs soltos**, **.zip** e **.rar** (e 7z). Roda no
navegador: o arquivo não é enviado para nenhum servidor.

## Como abrir

Duplo clique em `iniciar.bat` (precisa do Node.js instalado). Ele sobe um servidor local em
`http://localhost:8765` e abre o navegador. Ou:

```
npm start          # node server.js
```

> Tem que ser por `http://`. Abrindo o `index.html` direto (`file://`) o navegador bloqueia o
> WebAssembly que lê .zip/.rar.

Para publicar, é só subir a pasta em qualquer hospedagem estática (S3, Netlify, GitHub Pages).

## Como usar

1. **Escolher pasta** (ou arrastar os arquivos) e, se quiser, misturar .zip/.rar.
2. **Processar**.
3. **Baixar ZIP**: os XMLs corrigidos nas mesmas pastas, mais `originais/` com o conteúdo de antes.

## Igual ao script, e um pouco melhor

| | `.ps1` | Site |
|---|---|---|
| XML já com "Processado com Sucesso" | ignora (pode rodar várias vezes) | igual |
| Backup do original | pasta `originais/` ao lado | `originais/` dentro do ZIP, nunca sobrescrito |
| UTF-8 com/sem BOM | preserva | igual |
| Arquivo em outra codificação | corromperia o texto | deixa intacto e avisa no resultado |
| Subpastas | não entra | busca em todas as subpastas do .zip/.rar |

## Testes

```
npm test      # node test.js: 7 casos da regra de substituição (BOM, idempotência, não-UTF-8)
```

## Arquivos

- `index.html`, `styles.css`, `app.js` — a página
- `adn.js` — a regra de substituição (sem DOM, testável)
- `server.js`, `iniciar.bat` — servidor estático local de 40 linhas, sem dependências
- `vendor/libarchive.js` + `worker-bundle.js` + `libarchive.wasm` — leitura de zip/rar/7z (Apache-2.0)
- `vendor/jszip.min.js` — geração do ZIP de saída (MIT)

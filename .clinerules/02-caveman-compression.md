# Regra: Compressão Caveman

## O que é
Compressão semântica lossless que remove apenas elementos previsíveis (gramática, conectivos, palavras de preenchimento) mantendo todos os factos e informações essenciais.

## Quando aplicar

### ✅ Deve comprimir:
- System prompts
- Chain-of-thought interno do agente
- Documentação técnica e contextos RAG
- Instruções repetitivas

### ❌ Não deve comprimir:
- Mensagens finais para o utilizador
- Conteúdo legal ou contratos
- Texto onde a formatação original é crítica

## Métodos disponíveis

| Método | Script | Redução | Custo | Velocidade |
|--------|--------|---------|-------|------------|
| NLP | `caveman_compress_nlp.py` | 15-30% | Grátis, offline | <100ms |
| MLM | `caveman_compress_mlm.py` | 20-30% | Grátis, offline | 1-5s |
| LLM | `caveman_compress.py` | 40-58% | Requer API key | ~2s |

## Configuração recomendada

```javascript
const compressionMethod = process.env.COMPRESSION_METHOD || 'mlm';
const compressedPrompt = await compressText(longPrompt, compressionMethod);

Integração com Memory Bank
Regista sempre:

Método usado

Tamanho original vs comprimido

Redução percentual

Exemplo
Original (171 tokens) → Comprimido (72 tokens) → 58% redução

O LLM consegue interpretar o formato caveman nativamente, sem necessidade de descompressão.
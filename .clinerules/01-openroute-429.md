# Regra: Tratamento de erro 429 da API OpenRouteService

## Contexto
A API OpenRouteService (ou qualquer API com limites de 20 req/min e 50 req/dia) pode retornar erro 429 Too Many Requests quando os limites são excedidos.

## Comportamento obrigatório

### 1. Rate Limiter Local (antes da chamada)
- **Limite por minuto:** 20 pedidos
- **Limite por dia:** 50 pedidos
- Implementa um token bucket ou sliding window para controlar localmente.
- Guarda o estado no Memory Bank para persistência entre tarefas.

### 2. Cache Inteligente
- **Geocoding:** TTL de 24 horas
- **Rotas (directions):** TTL de 5 minutos
- **Metadata da API:** TTL de 1 semana
- Se o cache expirar mas o limite diário estiver esgotado, usa cache stale com aviso.

### 3. Paralelismo Controlado
- Máximo de **3 pedidos concorrentes** usando semáforo.
- Os restantes ficam em fila, respeitando o rate limiter.

### 4. Tratamento do erro 429
Se receberes um 429:
- Respeita o header `Retry-After` se existir.
- Se não existir, aplica backoff exponencial com jitter:
    wait = min(60, 2^tentativa) + random() * 0.5
- Máximo de **5 tentativas**.
- Regista o evento no Memory Bank.

### 5. Fallback Offline
Se após 5 tentativas o erro persistir ou o limite diário estiver esgotado:
- Tenta cache expirado (stale-while-revalidate).
- Para rotas, devolve estimativa (linha reta + fator 1.4).
- Adiciona header/flag `X-Stale: true` ou `X-Fallback: true`.

### 6. Memory Bank
Sempre que interagires com a API, atualiza o ficheiro `.cline/memory_bank.md` com:
- `requests_today` e `remaining_today`
- `last_request_timestamp`
- `cache_hits` e `cache_misses`
- `compression_stats` (se usares compressão caveman)

## Código de referência
Usa a implementação em `src/openroute-client.js` como base. Nunca chames a API diretamente sem passar por este cliente.
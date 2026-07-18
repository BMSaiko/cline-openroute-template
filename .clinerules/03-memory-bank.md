# Regra: Cline Memory Bank

## O que é
O Memory Bank é um sistema de persistência de contexto que permite ao Cline "lembrar-se" de informações entre diferentes tarefas e sessões.

## Localização
`.cline/memory_bank.md` (na raiz do projeto)

## Estrutura obrigatória

```markdown
# Memory Bank – [Nome do Projeto]

## Última atualização: ISO timestamp

### Rate Limiting (OpenRoute API)
- Limite diário: X/50
- Limite por minuto: Y/20
- Último 429: timestamp ou "nunca"
- Retry-After recebido: X segundos
- Tentativas consecutivas: Z

### Compressão Caveman
- Método ativo: mlm/nlp/llm
- Redução média: XX%
- Última compressão: [contexto] (original X → Y tokens)

### Cache
- Tamanho atual: N entradas
- Cache hits hoje: X
- Cache misses hoje: Y
- Taxa de acerto: XX%

### Estado do Projeto
- Tarefa atual: [descrição]
- Próximos passos: [lista]
- Decisões técnicas: [lista]

### Alertas
- [ ] Limite diário próximo (>=40/50)
- [ ] Muitos 429 consecutivos (>3)
- [ ] Cache com TTL a expirar
Regras de atualização
Após cada pedido à API – atualiza rate limiting e cache.

Após cada compressão – regista a redução.

Ao iniciar uma nova tarefa – lê o estado atual antes de agir.

Ao detetar anomalias (ex: 429 repetidos) – adiciona alerta e sugere ação.

Ações automáticas baseadas no Memory Bank
Se remaining_today < 10 → activa compressão mais agressiva.

Se remaining_today == 0 → usa apenas cache + fallback offline.

Se consecutive_429_count > 3 → sugere comprar mais créditos ou aumentar intervalo entre pedidos.
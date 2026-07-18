# 🚀 Cline OpenRoute Resilience Template

Template para projetos que usam **Cline CLI** com integração à **API OpenRouteService** (ou qualquer API com limites de 20 req/min e 50 req/dia).

## ✨ Funcionalidades

- ✅ **Rate Limiter local** (20 req/min, 50 req/dia) – evita 429 antes de acontecer
- ✅ **Cache inteligente** com TTL variável (5 min rotas, 24h geocoding)
- ✅ **Semáforo de concorrência** (max 3 pedidos simultâneos)
- ✅ **Backoff exponencial com jitter** + respeito ao header `Retry-After`
- ✅ **Fallback offline** (cache expirado + estimativa de rotas)
- ✅ **Compressão caveman** integrada (redução de 40-58% tokens)
- ✅ **Memory Bank** persistente (contexto entre tarefas do Cline)
- ✅ **Testes de resiliência** (simulação de 429)

## 📦 Instalação

```bash
# Clona o template (ou cria a partir do template no GitHub)
git clone <seu-repo>
cd <projeto>

# Instala dependências
npm install

# Configura ambiente
cp .env.example .env
# Edita .env com a tua API key

🧪 Testar
bash
npm test
🎯 Usar com Cline
bash
cline
O Cline lê automaticamente as regras em .clinerules/.

📁 Estrutura
text
.
├── .clinerules/          # Regras para o Cline CLI
│   ├── 01-openroute-429.md
│   ├── 02-caveman-compression.md
│   └── 03-memory-bank.md
├── .cline/
│   └── memory_bank.md    # Persistência de contexto
├── src/
│   ├── openroute-client.js   # Cliente unificado
│   ├── rate-limiter.js
│   ├── cache.js
│   ├── semaphore.js
│   ├── compression.js
│   └── fallback.js
├── tests/
│   └── simulate-429.js   # Teste de resiliência
├── .env.example
├── package.json
└── README.md
🔧 Exemplo de uso
javascript
const { OpenRouteClient } = require('./src/openroute-client');
require('dotenv').config();

const client = new OpenRouteClient(process.env.OPENROUTE_API_KEY);

async function getRoute() {
  const result = await client.getDirections([
    [-8.629, 41.157],  // Porto
    [-8.648, 41.158]   // Gaia
  ]);
  console.log(result);
}

getRoute();
📝 Personalização
Ajusta os limites no construtor do OpenRouteClient:

javascript
const client = new OpenRouteClient(apiKey, {
  maxPerMinute: 20,    // limite por minuto
  maxPerDay: 50,       // limite diário
  maxConcurrency: 3,   // pedidos simultâneos
  compressionMethod: 'mlm'  // nlp, mlm, llm
});
🤝 Contribuir
Este é um template base. Sente-te à vontade para adaptar às tuas necessidades.

📄 Licença
MIT
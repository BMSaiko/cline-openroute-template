/**
 * Wrapper para compressão caveman
 * Suporta métodos: nlp, mlm, llm
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs');

// Detecta se o caveman-compression está disponível
const CAVEMAN_PATH = path.join(__dirname, '../caveman-compression');
const HAS_CAVEMAN = fs.existsSync(CAVEMAN_PATH);

async function compressText(text, method = 'mlm') {
  if (!text || text.length < 50) return text;
  if (!HAS_CAVEMAN) {
    console.warn('⚠️ caveman-compression não encontrado. Usando texto original.');
    return text;
  }

  const scriptMap = {
    nlp: 'caveman_compress_nlp.py',
    mlm: 'caveman_compress_mlm.py',
    llm: 'caveman_compress.py',
  };

  const script = scriptMap[method] || scriptMap.mlm;
  const scriptPath = path.join(CAVEMAN_PATH, script);

  if (!fs.existsSync(scriptPath)) {
    console.warn(`⚠️ Script ${script} não encontrado. Usando texto original.`);
    return text;
  }

  try {
    // Escapa o texto para shell (simplificado)
    const escaped = text.replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
    const { stdout } = await execPromise(`python "${scriptPath}" compress "${escaped}"`);
    const compressed = stdout.trim();
    
    // Log da compressão
    const originalTokens = Math.ceil(text.length / 4);
    const compressedTokens = Math.ceil(compressed.length / 4);
    const reduction = ((1 - compressedTokens / originalTokens) * 100).toFixed(1);
    console.log(`📦 Compressão: ${originalTokens} → ${compressedTokens} tokens (${reduction}% redução)`);
    
    return compressed;
  } catch (err) {
    console.warn(`⚠️ Compressão falhou: ${err.message}`);
    return text;
  }
}

async function compressIfNeeded(text, options = {}) {
  const { method = 'mlm', minLength = 50, force = false } = options;
  
  if (!force && text.length < minLength) return text;
  return compressText(text, method);
}

module.exports = { compressText, compressIfNeeded };
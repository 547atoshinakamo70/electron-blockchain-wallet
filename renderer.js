const addressEl = document.getElementById('wallet-address');
const balanceEl = document.getElementById('wallet-balance');
const statusEl = document.getElementById('node-status');
const blocksListEl = document.getElementById('blocks-list');
const logEl = document.getElementById('log');
const langSelect = document.getElementById('lang-select');

let currentAddress = null;
let currentLang = 'es';

// Diccionario multi-idioma
const translations = {
  es: { address: "Dirección", balance: "Saldo", node: "Estado nodo", waiting: "Esperando minería...", block: "Bloque" },
  en: { address: "Address", balance: "Balance", node: "Node status", waiting: "Waiting for mining...", block: "Block" },
  fr: { address: "Adresse", balance: "Solde", node: "État du nœud", waiting: "En attente de minage...", block: "Bloc" },
  de: { address: "Adresse", balance: "Kontostand", node: "Node-Status", waiting: "Warten auf Mining...", block: "Block" },
  zh: { address: "地址", balance: "余额", node: "节点状态", waiting: "等待挖矿...", block: "区块" },
  ja: { address: "アドレス", balance: "残高", node: "ノード状態", waiting: "マイニング待機中...", block: "ブロック" },
  ru: { address: "Адрес", balance: "Баланс", node: "Статус узла", waiting: "Ожидание майнинга...", block: "Блок" },
  ar: { address: "العنوان", balance: "الرصيد", node: "حالة العقدة", waiting: "في انتظار التعدين...", block: "كتلة" }
};

function setLanguage(lang) {
  currentLang = lang;
  document.querySelector('label[for="wallet-address"]').textContent = translations[lang].address;
  document.querySelector('label[for="wallet-balance"]').textContent = translations[lang].balance;
  document.querySelector('label[for="node-status"]').textContent = translations[lang].node;
  appendLog(`🌐 Idioma cambiado a ${lang}`);
}

// --- Función para log ---
function appendLog(msg) {
  const timestamp = new Date().toLocaleTimeString();
  logEl.textContent += `\n[${timestamp}] ${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}

// --- Carga dirección ---
async function loadWalletAddress() {
  const addr = await window.wallet.getAddress();
  if (!addr) { appendLog("No se encontró clave"); return; }
  currentAddress = addr;
  addressEl.textContent = addr;
  loadBalance();
}

// --- Balance ---
async function loadBalance() {
  if (!currentAddress) return;
  const data = await window.api.getBalance(currentAddress);
  balanceEl.textContent = `${data.balance || 0} Tokens`;
}

// --- Bloques ---
async function loadBlocks() {
  const data = await window.api.getChain();
  const chain = data.chain || [];
  blocksListEl.innerHTML = "";
  chain.slice(-10).reverse().forEach(block => {
    const li = document.createElement("li");
    li.textContent = `#${block.index} - TXs: ${block.transactions.length} - Hash: ${block.hash.slice(0,10)}...`;
    blocksListEl.appendChild(li);
  });
}

// --- CoinJoin simulado ---
function performCoinJoin() { appendLog("🔄 CoinJoin simulado ejecutado"); }

// --- VPN simulada ---
function connectVPN() { appendLog("🔐 VPN descentralizada simulada activa"); }

window.electron.on('node-log', (_, msg) => appendLog(`NODE: ${msg}`));
window.electron.on('block-mined', (_, msg) => { appendLog(`⛏ ${msg}`); loadBalance(); loadBlocks(); });
window.electron.on('rpc-ready', () => { statusEl.textContent = "✅ Nodo listo y minando..."; });

langSelect.addEventListener('change', e => setLanguage(e.target.value));

loadWalletAddress();
loadBlocks();
setInterval(loadBalance, 5000);
setInterval(loadBlocks, 8000);

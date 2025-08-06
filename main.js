const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');

// Importaciones correctas de ethereum-cryptography
const { getPublicKey } = require('ethereum-cryptography/secp256k1');
const { keccak256 } = require('ethereum-cryptography/keccak');

let mainWindow;
let nodeProc;

// Ajusta según tu alias o ruta a Python en Windows
const PYTHON_CMD = 'py'; 
const NODE_SCRIPT = 'blockchain_node.py';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
}

function handleLine(type, line) {
  const msg = line.trim();
  if (!msg) return;
  if (type === 'stdout') {
    console.log('[NODE LOG]', msg);
    mainWindow?.webContents.send('node-log', msg);
    if (msg.includes('Bloque minado')) {
      mainWindow?.webContents.send('block-mined', msg);
    }
  } else {
    console.error('[NODE ERR]', msg);
    mainWindow?.webContents.send('node-log', `[ERR] ${msg}`);
  }
}

function watchStream(stream, type) {
  let buffer = '';
  stream.on('data', chunk => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(line => handleLine(type, line));
  });
  stream.on('close', () => {
    if (buffer.length) handleLine(type, buffer);
  });
}

async function startNode() {
  nodeProc = spawn(PYTHON_CMD, [NODE_SCRIPT], { cwd: __dirname });

  watchStream(nodeProc.stdout, 'stdout');
  watchStream(nodeProc.stderr, 'stderr');

  nodeProc.on('exit', code => {
    console.log(`[NODE] terminado con código ${code}`);
    mainWindow?.webContents.send('node-log', `Nodo terminado con código ${code}`);
  });

  // Espera a que el RPC arranque
  await checkRPCReady();
}

async function checkRPCReady() {
  const url = 'http://127.0.0.1:5000/chain';
  while (true) {
    try {
      await axios.get(url, { timeout: 2000 });
      console.log('[NODE] RPC listo');
      mainWindow?.webContents.send('rpc-ready', true);
      break;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

app.whenReady().then(() => {
  createWindow();
  startNode();
});

ipcMain.handle('get-address', () => {
  try {
    const keyPath = path.join(__dirname, 'miner_key.txt');
    if (!fs.existsSync(keyPath)) return null;

    const privHex = fs.readFileSync(keyPath, 'utf8').trim();
    const priv = Uint8Array.from(Buffer.from(privHex, 'hex'));

    // Llamada a getPublicKey directamente
    const pub = getPublicKey(priv, false); // false = sin comprimir
    const addr = '0x' + Buffer.from(keccak256(pub.slice(1))).slice(-20).toString('hex');

    console.log('[MAIN] Dirección derivada:', addr);
    return addr;
  } catch (err) {
    console.error('[MAIN] Error generando dirección:', err);
    return null;
  }
});

ipcMain.handle('get-balance', async (_, addr) => {
  try {
    const res = await axios.get(`http://127.0.0.1:5000/balance?address=${addr}`);
    return res.data;
  } catch (err) {
    console.error('[MAIN] Error get-balance:', err.message);
    return { balance: 0 };
  }
});

ipcMain.handle('get-chain', async () => {
  try {
    const res = await axios.get('http://127.0.0.1:5000/chain');
    return res.data;
  } catch (err) {
    console.error('[MAIN] Error get-chain:', err.message);
    return { chain: [] };
  }
});

app.on('window-all-closed', () => {
  if (nodeProc) nodeProc.kill();
  if (process.platform !== 'darwin') app.quit();
});

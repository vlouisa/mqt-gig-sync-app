/** Lokale Edge-controle van de gegenereerde fictieve preview, zonder Google-services. */
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const directory = path.resolve(__dirname, '../coverage/admin-panel-preview');
const profile = fs.mkdtempSync(path.join(directory, 'edge-'));
const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless', '--disable-gpu', '--disable-background-networking', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  let socket;
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
    const port = fs.readFileSync(portFile, 'utf8').split('\n')[0];
    const pages = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
    socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const callbacks = new Map();
    const exceptions = [];
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (!message.id) {
        if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
        return;
      }
      const callback = callbacks.get(message.id);
      callbacks.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message)); else callback.resolve(message.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      callbacks.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    });
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: 300, height: 1100, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: pathToFileURL(path.join(directory, 'index.html')).href });
    let result;
    for (let i = 0; i < 100; i++) {
      result = await send('Runtime.evaluate', { expression: `document.getElementById('preview-tests')?.textContent`, returnByValue: true });
      if (result.result.value) break;
      await sleep(100);
    }
    const diagnostics = await send('Runtime.evaluate', { expression: `JSON.stringify({errors:window.previewErrors,calls:window.previewCalls,body:document.body.innerText})`, returnByValue: true });
    fs.writeFileSync(path.join(directory, 'browser-result.json'), diagnostics.result.value || '{}');
    fs.writeFileSync(path.join(directory, 'exceptions.json'), JSON.stringify(exceptions, null, 2));
    const html = await send('Runtime.evaluate', { expression: 'document.documentElement.outerHTML', returnByValue: true });
    fs.writeFileSync(path.join(directory, 'rendered.html'), html.result.value || '');
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(directory, 'overview.png'), Buffer.from(screenshot.data, 'base64'));
    const message = result.result.value || 'FAIL: browsercontrole niet afgerond';
    console.log(message);
    if (!message.startsWith('PASS:')) process.exitCode = 1;
    else {
      const overflow = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth > document.documentElement.clientWidth', returnByValue: true });
      if (overflow.result.value) throw new Error('Horizontale overflow bij 300 pixels.');
      await send('Runtime.evaluate', { expression: `document.getElementById('section').value = 'automation'; document.getElementById('section').dispatchEvent(new Event('change')); window.scrollTo(0,0);` });
      const automation = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(directory, 'automation.png'), Buffer.from(automation.data, 'base64'));
    }
    await send('Browser.close');
  } finally {
    if (socket) socket.close();
    edge.kill();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });

const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const FRPS_API = 'http://150.158.146.192:7500';
const FRPS_AUTH = { username: 'admin', password: 'DqtuuVMBIDUGPlMmxik9rlHc' };

const MANAGED_DEVICES = {
  local: {
    name: '4060Ti-Server',
    prefix: '4060ti',
    frpcToml: '/opt/frp/frpc.toml',
    isLocal: true,
    restartCmd: 'sudo systemctl restart frpc',
  },
  mac: {
    name: 'MacBook Pro',
    prefix: 'mac',
    ssh: { host: '150.158.146.192', port: 6104, user: 'wq' },
    frpcToml: '/Users/wq/.config/frp/frpc.toml',
    restartCmd: 'launchctl unload /Users/wq/Library/LaunchAgents/com.frp.frpc.plist && launchctl load /Users/wq/Library/LaunchAgents/com.frp.frpc.plist',
  },
  rpi: {
    name: '树莓派',
    prefix: 'rpi',
    ssh: { host: '150.158.146.192', port: 6250, user: 'wq' },
    frpcToml: '/opt/frp/frpc.toml',
    restartCmd: 'sudo systemctl restart frpc',
  },
  lab: {
    name: '实验室服务器',
    prefix: 'lab',
    ssh: { host: '150.158.146.192', port: 6260, user: 'optics' },
    frpcToml: '/opt/frp/frpc.toml',
    restartCmd: 'sudo systemctl restart frpc',
  },
  walnutpi: {
    name: 'WalnutPi',
    prefix: 'walnutpi',
    ssh: { host: '150.158.146.192', port: 6230, user: 'root' },
    frpcToml: '/opt/frp/frpc.toml',
    restartCmd: 'systemctl restart frpc',
  },
  taishanpi: {
    name: 'TaishanPi-3M RK3576',
    prefix: 'taishanpi',
    ssh: { host: '150.158.146.192', port: 6277, user: 'root' },
    frpcToml: '/opt/frp/frpc.toml',
    restartCmd: 'systemctl restart frpc',
  },
  taishangray: {
    name: 'Taishan Macintosh Gray',
    prefix: 'taishan-gray',
    ssh: { host: '150.158.146.192', port: 6278, user: 'root' },
    frpcToml: '/opt/frp/frpc.toml',
    restartCmd: 'systemctl restart frpc',
  },
  taishanblack: {
    name: 'Taishan Macintosh Black',
    prefix: 'taishan-black',
    ssh: { host: '150.158.146.192', port: 6279, user: 'root' },
    frpcToml: '/opt/frp/frpc.toml',
    restartCmd: 'systemctl restart frpc',
  },
};

function getDeviceIdByName(tunnelName) {
  for (const [id, dev] of Object.entries(MANAGED_DEVICES)) {
    if (tunnelName === dev.prefix || tunnelName.startsWith(dev.prefix + '-')) return id;
  }
  return null;
}

function sshRun(deviceId, cmd) {
  const dev = MANAGED_DEVICES[deviceId];
  if (dev.isLocal) return execSync(cmd, { encoding: 'utf8', timeout: 15000 });
  const { host, port, user } = dev.ssh;
  const safe = cmd.replace(/'/g, "'\\''");
  return execSync(
    `ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${port} ${user}@${host} '${safe}'`,
    { encoding: 'utf8', timeout: 15000 }
  );
}

function readToml(deviceId) {
  const dev = MANAGED_DEVICES[deviceId];
  if (dev.isLocal) return execSync(`sudo cat ${dev.frpcToml}`, { encoding: 'utf8' });
  return sshRun(deviceId, `cat ${dev.frpcToml}`);
}

function writeToml(deviceId, content) {
  const dev = MANAGED_DEVICES[deviceId];
  const b64 = Buffer.from(content).toString('base64');
  if (dev.isLocal) {
    execSync(`echo '${b64}' | base64 -d | sudo tee ${dev.frpcToml}`, { encoding: 'utf8' });
  } else {
    sshRun(deviceId, `echo '${b64}' | base64 -d > ${dev.frpcToml}`);
  }
}

function restartFrpc(deviceId) {
  const dev = MANAGED_DEVICES[deviceId];
  sshRun(deviceId, dev.restartCmd);
}

function parseTunnels(toml) {
  const tunnels = [];
  const blocks = toml.split(/\[\[proxies\]\]/g).slice(1);
  for (const block of blocks) {
    const get = (key) => { const m = block.match(new RegExp(`${key}\\s*=\\s*"?([^"\\n]+)"?`)); return m ? m[1].trim() : ''; };
    tunnels.push({ name: get('name'), type: get('type') || 'tcp', localIP: get('localIP') || '127.0.0.1', localPort: get('localPort'), remotePort: get('remotePort') });
  }
  return tunnels;
}

function addTunnelToToml(toml, tunnel) {
  return toml + `\n[[proxies]]\nname = "${tunnel.name}"\ntype = "${tunnel.type || 'tcp'}"\nlocalIP = "127.0.0.1"\nlocalPort = ${tunnel.localPort}\nremotePort = ${tunnel.remotePort}\n`;
}

function removeTunnelFromToml(toml, name) {
  return toml.replace(new RegExp(`\\n\\[\\[proxies\\]\\]\\nname = "${name}"[\\s\\S]*?(?=\\n\\[\\[proxies\\]\\]|$)`, 'g'), '');
}

// frps 全局数据
app.get('/api/proxies', async (req, res) => {
  try {
    const [tcp, http] = await Promise.all([
      axios.get(`${FRPS_API}/api/proxy/tcp`, { auth: FRPS_AUTH }),
      axios.get(`${FRPS_API}/api/proxy/http`, { auth: FRPS_AUTH }).catch(() => ({ data: { proxies: [] } })),
    ]);
    res.json([...(tcp.data.proxies || []), ...(http.data.proxies || [])]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/serverinfo', async (req, res) => {
  try {
    const r = await axios.get(`${FRPS_API}/api/serverinfo`, { auth: FRPS_AUTH });
    res.json(r.data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 所有受管设备的隧道列表 { deviceId: [tunnels] }
app.get('/api/tunnels', (req, res) => {
  const result = {};
  for (const id of Object.keys(MANAGED_DEVICES)) {
    try { result[id] = parseTunnels(readToml(id)); }
    catch (e) { result[id] = []; }
  }
  res.json(result);
});

// 创建隧道，body 中必须带 device 字段
app.post('/api/tunnels', (req, res) => {
  try {
    const { name, type, localPort, remotePort, device = 'local' } = req.body;
    if (!name || !localPort || !remotePort) return res.status(400).json({ error: '缺少必填字段' });
    if (!MANAGED_DEVICES[device]) return res.status(400).json({ error: '未知设备' });
    let toml = readToml(device);
    if (toml.includes(`name = "${name}"`)) return res.status(400).json({ error: '隧道名称已存在' });
    toml = addTunnelToToml(toml, req.body);
    writeToml(device, toml);
    restartFrpc(device);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 删除隧道，通过名称前缀自动确定设备
app.delete('/api/tunnels/:name', (req, res) => {
  try {
    const name = req.params.name;
    const deviceId = getDeviceIdByName(name);
    if (!deviceId) return res.status(404).json({ error: '找不到对应设备' });
    let toml = readToml(deviceId);
    toml = removeTunnelFromToml(toml, name);
    writeToml(deviceId, toml);
    restartFrpc(deviceId);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 受管设备列表（供前端下拉）
app.get('/api/devices-config', (req, res) => {
  res.json(Object.entries(MANAGED_DEVICES).map(([id, dev]) => ({
    id, name: dev.name, prefix: dev.prefix,
  })));
});

app.listen(6128, () => console.log('frp-manager running on :6128'));

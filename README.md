# frp-manager

多设备 FRP 隧道管理面板。通过 Web UI 统一查看、创建、删除所有受管设备上的 FRP 隧道。

## 功能

- 实时查看 frps 上所有在线隧道（状态、流量、连接数）
- 按设备筛选隧道（全部 / 4060Ti / Mac / RPi / Lab / Orin / K7）
- 颜色标识区分不同设备来源
- 一键在任意受管设备上创建 / 删除隧道（自动 SSH 操作远程 frpc.toml 并重启服务）
- 服务器信息总览（版本、连接数、流量统计）

## 架构

```
公网服务器 (frps) 150.158.146.192
         ↑
4060Ti-Server（frp-manager 运行在此）
  ├── SSH → MacBook Pro  (:6104)
  ├── SSH → 树莓派        (:6250)
  ├── SSH → 实验室服务器  (:6260)
  └── SSH → KICKPI K7    (:6276)
```

frp-manager 部署在 4060Ti 上，通过 SSH 密钥免密登录其余设备，直接读写远程 `frpc.toml` 并重启 frpc 服务。

## 设备清单

| ID | 设备 | 公网 SSH 端口 | frpc.toml 路径 |
|----|------|--------------|----------------|
| `local` | 4060Ti-Server | 6004 | `/opt/frp/frpc.toml` |
| `mac` | MacBook Pro | 6104 | `~/.config/frp/frpc.toml` |
| `rpi` | 树莓派 | 6250 | `/opt/frp/frpc.toml` |
| `lab` | 实验室服务器 | 6260 | `/opt/frp/frpc.toml` |
| `k7` | KICKPI K7 / RK3576 | 6276 | `/opt/frp/frpc.toml` |

## 前置条件

1. **SSH 密钥免密**：4060Ti 的 `~/.ssh/id_rsa.pub` 已追加到所有远程设备的 `~/.ssh/authorized_keys`
2. **免密 sudo**：RPi / Lab 的 `/etc/sudoers.d/frpc-restart` 允许 `systemctl restart frpc` 无密码
3. Node.js 18+，pm2

## 快速开始

```bash
git clone https://github.com/wangqioo/frp-manager.git
cd frp-manager
npm install

# 修改 index.js 中的 FRPS_API / FRPS_AUTH / MANAGED_DEVICES
# 然后启动
pm2 start index.js --name frp-manager
```

面板地址：`http://<host>:6128`

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/proxies` | frps 全量隧道列表 |
| GET | `/api/serverinfo` | frps 服务器信息 |
| GET | `/api/tunnels` | 各受管设备的 toml 配置隧道 |
| GET | `/api/devices-config` | 受管设备列表 |
| POST | `/api/tunnels` | 创建隧道（body: `name/type/localPort/remotePort/device`）|
| DELETE | `/api/tunnels/:name` | 删除隧道（按名称前缀自动路由到对应设备）|

## 隧道命名规范

`<设备前缀>-<服务名>`，例如：`4060ti-ssh`、`mac-vnc`、`rpi-http`、`lab-web`

前缀决定隧道归属哪台设备（`getDeviceIdByName` 自动匹配）。

## 运维

```bash
pm2 logs frp-manager   # 查看日志
pm2 restart frp-manager

# frps 允许端口范围：6000-6299 · 7001-7999 · 10000-20000
```

详细端口分配见 [FRP隧道配置手册.md](./FRP隧道配置手册.md)。

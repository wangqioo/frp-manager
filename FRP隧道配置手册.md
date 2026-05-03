# FRP 隧道配置手册

> 最后更新：2026-05-04

## 架构

```
公网服务器 (frps) 150.158.146.192
├── 4060Ti-Server  192.168.1.39  → :6004
└── Orin Nano      192.168.1.9
```

---

## frps 服务端

- 配置：`/opt/frp/frps.toml`
- Token：`D3DW87VREu1q5sMKWpqizcCF9u9ue4UP`
- Dashboard：`http://150.158.146.192:7500`（admin / DqtuuVMBIDUGPlMmxik9rlHc）
- 允许端口：`6000-6299` · `7001-7999` · `10000-20000`
- 服务：`systemctl status frps`

---

## 4060Ti-Server（192.168.1.39）

- 配置：`/opt/frp/frpc.toml`
- 服务：`systemctl status frpc`
- 面板管理：`pm2 status frp-manager`

### 端口分配

| 公网端口 | 服务 | 本地端口 |
|---------|------|---------|
| 6004 | SSH | 22 |
| 6041 | JupyterLab | 8888 |
| 6042 | VS Code Server | 8080 |
| 6043 | vLLM API | 8000 |
| 6044 | ComfyUI | 7860 |
| 6045 | Nextcloud | 8081 |
| 6128 | frp-manager 面板 | 6128 |

---

## Orin Nano（192.168.1.9）

- 账号：`nvidia` / 密码：`nvidia`
- 配置：`/opt/frp/frpc.toml`
- 重启 frpc：`echo 'nvidia' | sudo -S systemctl restart frpc`

### 端口分配

| 公网端口 | 服务 | 本地端口 |
|---------|------|---------|
| 6204 | Web | 80 |
| 6205 | Caddy HTTPS | 443 |

---

## 常用命令

```bash
# 查看所有在线隧道（或直接访问面板）
curl -s -u admin:DqtuuVMBIDUGPlMmxik9rlHc \
  http://150.158.146.192:7500/api/proxy/tcp | python3 -m json.tool

# SSH 登录 4060Ti-Server
ssh -p 6004 wq@150.158.146.192

# Orin Nano 重启 frpc
ssh nvidia@192.168.1.9 "echo 'nvidia' | sudo -S systemctl restart frpc"
```

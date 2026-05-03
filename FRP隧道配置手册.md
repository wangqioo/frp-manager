# FRP 隧道配置手册

> 最后更新：2026-05-04

## 架构总览

```
公网服务器 (frps)
  IP: 150.158.146.192
  frps 端口: 7000
  API/Dashboard: :7500
  frp-manager 面板: http://150.158.146.192:6128/

局域网设备 (frpc 客户端)
  4060Ti-Server — WiFi: 192.168.1.39  | 公网 SSH: :6004
  Orin Nano     — WiFi: 192.168.1.9   | —
```

---

## frps 服务端（150.158.146.192）

- 配置目录：`/opt/frp/`
- 认证 Token：`D3DW87VREu1q5sMKWpqizcCF9u9ue4UP`
- 管理 API：`http://127.0.0.1:7500`（Basic Auth: admin/DqtuuVMBIDUGPlMmxik9rlHc）
- 服务管理：`systemctl status frps`

---

## frpc 客户端配置

### 4060Ti-Server（192.168.1.39）

- 系统：Ubuntu 24.04 LTS
- GPU：NVIDIA RTX 4060 Ti 8GB
- 配置文件：`/opt/frp/frpc.toml`
- 服务：`systemctl status frpc`
- serverAddr 直连：`150.158.146.192:7000`

#### frpc.toml

```toml
serverAddr = "150.158.146.192"
serverPort = 7000
auth.method = "token"
auth.token = "D3DW87VREu1q5sMKWpqizcCF9u9ue4UP"
transport.heartbeatInterval = 30
transport.heartbeatTimeout = 90

[[proxies]]
name = "4060ti-ssh"
type = "tcp"
localIP = "127.0.0.1"
localPort = 22
remotePort = 6004

[[proxies]]
name = "4060ti-jupyter"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8888
remotePort = 6041

[[proxies]]
name = "4060ti-vscode"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8080
remotePort = 6042

[[proxies]]
name = "4060ti-vllm"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8000
remotePort = 6043

[[proxies]]
name = "4060ti-comfyui"
type = "tcp"
localIP = "127.0.0.1"
localPort = 7860
remotePort = 6044

[[proxies]]
name = "4060ti-nextcloud"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8081
remotePort = 6045

[[proxies]]
name = "4060ti-frpmanager"
type = "tcp"
localIP = "127.0.0.1"
localPort = 6128
remotePort = 6128
```

### Orin Nano（192.168.1.9）

- 系统账号：`nvidia` / 密码：`nvidia`
- 配置文件：`/opt/frp/frpc.toml`
- 服务管理：`echo 'nvidia' | sudo -S systemctl restart frpc`
- serverAddr 直连：`150.158.146.192:7000`

---

## 端口分配表

| 远程端口 | 设备 | 服务 | 备注 |
|---------|------|------|------|
| 6004 | 4060Ti-Server | SSH :22 | — |
| 6041 | 4060Ti-Server | JupyterLab :8888 | — |
| 6042 | 4060Ti-Server | VS Code Server :8080 | — |
| 6043 | 4060Ti-Server | vLLM API :8000 | — |
| 6044 | 4060Ti-Server | ComfyUI :7860 | — |
| 6045 | 4060Ti-Server | Nextcloud :8081 | — |
| 6128 | 4060Ti-Server | frp-manager 面板 :6128 | — |
| 6204 | Orin Nano | Web :80 | — |
| 6205 | Orin Nano | Caddy HTTPS :443 | 自签证书 |

---

## frp-manager 管理面板

- 位置：`/home/wq/frp-manager/`（4060Ti-Server）
- 访问：`http://150.158.146.192:6128/`
- 进程管理：`pm2 status frp-manager`
- 功能：显示所有在线隧道，支持新建/删除本机隧道，端口冲突检测

---

## 常用运维命令

```bash
# 查看 frps 上所有在线代理
curl -s -u admin:DqtuuVMBIDUGPlMmxik9rlHc \
  http://150.158.146.192:7500/api/proxy/tcp | python3 -m json.tool

# SSH 登录 4060Ti-Server
ssh -p 6004 wq@150.158.146.192

# Orin Nano 重启 frpc
ssh nvidia@192.168.1.9 "echo 'nvidia' | sudo -S systemctl restart frpc"
```

---

## 历史问题与解决方案

| 问题 | 原因 | 解决 |
|------|------|------|
| Mac Mini frpc 反复 EOF 断线 | ISP DPI 拦截 frp HTTP/2 协议指纹 | SSH 隧道绕过 DPI（已下线） |
| Orin Nano frpc 重启需 sudo 密码 | systemctl 需要交互认证 | `echo 'nvidia' \| sudo -S` 管道方式 |
| Spark1/Spark2 下线 | 设备清退 | 2026-05-03 从 frps 清除全部相关隧道 |
| Mac Mini 下线 | 设备清退 | 2026-05-04 从 frps 清除全部相关隧道 |

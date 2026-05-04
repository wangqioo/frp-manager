# Homelab Infrastructure

家庭实验室基础设施配置手册。

## 设备清单

| 设备 | 局域网 IP | 公网 SSH | 备注 |
|------|-----------|----------|------|
| 公网服务器 | 150.158.146.192 | — | 上海腾讯云，运行 frps |
| 4060Ti-Server | 192.168.1.39 | :6004 | RTX 4060 Ti，主力 AI 开发机 |
| MacBook Pro | 动态 DHCP | :6104 | 开发用 Mac，frpc via Homebrew |
| 树莓派 | 动态 DHCP | :6250 | 边缘设备，SSH via cpolar + frp |
| Orin Nano | 192.168.1.9 | — | 边缘推理设备 |

## 文档

| 文件 | 内容 |
|------|------|
| [FRP隧道配置手册.md](./FRP隧道配置手册.md) | FRP 配置、端口分配表、运维命令 |

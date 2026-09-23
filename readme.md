# 🐙 Gurita Panel

A VPS management panel inspired by Pterodactyl — but built on **Node.js + JSON**, without Docker or SQL.

- **Backend:** Node.js (ES Modules), Express, WebSocket
- **Database:** JSON files with atomic writes + file locks
- **Process manager:** native `child_process` + cgroups v2 (when available)
- **Panel UI:** dark, responsive, no build step

---

## Requirements

- Linux VPS (Ubuntu 20.04+/Debian 11+ recommended)
- Node.js **>= 18.17**
- Root (for install) or a dedicated user with permission to write the install directory
- Optional: cgroups v2 for real resource limits

---

## Installation

```bash
git clone <your-repo> gurita-panel
cd gurita-panel
sudo GURITA_SRC=$PWD bash scripts/install.sh
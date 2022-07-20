---
author: Winding Tree Developers
---

# Readme

run server for dev - `yarn dev`

run swagger - `npx ts-node ./swagger/server.ts`

Prometheus implementation:
Set .env variables

```dotenv
APP_PROMETHEUS_PORT=9100
PROMETHEUS_ENABLED=true
```

```
http://localhost:9100/metrics - metrics api
```

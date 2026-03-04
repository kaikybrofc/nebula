# Nebula Cells (MVP)

Jogo de navegador inspirado em Nebulous.io, com UI em React e engine em Canvas.

## Comandos

- `npm run dev`: ambiente local
- `npm run server`: servidor WebSocket autoritativo (porta via `.env`, atual `3011`)
- `npm run build`: build de producao
- `npm run deploy`: deploy completo (frontend + reload Nginx + restart backend WS)

## Multiplayer local (MVP)

Em dois terminais:

1. `npm run server`
2. `npm run dev`

Abra duas abas em `http://localhost:5173` para ver os players em tempo real.

## Deploy na VPS com Nginx

O comando `npm run deploy` executa:

1. `vite build` (gera arquivos com hash no nome para cache bust)
2. `rsync --delete` para `/var/www/omnizap.xyz/current` (remove assets antigos)
3. `nginx -t`
4. `systemctl reload nginx`
5. `systemctl restart nebula-ws` (configuravel por env)

### Exemplo

```bash
npm run deploy
```

### Variaveis opcionais

```bash
DEPLOY_DIR=/var/www/omnizap.xyz/current SERVICE_NAME=nginx npm run deploy
```

Script usado: `scripts/deploy-nginx.sh`.

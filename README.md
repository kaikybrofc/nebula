# Nebula Cells (MVP)

Jogo de navegador inspirado em Nebulous.io, com UI em React e engine em Canvas.

## Comandos

- `npm run dev`: ambiente local
- `npm run build`: build de producao
- `npm run deploy`: build + publicacao no Nginx com cache bust

## Deploy na VPS com Nginx

O comando `npm run deploy` executa:

1. `vite build` (gera arquivos com hash no nome para cache bust)
2. `rsync --delete` para `/var/www/omnizap.xyz/current` (remove assets antigos)
3. `nginx -t`
4. `systemctl reload nginx`

### Exemplo

```bash
npm run deploy
```

### Variaveis opcionais

```bash
DEPLOY_DIR=/var/www/omnizap.xyz/current SERVICE_NAME=nginx npm run deploy
```

Script usado: `scripts/deploy-nginx.sh`.

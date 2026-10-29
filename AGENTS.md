# Project Guidelines & Server Deployment Instructions

## Server Deployment Rules
When providing deployment/update commands for the production server (Contabo), ALWAYS use the following workflow:

```bash
cd /opt/ilmildizi && \
git pull origin main && \
docker compose up -d --build --no-deps frontend && \
docker compose exec nginx nginx -s reload
```

If backend changes were made:
```bash
cd /opt/ilmildizi && \
git pull origin main && \
docker compose up -d --build --no-deps backend && \
docker compose exec nginx nginx -s reload
```

If both frontend and backend changes were made:
```bash
cd /opt/ilmildizi && \
git pull origin main && \
docker compose up -d --build --no-deps backend frontend && \
docker compose exec nginx nginx -s reload
```

### Key Notes:
- Root project directory on the server is `/opt/ilmildizi` (NOT `/root/django-test-bot`).
- Always include `docker compose exec nginx nginx -s reload` to refresh nginx routing and cache.
- Git branch is `main`.

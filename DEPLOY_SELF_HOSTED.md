# Deploy independente do Skip

Este projeto pode operar fora do Skip. A arquitetura recomendada é:

- **Frontend:** Vercel (ou qualquer host estático compatível com Vite)
- **Backend:** PocketBase em container/VM com volume persistente
- **Banco/arquivos:** diretório persistente `/pb/pb_data`
- **Domínio sugerido:** `app.seudominio.com` para o frontend e `api.seudominio.com` para o PocketBase

## 1. Backend PocketBase

O arquivo `Dockerfile.pocketbase` contém:

- PocketBase versionado;
- migrations copiadas para `/pb/pb_migrations`;
- hooks copiados para `/pb/pb_hooks`;
- porta HTTP 8080;
- healthcheck;
- volume persistente em `/pb/pb_data`.

Build local:

```bash
docker build -f Dockerfile.pocketbase -t radar-pocketbase .
```

Execução:

```bash
docker run --rm \
  -p 8080:8080 \
  -v radar_pb_data:/pb/pb_data \
  --env-file .env.backend \
  radar-pocketbase
```

Nunca execute produção sem volume persistente.

## 2. Variáveis do backend

Copie somente as variáveis necessárias para o host escolhido.

Obrigatória para captura pública em modo single-operator:

- `PUBLIC_LEAD_OWNER_ID`

Integrações:

- `OPENAI_API_KEY`
- `MERCADO_LIVRE_ACCESS_TOKEN`
- demais credenciais conforme os providers forem conectados.

Tokens de Telegram permanecem armazenados pela própria aplicação, criptografados no banco.

## 3. Frontend

Defina no ambiente de build:

```
VITE_POCKETBASE_URL=https://api.seudominio.com
```

Depois rode:

```bash
pnpm install --frozen-lockfile
pnpm build
```

A pasta gerada é `dist/`.

## 4. Dados do Skip

Para a migração definitiva, NÃO basta subir um PocketBase vazio.

Precisamos migrar o conteúdo atual de `pb_data` (ou exportar/importar os registros e arquivos) antes de trocar o domínio em produção.

Ordem segura:

1. subir backend independente vazio;
2. validar migrations + hooks;
3. criar/restaurar operador;
4. copiar/importar dados atuais;
5. validar contagens e relações;
6. testar login, CRM, tracking e Orquestrador;
7. apontar frontend para o novo backend;
8. manter o ambiente Skip intacto até o aceite final.

## 5. Backup

Antes de produção, configure backup recorrente do diretório `pb_data`.

PocketBase usa SQLite; copie o banco de forma consistente usando os mecanismos de backup do próprio PocketBase ou snapshot do volume enquanto o serviço coordena corretamente a escrita.

## 6. Segurança mínima

- HTTPS obrigatório;
- painel `/_/` protegido por credenciais fortes;
- não expor segredos no frontend;
- restringir firewall/SSH do host;
- backup automático;
- atualização do PocketBase somente após validar hooks/migrations em staging.

## 7. Observação de versão

O Dockerfile está pinado por padrão em PocketBase `0.39.10` para evitar atualização silenciosa. A versão pode ser trocada via:

```bash
docker build --build-arg PB_VERSION=<versao> -f Dockerfile.pocketbase .
```

Nunca atualizar a versão em produção sem rodar o smoke test primeiro.

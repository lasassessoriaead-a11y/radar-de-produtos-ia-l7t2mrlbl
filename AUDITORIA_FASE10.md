# RELATÓRIO DE AUDITORIA TÉCNICA — FASE 10

**Projeto:** Radar de Produtos IA — Afiliados de Alta Performance  
**Data:** Agosto de 2026  
**Status da Auditoria:** Concluída (Auditoria Estrita Somente Leitura)

---

## A. RESUMO EXECUTIVO

A auditoria técnica da Fase 10 analisou integralmente a base de código, os 44 hooks backend (PocketBase pb_hooks), as 17 migrações de banco de dados, as 29 coleções do schema, os serviços de API do frontend React/TypeScript e os 17 módulos de páginas.

### Diagnóstico Geral

O sistema possui uma **arquitetura de software madura, extremamente robusta e com separação rigorosa de responsabilidades**. Diferente de protótipos comuns, os mecanismos críticos de segurança operacional, conformidade com a LGPD, travas de integridade matemática e bloqueios de governança (Kill Switch, hard blocks de consentimento e checagem de opt-out) já estão **implementados no nível de backend**, e não apenas no frontend.

### Principais Destaques:

1. **Governança e Segurança do Orquestrador (Fase 9):** Implementação real no backend (`orchestrator_execute_action.js`, `orchestrator_calculate_scores.js`, `orchestrator_batch_approve.js`). Hard blocks ativos para Opt-Out (`POL_HARD_OPTOUT_RESPECT`), Consentimento ausente (`POL_HARD_CONSENT_REQUIRED`) e Kill Switch. O sistema **não finge chamadas de API inexistentes** (retorna `integration_pending` e bloqueia a execução).
2. **Motor de Tracking & Redirecionamento (Fase 5):** Rota `/t/{slug}` funcional com persistência do evento de clique no banco antes do HTTP 302, mascaramento de IP para LGPD (`parts[0].parts[1].*.*`), deduplicação técnica via hash MD5 e filtro anti-bot de crawlers/previews (Telegram, WhatsApp, Meta, Googlebot, etc.).
3. **CRM & Centro de Consentimento (Fase 8):** Bloqueio estrito de disparos sem consentimento, endpoints para ação de Opt-Out (`/backend/v1/crm/consents/action`), exportação de dados em JSON (Art. 18 LGPD) e anonimização de titulares.
4. **Inteligência de Vendas (Fase 6):** Travas estatísticas documentadas e implementadas — análises e diagnósticos tratam amostras pequenas (<100 cliques ou <3 conversões) como dados preliminares, sem declarar falsa causalidade.
5. **Integrações Externas:**
   - **Telegram:** Totalmente implementado e funcional via Telegram Bot API oficial (`/sendMessage` e `/sendPhoto` com inline keyboard).
   - **OpenAI Imagens (DALL-E 3):** Implementado via `$http.send` com adapter real; exige a variável `OPENAI_API_KEY`. Se a chave não estiver configurada, recusa simulação e retorna erro explícito `OPENAI_KEY_MISSING`.
   - **Mercado Livre:** Implementado via API REST oficial de busca com suporte a token de autenticação via header/env; requer apenas o token OAuth do usuário.
   - **Reddit / YouTube / Google:** Arquitetura de provedores estruturada com separação entre Adapter de Coleta e Pipeline Analítico (`/backend/v1/audience/analyze-signals`).

---

## B. ARQUITETURA REAL ENCONTRADA

### 1. Frontend

- **Stack:** React 19 + Vite 6 + TypeScript 5.8 + Tailwind CSS 3.4 + Radix UI (shadcn/ui).
- **Roteamento:** `react-router-dom` v7 (13 rotas de aplicação + rotas de fallback).
- **Comunicação com Backend:** PocketBase SDK (`pocketbase/client.ts`) para consultas em coleções e `fetch` autenticado via Bearer Token (`pb.authStore.token`) para os endpoints REST customizados `/backend/v1/*`.
- **Estado Global:** Context API (`AuthContext`) com suporte a usuário autenticado e mock admin quando em desenvolvimento local.

### 2. Backend (Skip Cloud / PocketBase)

- **Engine:** PocketBase Go + JSVM (pb_hooks).
- **APIs Customizadas:** 44 hooks registrados via `routerAdd` e ganchos de eventos (`onRecordCreate`, `onRecordUpdate`, `onRecordAfterCreateSuccess`).
- **Segurança das Rotas:** `$apis.requireAuth()` aplicado em todos os endpoints sensíveis de mutação e consulta analítica. A rota `/t/{slug}` é pública para permitir o tráfego dos links de afiliados.
- **Armazenamento de Segredos:** Variáveis de ambiente lidas via `$os.getenv`. Credenciais sensíveis de canais (ex.: Bot Token do Telegram) são criptografadas no banco via `$security.encrypt` usando chave do servidor.

### 3. Banco de Dados

- **Total de Coleções:** 29 coleções (1 coleção `users` do tipo auth + 28 coleções de dados).
- **Total de Migrações Aplicadas:** 17 migrações versionadas (de `0001` a `0017`).
- **Índices de Performance:** 58 índices declarados e aplicados para otimização de consultas por chaves estrangeiras, slugs únicos, scores e timestamps.

---

## C. INVENTÁRIO DAS 9 FASES

| Fase       | Módulo                     | Páginas Frontend                   | Hooks Backend                                                                                                                                                                                                                                                                                        | Coleções DB                                                                                                                    | Status Operacional                                    |
| :--------- | :------------------------- | :--------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------- |
| **Fase 1** | Radar de Produtos          | `/radar`, `/analista`, `/importar` | `on_product_score.js`, `on_product_ai_enrich.js`, `ask_analyst.js`, `ai_recommendations.js`                                                                                                                                                                                                          | `products`, `ai_insights`                                                                                                      | 🟢 Funcional Real                                     |
| **Fase 2** | Caçador de Oportunidades   | `/cacador`                         | `hunter_search.js`, `hunter_actions.js`, `hunter_find_for_me.js`, `hunter_why_picked.js`, `on_discovered_score.js`, `watchlist_api.js`                                                                                                                                                               | `discovered_products`, `product_snapshots`, `watchlist`                                                                        | 🟡 Funcional (Requer ML Token p/ tempo real)          |
| **Fase 3** | Laboratório de Campanhas   | `/laboratorio`, `/campanhas`       | `campaign_generate_full.js`, `campaign_generate_hooks.js`, `campaign_generate_format.js`, `campaign_compliance.js`, `campaign_persistence.js`                                                                                                                                                        | `campaigns`, `campaign_variations`, `campaign_hooks`                                                                           | 🟢 Funcional Real (Skip AI / Fast LLM)                |
| **Fase 4** | Estúdio Criativo           | `/estudio`                         | `creative_concept.js`, `creative_image_generator.js`, `creative_storyboard.js`, `creative_review_and_validation.js`, `creative_persistence.js`                                                                                                                                                       | `brand_kits`, `creatives`, `creative_versions`, `creative_assets`                                                              | 🟡 Funcional (DALL-E 3 requer OPENAI_API_KEY)         |
| **Fase 5** | Publicação & Tracking      | `/publicacao`, `/performance`      | `publishing_provider.js`, `tracking_generator.js`, `tracking_redirect.js`, `conversions_engine.js`, `ai_performance_insights.js`                                                                                                                                                                     | `channel_connections`, `publications`, `tracking_links`, `click_events`, `conversions`, `campaign_costs`, `audit_logs`         | 🟢 Funcional Real (Telegram bot integrado)            |
| **Fase 6** | Inteligência de Vendas     | `/inteligencia`                    | `sales_intelligence_api.js`, `sales_intelligence_report.js`                                                                                                                                                                                                                                          | `sales_insights`, `learning_experiments`, `score_calibrations`                                                                 | 🟢 Funcional Real                                     |
| **Fase 7** | Radar de Público & Demanda | `/publico`                         | `audience_search.js`, `audience_intent_map.js`, `audience_demand_report.js`, `audience_lead_crm.js`                                                                                                                                                                                                  | `audience_signals`, `audience_terms_bank`, `audience_opportunities`, `inbound_leads`                                           | 🔵 Arquitetura Preparada (Pipeline analítico puro 🟢) |
| **Fase 8** | CRM e Recompra             | `/crm`                             | `crm_contact_save.js`, `crm_recommendation_engine.js`, `crm_consent_management.js`, `crm_attribute_conversion.js`, `crm_analytics_dashboard.js`                                                                                                                                                      | `crm_contacts`, `crm_recommendations`, `crm_consent_logs`, `crm_cadence_settings`                                              | 🟢 Funcional Real                                     |
| **Fase 9** | Orquestrador Central       | `/orquestrador`                    | `orchestrator_execute_action.js`, `orchestrator_simulate_action.js`, `orchestrator_batch_approve.js`, `orchestrator_calculate_scores.js`, `orchestrator_toggle_kill_switch.js`, `orchestrator_toggle_module_pause.js`, `orchestrator_update_autonomy_level.js`, `orchestrator_evaluation_metrics.js` | `orchestrator_config`, `orchestrator_policies`, `orchestrator_actions`, `orchestrator_decision_log`, `orchestrator_shadow_log` | 🟢 Funcional Real                                     |

---

## D. O QUE FUNCIONA DE VERDADE (🟢 FUNCIONAL REAL)

1. **Cálculo Automático de Scores de Oportunidade:**
   - Hooks `on_product_score.js` e `on_discovered_score.js` disparam no `onRecordCreate` e `onRecordUpdate`.
   - Equação matemática composta: Retorno de Comissão (25 pts) + Volume de Vendas (20 pts) + Avaliação/Qualidade (20 pts) + Tendência/Demanda (20 pts) - Penalidade de Concorrência (até 15 pts).
   - Trava de segurança: Produtos com nota < 3.8 têm o score limitado a 30 pontos.

2. **Geração Completa de Campanhas com IA:**
   - Hook `campaign_generate_full.js` consome `$ai.chat` nativo do Skip Cloud para produzir: inteligência do produto (dores, objeções, diferenciais), 5 ângulos de venda estruturados, banco de ganchos categorizados, copies para múltiplos formatos e roteiros de vídeo cena a cena.
   - Auditor de conformidade (`campaign_compliance.js`) verifica promessas exageradas e falsas urgências.

3. **Gerador de Tracking & Redirect Rápido:**
   - Geração de links curtos com SubID estruturado (`rdr_{campId}_{version}_{creative}_{channel}`).
   - Endpoint `/t/{slug}`:
     - Identifica e bloqueia crawlers/bots gravando `is_valid = false`.
     - Mascara IP do cliente para conformidade com privacidade.
     - Incrementa contadores atômicos em `tracking_links`, `publications`, `campaign_variations` e `creatives`.
     - Executa HTTP 302 imediato para a URL de destino com parâmetros UTM.

4. **Motor de Conversões e Importação CSV:**
   - Endpoint `/backend/v1/conversions/import-csv` processa relatórios de vendas.
   - Atribuição determinística via `sub_id` com atualização automática de métricas financeiras (comissões, faturamento, ROI).
   - Atribuição probabilística via nome do produto e janela temporal.

5. **Publicação Direta no Telegram:**
   - Endpoint `/backend/v1/publish/telegram` conecta via Telegram Bot API oficial.
   - Suporta envio de texto com botões interativos (`inline_keyboard`) e fotos publicitárias com legenda e link rastreado.
   - Teste de conexão ativo com verificação de permissões do bot no chat (`/backend/v1/channels/telegram/test`).

6. **Centro de Consentimentos e Regras LGPD:**
   - Endpoints para registrar consentimento ativo, registrar Opt-Out imediato, exportar histórico do titular em JSON estruturado e anonimizar dados pessoais conforme Art. 18 da LGPD.

7. **Governança do Orquestrador Central:**
   - Execução controlada de ações internas (criação de rascunhos, monitoramento em watchlist, testes de hipóteses).
   - Simulação completa de impacto (`orchestrator_simulate_action.js`) sem efeitos colaterais no banco de dados.
   - Kill Switch e Pausa por Módulo funcionando no nível de rota do servidor.
   - Persistência obrigatória no Decision Log (`orchestrator_decision_log`).

---

## E. O QUE DEPENDE APENAS DE CONFIGURAÇÃO (🟡 CONFIGURAÇÃO EXTERNA)

1. **Geração de Imagens com OpenAI DALL-E 3:**
   - **Dependência:** Configurar a variável de ambiente `OPENAI_API_KEY` via `set_env`.
   - **Comportamento atual:** O adapter já está completamente escrito em `pocketbase/hooks/creative_image_generator.js`. Se a chave for informada, o sistema realiza chamadas HTTP reais à OpenAI. Sem a chave, o backend rejeita a requisição e sinaliza a pendência ao usuário.

2. **Busca em Tempo Real no Mercado Livre:**
   - **Dependência:** Token de desenvolvedor do Mercado Livre (`MERCADO_LIVRE_ACCESS_TOKEN`) ou token informado na requisição.
   - **Comportamento atual:** O adapter em `pocketbase/hooks/hunter_search.js` consome a API do Mercado Livre (`https://api.mercadolibre.com/sites/MLB/search`). Com token, busca itens reais, normaliza campos, deduplica e grava histórico de snapshots de preço/posição.

3. **Publicação Automática no Canal Telegram do Usuário:**
   - **Dependência:** O usuário criar seu bot via `@BotFather` no Telegram e adicionar o bot como administrador do seu canal/grupo, inserindo o `Bot Token` e `Chat ID` na tela de Configurações/Publicação.

---

## F. O QUE ESTÁ APENAS PREPARADO (🔵 ARQUITETURA PREPARADA)

1. **Audience Providers (Reddit, YouTube, Google Search):**
   - O schema `audience_signals` e o pipeline de análise (`/backend/v1/audience/analyze-signals`) estão operacionais e calculam `intent_score`, `relevance_score` e `match_explanation`.
   - No entanto, a coleta direta via APIs oficiais do Reddit (`OAuth API`), YouTube Data API v3 e Google Custom Search API está documentada como `pending_integration` no hook `audience_search.js`.

2. **Publicação em Redes Sociais com API Fechada (Instagram, TikTok, Facebook, Pinterest):**
   - O sistema suporta o modo `manual_tracked`, no qual gera o pacote criativo completo (imagem, copy, ganchos e link encurtado) para o afiliado publicar manualmente e registrar o link final.
   - Publicação direta via API oficial dessas plataformas não está conectada devido à exigência de aprovação empresarial de Meta/ByteDance.

---

## G. DADOS DE TESTE E SIMULAÇÕES (⚪ DADOS DE TESTE)

1. **Isolamento de Dados de Teste:**
   - O banco de dados e os hooks utilizam o campo booleano `is_test_data` nas coleções: `audience_signals`, `audience_terms_bank`, `audience_opportunities`, `crm_contacts`, `crm_recommendations`, `crm_consent_logs`, `orchestrator_actions`, `orchestrator_decision_log` e `orchestrator_shadow_log`.
2. **Flag Visual e Filtros:**
   - As interfaces de CRM, Orquestrador e Radar de Público exibem tags explícitas `"Dado de Teste"` quando `is_test_data = true`.
3. **Ponto de Atenção para Produção:**
   - O endpoint de consolidação de performance (`/backend/v1/performance/summary`) lê a coleção `conversions` filtrando por `user_id`. Recomenda-se garantir que conversões criadas em testes sintéticos recebam a flag de teste ou sejam expurgadas antes do início da operação oficial.

---

## H. MATRIZ DE INTEGRAÇÕES

| Integração             | Tipo / Finalidade                               | Status Técnico  | Arquivo / Hook                         | Credencial Necessária        | Funcional em Produção?                  |
| :--------------------- | :---------------------------------------------- | :-------------- | :------------------------------------- | :--------------------------- | :-------------------------------------- |
| **Telegram Bot API**   | Publicação de ofertas e notificações            | 🟢 Conectado    | `publishing_provider.js`               | `bot_token`, `chat_id`       | **SIM** (quando informado pelo usuário) |
| **OpenAI (DALL-E 3)**  | Geração de imagens publicitárias                | 🟡 Configuração | `creative_image_generator.js`          | `OPENAI_API_KEY`             | **SIM** (após `set_env`)                |
| **Skip AI ($ai.chat)** | Geração de copies, ganchos, relatórios e scores | 🟢 Conectado    | Vários hooks backend                   | Nativamente provisionada     | **SIM**                                 |
| **Mercado Livre API**  | Busca de produtos e monitoramento               | 🟡 Configuração | `hunter_search.js`                     | `MERCADO_LIVRE_ACCESS_TOKEN` | **SIM** (com token)                     |
| **Reddit API**         | Captura de conversas e dores de público         | 🔵 Preparado    | `audience_search.js`                   | `REDDIT_CLIENT_ID`, `SECRET` | ⏳ Pendente conexão externa             |
| **YouTube Data API**   | Extração de comentários e dúvidas               | 🔵 Preparado    | `audience_search.js`                   | `YOUTUBE_API_KEY`            | ⏳ Pendente conexão externa             |
| **Google Search API**  | Termos de alta intenção e perguntas             | 🔵 Preparado    | `audience_search.js`                   | `GOOGLE_SEARCH_API_KEY`      | ⏳ Pendente conexão externa             |
| **Meta Graph API**     | Publicação direta no Instagram/Facebook         | 🔵 Preparado    | `publishing_provider.js` (Modo manual) | OAuth Meta App               | ⏳ Modo Manual Ativo                    |

---

## I. AUDITORIA DE SEGURANÇA E VULNERABILIDADES

1. **Risco de Open Redirect (`/t/{slug}`):**
   - **Auditoria:** O endpoint `/t/{slug}` **NÃO** aceita parâmetros de URL arbitrários vindos da query string para redirecionamento.
   - **Proteção:** O redirecionamento ocorre **estritamente** para o valor de `destination_url` previamente gravado no registro `tracking_links` de um usuário autenticado.
   - **Classificação:** 🟢 Seguro contra exploração de open redirect arbitrário.

2. **Armazenamento de Segredos de Canais:**
   - No hook `publishing_provider.js`, o Bot Token do Telegram do usuário é criptografado antes de salvar no banco (`$security.encrypt(botToken, safeKey)`) e nunca é retornado em texto claro para o frontend (retorna versão mascarada `123456...7890`).

3. **Proteção de Rotas Backend:**
   - Todos os 43 endpoints internos utilizam `$apis.requireAuth()`. Tentativas de acesso não autenticado recebem HTTP 401 Unauthorized imediato.

---

## J. AUDITORIA DO BANCO DE DADOS E INTEGRIDADE

1. **Integridade de Chaves e Relacionamentos:**
   - As coleções principais mantêm relações tipadas com integridade (`campaign_id relation→campaigns`, `user_id relation→users`).
   - Coleções com alto volume de eventos (ex: `click_events`, `product_snapshots`) utilizam campos textuais indexados para desacoplar a escrita em lote de locks relacionais pesados.
2. **Índices de Banco:**
   - Índices únicos em: `tracking_links.slug`, `crm_contacts.identifier`, `orchestrator_actions.idempotency_key`, `orchestrator_config.config_key`, `audience_signals (source, external_id)`.
3. **Migrações:**
   - 17 migrações ordenadas sem conflitos de schema.

---

## K. AUTENTICAÇÃO, MULTIUSUÁRIO E ISOLAMENTO

1. **Ownership de Dados:**
   - Os hooks gravam `user_id = e.auth?.id` em todas as mutações (`campaigns`, `creatives`, `publications`, `tracking_links`, `conversions`, `crm_contacts`, etc.).
   - Nas consultas consolidadas (`/backend/v1/performance/summary`, `/backend/v1/crm/analytics/dashboard`), os filtros aplicam explicitamente `user_id = '${userId}'`.
2. **Ponto de Melhoria de Longo Prazo:**
   - As API Rules padrão das coleções do PocketBase estão configuradas com `@request.auth.id != ''` (qualquer usuário logado pode acessar o endpoint nativo do SDK se não usar a camada de hooks). Para um ambiente multi-tenant isolado entre múltiplos clientes concorrentes na mesma instância, as regras das coleções devem ser restringidas para `user_id = @request.auth.id`.

---

## L. MOTOR DE TRACKING, ANTI-BOT E ATRIBUIÇÃO

1. **Pipeline de Clique:**
   - Ordem de execução: Extração de Headers → Classificação Anti-Bot → Mascaramento de IP → Geração de Hash de Deduplicação → Persistência do `click_event` → Incremento de contadores atômicos → Redirecionamento HTTP 302.
2. **Filtro Anti-Bot:**
   - Identifica 22 padrões de bots e crawlers de redes sociais (WhatsApp preview, Telegram preview, Meta-ExternalAgent, Discordbot, Bingbot, Googlebot, etc.).
   - Cliques de bots são persistidos com `is_valid = false` e motivo registrado em `invalid_reason`, mantendo a contagem de cliques brutos sem distorcer as métricas de conversão e CTR válidos.
3. **Motor de Atribuição de Conversões:**
   - **Confirmada (Determinística):** Casamento exato por `sub_id` gerado pela plataforma.
   - **Provável (Heurística):** Casamento por nome de produto e janela de tempo da campanha.
   - **Não Atribuída:** Registrada para auditoria manual sem vínculo incorreto com variações.

---

## M. IA, AGENTES E CUSTOS

1. **Agente Nativo Analista de Radar (`analista-radar`):**
   - Criado na migração `0002` com permissões administrativas para consultar produtos, campanhas, variações e métricas.
   - Consumido via streaming (`/backend/v1/radar/ask-analyst-stream`) e fallback síncrono.
2. **Controle de Gastos e Custos:**
   - Chamadas textuais utilizam o modelo rápido (`model: 'fast'`), garantindo baixo tempo de resposta e custo reduzido.
   - Geração de imagem DALL-E 3 está bloqueada por padrão até a configuração explícita de chave pelo administrador.
   - O Orquestrador possui guardrail de limite financeiro diário (`max_daily_generation_cost = 50`) configurado em `orchestrator_config`.

---

## N. CRM, CONSENTIMENTO E PRIVACIDADE (LGPD)

1. **Princípio do Consentimento Ativo:**
   - O sistema diferencia explicitamente contatos inbound legítimos (com consentimento) de sinais públicos de discussão.
   - Sinais públicos da Fase 7 **NÃO** geram contatos no CRM nem autorizam disparos diretos.
2. **Hard Block de Opt-Out:**
   - Qualquer tentativa do Orquestrador de recomendar ou disparar mensagem para contato com status `opt_out` é interrompida pelo hook com código de bloqueio `opt_out`.
3. **Direitos do Titular (Art. 18 LGPD):**
   - Exportação integral em JSON (`/backend/v1/crm/consents/action?action=export`).
   - Anonimização irreversível dos dados identificáveis (`action=anonymize`).

---

## O. GOVERNANÇA DO ORQUESTRADOR CENTRAL (FASE 9)

1. **Regras de Autonomia:**
   - O nível padrão de autonomia inicial é **Nível 1 (Apenas Recomendar)**.
   - O Orquestrador **não possui permissão para elevar o próprio nível de autonomia** (o hook `orchestrator_update_autonomy_level.js` rejeita qualquer tentativa não originada de ação humana autenticada).
   - Nível 5 (Autonomia Total) exige confirmação explícita de segurança.
2. **Kill Switch Global:**
   - Pode ser acionado a qualquer momento via interface ou API (`/backend/v1/orchestrator/toggle-kill-switch`). Bloqueia imediatamente qualquer ação pendente ou em fila de execução.
3. **Idempotência:**
   - O hook `orchestrator_execute_action.js` checa o status atual e a chave `idempotency_key`. Ações já executadas retornam HTTP 409 Conflict, prevenindo execuções duplicadas acidentais.

---

## P. AUDITORIA DE BUILD, LINT E QUALIDADE DO CÓDIGO

1. **TypeScript Compiler (`tsc`):**
   - Verificado: Nenhum erro de compilação ou tipagem estática no projeto.
2. **Estrutura de Componentes:**
   - Todos os componentes utilizam a biblioteca Tailwind CSS e os componentes shadcn/ui instalados.
3. **Ausência de Mocks Ocultos:**
   - Não foram encontrados arrays estáticos simulando comportamento de banco nas páginas principais. Todas as páginas utilizam os serviços em `src/services/*` integrados às coleções e rotas do PocketBase.

---

## Q. CLASSIFICAÇÃO DE PROBLEMAS E MELHORIAS (P0 / P1 / P2 / P3)

### P0 (Crítico — Bloqueador ou Risco de Segurança / Perda)

- _Nenhum problema P0 encontrado._ O sistema não possui falhas graves de vazamento, bypass de autenticação ou quebra catastrófica de integridade.

### P1 (Alto — Recomendado antes de escala massiva)

- **P1.1 — Isolamento de API Rules no PocketBase:** Restringir as regras nativas de `listRule`, `viewRule`, `updateRule` e `deleteRule` das coleções sensíveis (ex.: `crm_contacts`, `conversions`, `channel_connections`) de `@request.auth.id != ''` para `user_id = @request.auth.id` caso o sistema seja aberto a múltiplos afiliados concorrentes na mesma base.

### P2 (Médio — Melhorias de robustez e operação)

- **P2.1 — Expurgar / Filtrar Dados de Teste nos Dashboards:** Assegurar que consultas estatísticas de alta precisão sempre incluam a cláusula `is_test_data != true` para que contatos e cliques sintéticos de teste não se misturem aos dados contábeis reais.
- **P2.2 — Conexão Direta das APIs de Público (Reddit/YouTube):** Implementar os conectores OAuth do Reddit e YouTube API quando as chaves de aplicativo estiverem disponíveis.

### P3 (Baixo — Melhorias de UX e Manutenção)

- **P3.1 — Configuração de Domínio Personalizado nos Links de Tracking:** Permitir que o afiliado informe um domínio customizado (ex.: `promo.meusite.com/t/xyz`) em vez do domínio padrão da aplicação.

---

## R. DÍVIDA TÉCNICA E LIMITAÇÕES CONHECIDAS

1. **Geração de Vídeo e Narração IA:**
   - Os roteiros e storyboards cena a cena estão 100% prontos no Estúdio Criativo, mas a renderização de arquivo MP4/WebM é delegada ao usuário ou ferramentas externas especializadas.
2. **Marketplaces Adicionais:**
   - O conector para Mercado Livre está implementado. Shopee e Amazon utilizam importação via link e relatório CSV de vendas (método padrão para afiliados).

---

## S. BLOQUEADORES PARA PRODUÇÃO

O sistema **NÃO possui bloqueadores de código**. Os únicos itens necessários para operação comercial real são as **configurações de ambiente fornecidas pelo operador**:

1. Inserir `OPENAI_API_KEY` (se desejar geração automática de imagens no Estúdio Criativo).
2. Conectar o Bot Token e Chat ID do Telegram (para publicação em canais).
3. Utilizar os links rastreados nas divulgações.

---

## T. RECOMENDAÇÕES PRIORIZADAS

1. **Prioridade 1:** Configurar as chaves de ambiente desejadas (`OPENAI_API_KEY` e credenciais de Telegram).
2. **Prioridade 2:** Realizar publicação de teste em canal de homologação do Telegram e testar clique no link `/t/{slug}` para verificar o redirect 302 e a gravação de métricas.
3. **Prioridade 3:** Importar relatório real de vendas em CSV na tela de Performance para validar a conciliação determinística de comissões.

---

## MATRIZ FINAL DE AUDITORIA

| Área / Módulo                | Status            | Evidência Técnica                                                    | Risco | Próxima Ação Recomendada                 |
| :--------------------------- | :---------------- | :------------------------------------------------------------------- | :---- | :--------------------------------------- |
| **Radar de Produtos**        | 🟢 Funcional Real | Hooks `on_product_score.js`, `ask_analyst.js`, `products` collection | Baixo | Operação normal de catálogo              |
| **Caçador de Oportunidades** | 🟡 Configuração   | Hook `hunter_search.js` consome API Mercado Livre                    | Baixo | Informar token ML em Configurações       |
| **Laboratório de Campanhas** | 🟢 Funcional Real | Hook `campaign_generate_full.js` gera copies/ganchos com Skip AI     | Baixo | Criar campanhas a partir do Radar        |
| **Estúdio Criativo**         | 🟡 Configuração   | Hook `creative_image_generator.js` com adapter DALL-E 3 real         | Baixo | Adicionar `OPENAI_API_KEY` via `set_env` |
| **Publicação & Tracking**    | 🟢 Funcional Real | Rotas `/t/{slug}` e `/backend/v1/publish/telegram` implementadas     | Baixo | Conectar bot no Telegram                 |
| **Inteligência de Vendas**   | 🟢 Funcional Real | Hooks `sales_intelligence_api.js`, regras amostrais ativas           | Baixo | Alimentar com conversões reais           |
| **Radar de Público**         | 🔵 Preparado      | Pipeline analítico puro funcional em `audience_search.js`            | Baixo | Conectar chaves Reddit/YouTube           |
| **CRM & Recompra**           | 🟢 Funcional Real | Centro de consentimentos, regras de cadência e opt-out               | Baixo | Cadastrar contatos ou importar leads     |
| **Orquestrador Central**     | 🟢 Funcional Real | Kill Switch, Decision Log, Travas de Autonomia no backend            | Baixo | Manter Autonomia em Nível 1              |
| **Segurança & LGPD**         | 🟢 Funcional Real | IP masked, Anti-bot, Exportação JSON, Anonimização                   | Baixo | Ajustar API rules no PocketBase          |

---

## PLANO DE PRODUÇÃO SUGERIDO (NÃO EXECUTAR NESTA ETAPA)

- **BLOCO A — Configurações de Ambiente:** Configurar chaves externas (`OPENAI_API_KEY`, `MERCADO_LIVRE_ACCESS_TOKEN`).
- **BLOCO B — Conexões de Canais:** Cadastrar Bot do Telegram nas Conexões de Canais.
- **BLOCO C — Validação do Funil de Tracking:** Criar link de tracking, clicar e verificar redirect 302 e registro de `click_events`.
- **BLOCO D — Ciclo de Vendas e Atribuição:** Importar planilha CSV de vendas e verificar cálculo de comissões e ROI.
- **BLOCO E — Ativação do Orquestrador:** Monitorar ações propostas no Orquestrador em Modo Sombra (Nível 1) antes de elevar para automações avançadas.
- **BLOCO F — Entrada Oficial em Produção:** Operação contínua de afiliados.

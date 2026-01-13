# Projeto UniEJA Next

Documentação geral para orientar desenvolvedores que assumirem o projeto. Abrange frontend (landing do aluno) e backend (API/Painel), apontando fluxos, decisões e próximos passos.

## Visão Geral

- **Stack**: PHP (API + painel), MySQL, frontend estático (HTML/CSS/JS) consumindo `api.php`.
- **Diretórios principais**
  - `frontend-aluno/`: landing page para estudantes (listagem de cursos e CTA).
  - `dashboard.html`, `dashboard.js`: painel em tempo real para operação/comercial.
  - `api.php`: única porta de dados (resumo, vendas, metas, autenticação etc.).
  - `config.php`: bootstrap da aplicação (env, banco, JWT, CORS e helpers).
  - `dist/`: cópia pronta para deploy (espelhando os arquivos necessários no Plesk).

## Backend

### Configuração de Ambiente

1. Duplicar `.env.example` (se disponível) ou criar `.env` na raiz com:
   ```env
   APP_ENV=development
   DB_HOST=localhost
   DB_NAME=dashboard_vendas
   DB_USER=root
   DB_PASS=
   AUTH_SECRET=troque-por-um-uuid-seguro
   AUTH_TOKEN_TTL=1800        # segundos
   ALLOWED_ORIGINS=https://seu-dominio.com,http://localhost:3000
   ```
2. Importar `database.sql` (ou `database-v2*.sql`) no MySQL.
3. Subir servidor local: `php -S 0.0.0.0:8000` (ou outra porta livre, ex.: `php -S 127.0.0.1:8080`). Caso a porta esteja em uso, finalize o processo ocupante ou escolha outra porta.

### Segurança & Fluxos

- **CORS restrito**: `config.php` lê `ALLOWED_ORIGINS`; requisições bloqueadas antes de alcançar as rotas.
- **JWT** (`AUTH_SECRET` + `AUTH_TOKEN_TTL`):
  - Login (`acao=login`) retorna `token` + `expira_em`.
  - Rotas mutáveis (`nova-venda`, `deletar-venda`, `definir-meta`) exigem `Authorization: Bearer <token>` e método específico (POST/DELETE).
- **Tratamento de erros**: `logException()` envia para `error_log`, e o cliente recebe mensagens genéricas quando `APP_ENV=production`.

### Endpoints Principais (`api.php`)

| Ação (`acao`)                                                               | Método      | Autenticação | Descrição                                                |
| --------------------------------------------------------------------------- | ----------- | ------------ | -------------------------------------------------------- |
| `teste`                                                                     | GET         | Não          | Healthcheck simples.                                     |
| `resumo`                                                                    | GET         | Não          | Totais do mês/dia, meta, ticket.                         |
| `vendas-dia`                                                                | GET         | Não          | Série 30 dias para o gráfico.                            |
| `ranking-geral`/`ranking-dia`                                               | GET         | Não          | Rankings mensal e diário por vendedor.                   |
| `ultimas-vendas`                                                            | GET         | Não          | Últimas vendas (parâmetros `limite`, `intervalo_horas`). |
| `listar-produtos`                                                           | GET         | Não          | Catálogo para o frontend do aluno.                       |
| `nova-venda`                                                                | POST        | **Sim**      | Cria venda (validação de campos).                        |
| `deletar-venda`                                                             | DELETE/POST | **Sim**      | Remove venda por ID.                                     |
| `definir-meta`                                                              | POST        | **Sim**      | Atualiza valor-meta do mês.                              |
| `busca-meta`, `listar-clientes`, `listar-vendedores`, `listar-todas-vendas` | GET         | Não          | Utilidades para painel/Admin.                            |
| `login`                                                                     | POST        | Não          | Autentica usuário e devolve JWT.                         |

### Usuários / Acesso

- Credenciais vivem na tabela `usuarios`. Após importação do SQL, revise `email`, `senha` (MD5 ou `password_hash`).
- Para criar novos admins: inserir registro com `senha` gerada via `password_hash('minhaSenha', PASSWORD_DEFAULT)`.
- **Logins padrão (trocar em produção):**

| Nome            | Email                         | Senha      | Observações                |
| --------------- | ----------------------------- | ---------- | -------------------------- |
| Administrador   | `admin@empresa.com`           | `admin123` | Perfil `admin` (hash MD5). |
| Davi Guilherme  | `davi.guilherme@empresa.com`  | `123456`   | Perfil `vendedor`.         |
| Fellype Gabriel | `fellype.gabriel@empresa.com` | `123456`   | Perfil `vendedor`.         |

> **Importante:** as senhas acima estão armazenadas como MD5 no dump original. Atualize para `password_hash` assim que subir para produção e repasse os novos dados ao time.

## Frontend (Aluno)

- Rota padrão (`index.php`) redireciona para `frontend-aluno/index.html`, preservando query strings. Esse frontend é a porta de entrada oficial do projeto (inclusive para o time interno), pois o cabeçalho oferece acesso à "Área do consultor" (login do painel admin) e CTA para leads.
- A landing consome `api.php?acao=listar-produtos`. Se a API falhar, exibe aviso e usa um catálogo curado.
- Atributos `data-api`, `data-login`, `data-lead` no `<body>` permitem configurar URLs sem alterar JS.
- CTA "Quero saber mais" redireciona para `data-lead` com `?curso=<nome>` (usado para rastrear intenção). Ajuste `index.php` ou outro endpoint para processar esse parâmetro.
- Header inclui link "Área do consultor" apontando para `login.html` (painel administrativo).

### Scripts / UX

- `app.js` mantém estado de busca, filtros por categoria/formato, ordenação e painel de insights.
- Fallback inteligente gera metadados (badge, skills, datas) caso produtos do banco não carreguem tais campos.
- Estados visuais: loading, aviso de falha, vazio.
- Inclui o **Mentor UniEJA** (bot flutuante) que consome `acao=resumo` para responder dúvidas rápidas sobre matrículas, bolsas e trilhas.

## Dashboard Operacional

- `dashboard.js` (painel comercial) traz:
  - Helpers de rede (`safeFetch`) com retries/backoff.
  - Chatbot/toasts que notifica novas vendas e incidentes (API offline/online).
  - `buscarUltimasVendas` configurável para últimas 24h (padrão) usando timestamp completo.
- Requer que o backend esteja acessível via `api.php` no mesmo host/domínio permitido.

## Procedimentos para Continuar o Trabalho

1. **Ambiente**: confirmar `.env`, banco importado, `AUTH_SECRET` forte e `ALLOWED_ORIGINS` corretos.
2. **Executar**: `php -S 127.0.0.1:8000` na raiz e abrir `http://127.0.0.1:8000/` (landing + painel via links).
3. **Testar fluxos**:
   - Landing: verificar carregamento do catálogo, filtros e CTA.
   - Login admin: acessar `login.html`, verificar JWT no response.
   - Painel: confirmar atualizações do dashboard, notificações e rotas protegidas com Bearer.
4. **Próximos incrementos sugeridos**:
   - Persistência real do match de cursos (enviar formulário para o backend).
   - Hardening adicional (rate limiting, refresh token, perfis de permissão).
   - Painel para gerenciar produtos/cursos expostos no frontend.

- Preparar build para Plesk: definir `frontend-aluno/` como docroot público e manter `api.php`/painel no mesmo app PHP.
  - Ao gerar artefatos para deploy, copie `frontend-aluno/` para `dist/frontend-aluno` e utilize `php -S 127.0.0.1:8080 -t dist` para testar o pacote final.

## Dicas para Novos Devs

- Sempre rode `composer dump-autoload` ou configure um autoloader se adicionar classes novas (atualmente não há Composer, mas pode ser integrado).
- Use o log do servidor (`error_log`) para investigar falhas: as exceções são registradas por `logException`.
- Ao adicionar novas rotas na API, lembre de atualizar o mapa `routesConfig` (no topo do `api.php`) se precisarem de autenticação/controle de método.
- Para novos endpoints expostos ao frontend externo, não esqueça de revisar CORS/limites e retornar dados já sanitizados.

---

Qualquer dúvida sobre decisões anteriores (chatbot, notificações, catálogo) consulte este README e os comentários específicos no código (`dashboard.js`, `config.php`, `app.js`).

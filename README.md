# XLanguage

App de estudo com Astro, Tailwind e Supabase: dicionário, baralhos, repetição espaçada, idiomas e progresso. O dashboard e os temas usam os arquivos visuais de `xlanguage-app.zip`.

## Rodar localmente

Use Node 22.12+ (Node 24 recomendado).

```sh
npm ci
```

Para apenas abrir o app sem instalar as ferramentas de teste, use `npm ci --omit=dev --no-audit --no-fund`. Os testes automatizados ficam no GitHub; você não precisa instalá-los no seu computador para estudar.

Copie `.env.example` para `.env` e preencha `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_PUBLISHABLE_KEY` do Supabase correto. Use somente a chave pública, nunca `service_role`. Não envie `.env` ao GitHub.

```sh
npm run dev -- --host
```

`PUBLIC_SITE_URL` deve ser a origem pela qual você acessa o app. Por exemplo, se usa `http://192.168.1.6:4321`, coloque esse valor no `.env`. Cadastre também `http://192.168.1.6:4321/auth/callback` nas Redirect URLs do Supabase. Em produção, use a URL HTTPS correspondente. A recuperação precisa ser concluída no mesmo navegador em que foi solicitada.

## Banco

O SQL `001_xlanguage.sql` já foi executado no Supabase correto. Não é necessário executá-lo para atualizar os arquivos do app. O `002_importar_palavras_antigas.sql` foi pulado e continua opcional: nenhuma importação de dados antigos ocorre automaticamente. Também é possível importar pelo Dicionário.

## Validação

```sh
npm run check
npm test
npm run test:smoke
npm run build
```

`npm test` usa PostgreSQL local em memória: valida isolamento entre contas, notas, conflitos, importação e estatísticas. Executa ambos os SQLs apenas nesse banco descartável, sem acessar o Supabase real. `test:smoke` compila e testa as rotas com um serviço Supabase simulado localmente; as credenciais de teste não são usadas em produção. Rode `npm run build` novamente com seu `.env` antes de publicar.

Cada push e pull request executa `.github/workflows/validate.yml` com checagem de tipos, banco PostgreSQL descartável e Chromium. O teste de navegador usa os formulários reais para login, cookies, palavras, importação, baralhos, revisão, idiomas, preferências e saída, além de conferir temas e menu mobile. As capturas desktop/mobile ficam no artefato `xlanguage-browser` por sete dias, apenas com os dados fictícios dos testes.

Para rodar o navegador localmente (opcional):

```sh
npx playwright install chromium
npm run test:browser
```

Nenhum teste automatizado usa a sua senha, envia email real ou modifica o Supabase de produção. A integração com o Supabase real e o envio de email precisam de uma instância de teste acessível e uma conta própria de teste; os testes simulados não comprovam a configuração desse ambiente.

O login distingue credenciais inválidas, configuração de API inválida, email não confirmado, limite de tentativas e indisponibilidade do serviço. Os logs registram só a categoria da falha e o status, sem senha ou chaves.

## Servidor local e testes

O desenvolvimento local e os testes usam SSR com `@astrojs/node`. A publicação usa `@astrojs/cloudflare`, selecionado pelos comandos abaixo. A autenticação continua usando cookies do Supabase, sem precisar de KV para sessões do Astro.

```sh
npm run build
npm start
```

O comando `npm run build` produz um servidor Node. O app não funciona como um upload de arquivos estáticos.

## Publicar na sua Cloudflare

O repositório já inclui o adaptador, `wrangler.jsonc` e os comandos de publicação. O Worker se chama `xlanguage`; antes da primeira publicação, confira se esse nome está livre ou pertence a este app na conta selecionada.

Para conectar o GitHub no painel da Cloudflare Workers Builds:

| Campo | Valor |
| --- | --- |
| Repositório | `Thiago-M1000/XLanguage` |
| Branch | `master` |
| Build command | `npm run build:cloudflare` |
| Deploy command | `npx wrangler deploy` |
| Root directory | raiz do repositório |

Instale também as dependências de desenvolvimento no ambiente de build (não use `--omit=dev` na Cloudflare). O adaptador e o Wrangler são ferramentas de publicação; não são necessários para abrir o app localmente em modo Node.

Em **Worker → Settings → Variables and Secrets**, configure os valores do Supabase correto:

| Nome | Valor |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | Project URL do mesmo Supabase onde o SQL 001 já foi aplicado |
| `PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key desse projeto; nunca `service_role` ou `sb_secret_...` |
| `PUBLIC_SITE_URL` | URL HTTPS efetivamente atribuída ao Worker, sem caminho |

Esses valores são lidos no runtime; não precisam ser adicionados ao código nem ao GitHub. `keep_vars` preserva as variáveis gerenciadas no painel durante as atualizações. Cadastre a URL efetiva do app e sua rota `/auth/callback` no Supabase em **Authentication → URL Configuration**. Mantenha também a Redirect URL local se continuar usando o app no computador.

Para publicar manualmente de um terminal já autenticado na conta correta:

```sh
npm run deploy:cloudflare
```

O comando compila e publica de verdade; o build isolado `npm run build:cloudflare` apenas verifica a compilação. As dependências são locais ao projeto e não trocam o Node global do computador.

Detalhes dos recursos e do agendamento: [LEIA-ME.md](./LEIA-ME.md).

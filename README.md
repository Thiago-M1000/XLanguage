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

## Servidor

O repositório original estava no modo estático, sem adaptador. Esta atualização configura SSR com `@astrojs/node` em modo standalone para suportar autenticação por cookies e APIs.

```sh
npm run build
npm start
```

O build depende das variáveis do `.env`. O resultado precisa de um servidor Node; não é um site de arquivos estáticos. Para Cloudflare Workers, configure o adaptador Cloudflare antes da publicação. Esta atualização não publica o app.

Detalhes dos recursos e do agendamento: [LEIA-ME.md](./LEIA-ME.md).

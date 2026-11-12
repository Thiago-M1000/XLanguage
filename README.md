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

Para importar JSON com tipo de palavra, execute [`003_importar_classe.sql`](supabase/003_importar_classe.sql) no SQL Editor do mesmo projeto Supabase. A migração pode ser aplicada diretamente depois da 001. Use, por exemplo, `[{"texto":"quote","traducao":"orçamento","classe":"substantivo"}]`. `classe` e `exemplo` são opcionais. Sem `classe`, a entrada usa `expressão`. Duplicatas no mesmo idioma mantêm os dados já salvos.

## Validação

```sh
npm run check
npm test
npm run test:smoke
npm run build
```

`npm test` usa PostgreSQL local em memória: valida isolamento entre contas, notas, conflitos, importação e estatísticas. Executa as migrações apenas nesse banco descartável, sem acessar o Supabase real. `test:smoke` compila e testa as rotas com um serviço Supabase simulado localmente; as credenciais de teste não são usadas em produção. Rode `npm run build` novamente com seu `.env` antes de publicar.

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


## Prática e acompanhamento

- A revisão oferece **Cartões**, **Digitar resposta** e **Frases com lacunas**. Os três modos compartilham a mesma fila e o agendamento existente. Você confere a resposta e escolhe a nota; a comparação não decide a avaliação automaticamente.
- Lacunas usam a frase de exemplo salva, contendo a palavra exata. Cartões sem frase compatível são omitidos apenas nesse modo. Digitação ignora caixa, espaços extras e pontuação final; acentos diferentes recebem um aviso.
- **Palavras em dificuldade** prioriza a proporção de avaliações Errei/Difícil e a quantidade dessas avaliações. A prática focada inclui somente cartões vencidos; datas futuras são preservadas.
- **Progresso** mostra os últimos 7 ou 30 dias e compara com o período anterior, usando o fuso do perfil. Palavras diferentes, avaliações e dias ativos têm contagens separadas.
- O botão **+** abre o cadastro rápido, com palavra, tradução e baralho opcional. O formulário fica pronto para a próxima entrada depois de salvar.

Esses recursos usam as tabelas do SQL 001 já aplicado. **Nenhum SQL adicional é necessário.** Para evitar leituras sem limite, as análises consultam até 10.000 registros e avisam quando os resultados são parciais.

## Sugestões com IA (opcional)

No formulário **Nova entrada/Editar**, a IA sugere tradução em português, exemplo no idioma estudado e classe. A prévia permite aplicar ou descartar; salvar continua sendo uma ação separada. Somente a palavra e o idioma são enviados à OpenAI. A chave fica no servidor, nunca no navegador ou no repositório.

Para ativar em **Cloudflare → Worker xlanguage → Settings → Variables and Secrets**, adicione:

| Nome | Tipo e valor |
| --- | --- |
| `OPENAI_API_KEY` | Secret: chave de um projeto da OpenAI com acesso à API e faturamento disponível |
| `OPENAI_ALLOWED_USER_IDS` | Secret: UUID da sua conta em Supabase → Authentication → Users; para mais contas, IDs separados por vírgula |
| `OPENAI_MODEL` | Opcional: `gpt-5-mini` é o padrão |

Sem chave e lista de contas autorizadas, o botão fica desativado e o endpoint não faz chamadas externas. Não cole a chave no chat ou no GitHub. A API tem custo independente da assinatura do ChatGPT.

Há uma proteção de até cinco pedidos por minuto por conta e um pedido simultâneo, mantida em memória por instância do Worker. Ela não é um limite global de gastos; configure também o orçamento e acompanhe o uso do projeto na OpenAI. A integração usa respostas estruturadas, prazo de 25 segundos e `store: false`.

Os testes validam o contrato da IA com respostas simuladas, sem chamadas pagas. A disponibilidade real só pode ser confirmada após configurar a chave. Os demais testes incluem lacunas, acentos, estatísticas por fuso, dificuldades, cadastro rápido e navegação desktop/mobile.

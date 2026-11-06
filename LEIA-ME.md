# XLanguage — estudo, baralhos e progresso real

> Notas originais do pacote. Para instalar esta versão do repositório, siga primeiro o `README.md`: as dependências, o Tailwind e o adaptador SSR Node já estão configurados. O SQL 001 já foi aplicado no Supabase correto; o 002 continua opcional e não foi executado no ambiente real nesta atualização.

Este pacote continua o projeto Astro + Tailwind + Supabase que você já tem. Mantém o visual aprovado do Prospect Manager e implementa os recursos de estudo. Não é um projeto independente: mantenha seu `package.json`, configuração Astro, adaptador de hospedagem e arquivos públicos.

## Instalação

1. No Supabase, abra o **SQL Editor** e execute `supabase/001_xlanguage.sql` inteiro. Pode ser executado novamente. Cria as tabelas `xl_*`, funções e políticas de acesso; não altera nem apaga `public.palavras`.
2. Para trazer suas palavras atuais, siga a seção **Palavras antigas** abaixo.
3. Copie a pasta `src/` deste pacote sobre a `src/` do projeto, substituindo os arquivos correspondentes. Agora há novos arquivos de API, componentes e páginas, além dos oito arquivos visuais anteriores. Guarde uma cópia dos seus arquivos atuais antes de substituir. Não remova seus outros arquivos. O `tsconfig.json` na raiz do pacote é o padrão estrito do Astro: se o seu já tem personalizações, preserve-as e garanta que `src/env.d.ts` e `.astro/types.d.ts` estejam incluídos.
4. Mantenha `PUBLIC_SUPABASE_URL` e `PUBLIC_SUPABASE_PUBLISHABLE_KEY` no ambiente. Não use a chave `service_role`. Para recuperação de senha em produção, adicione `PUBLIC_SITE_URL=https://seu-dominio.com` (sem caminho).
5. No Supabase, em **Authentication → URL Configuration → Redirect URLs**, adicione `https://seu-dominio.com/auth/callback` e a URL local correspondente, por exemplo `http://localhost:4321/auth/callback`. Em desenvolvimento, use `PUBLIC_SITE_URL=http://localhost:4321`. As configurações de envio de email do seu Supabase precisam estar funcionando.
6. Inicie com seu comando habitual, por exemplo `npm run dev`. O projeto precisa renderizar no servidor, como o middleware e o login que você já usava; mantenha a configuração SSR e seu adaptador atual. Faça o build habitual antes de publicar.

A conexão com o seu projeto Supabase não foi disponibilizada nesta conversa. Por isso, o SQL, a cópia dos arquivos e a configuração das URLs ainda precisam ser aplicados no seu ambiente. Nenhum banco externo foi alterado e nenhum email de recuperação foi enviado durante o desenvolvimento.

## Palavras antigas

As palavras continuam guardadas na tabela original até você importá-las. Há duas opções:

- **Importação pelo SQL:** abra `supabase/002_importar_palavras_antigas.sql`, substitua apenas `COLOQUE_SEU_EMAIL_AQUI` pelo email da sua conta e execute o script no SQL Editor. Se a tabela antiga tem `user_id`, importa somente as linhas pertencentes àquela conta. Se não tem `user_id`, o script só aceita um projeto com exatamente uma conta, evitando atribuir dados de outra pessoa. Não apaga nem modifica os originais, não sobrescreve palavras já importadas e cria novos IDs no modelo novo.
- **Importação pelo app:** no Dicionário, use **Importar palavras**. Cole duas colunas da sua planilha (palavra e tradução, separadas por TAB); uma terceira coluna opcional é o exemplo. Também aceita JSON no formato abaixo. O idioma é o que estiver selecionado no cabeçalho.

```json
[
  {"texto":"deadline","traducao":"prazo","exemplo":"The deadline is Monday."},
  {"texto":"meeting","traducao":"reunião"}
]
```

Cada lote aceita até 500 entradas. O lote é transacional: uma linha inválida impede a gravação de todas as linhas daquele envio. Duplicadas no mesmo idioma são ignoradas; a tradução existente é preservada. Se selecionar um baralho durante a importação, as entradas novas e as duplicadas existentes ficam vinculadas a ele.

## O que está implementado

- Seletor do **idioma estudado** no cabeçalho, no padrão visual do dashboard. O texto “Meu espaço de estudo” e a cápsula de marca ao lado do logo foram removidos. A marca da barra lateral permanece.
- Inglês, Espanhol, Francês, Alemão, Italiano, Português, Japonês, Coreano e Mandarim. Ative os idiomas em **Configurações**. Trocar no cabeçalho muda palavras, baralhos, revisão e indicadores. A interface continua em português.
- Dicionário com busca no servidor, 30 entradas por página, filtro por baralho, pronúncia, criação, edição, exclusão confirmada, etiquetas e importação em lote. Uma palavra pode pertencer a vários baralhos do mesmo idioma.
- Baralhos com criação, edição, exclusão, contagem real e revisão filtrada. Excluir um baralho não exclui as palavras. Uma palavra sem baralho continua disponível na revisão geral.
- Revisão com gravação de notas e próximas datas. Apenas cartões novos ou vencidos entram na fila, em sessões de até 100 cartões. Para continuar uma fila maior, use **Ver cartões disponíveis** ao concluir a sessão.
- Dashboard com dados reais do idioma ativo: pendentes, vocabulário, palavras consolidadas, meta, sequência e últimos sete dias.
- Configurações de nome, meta diária e fuso horário; sair da conta, solicitar recuperação e definir nova senha. A recuperação PKCE deve ser concluída no mesmo navegador em que foi solicitada.
- Dados isolados por conta no banco, com RLS. A gravação de uma nota e do histórico acontece na mesma transação. Retentativas da mesma avaliação não duplicam o histórico; conflitos entre abas exigem atualizar a sessão.

Desativar um idioma nas configurações apenas o esconde do seletor. As palavras e revisões desse idioma permanecem salvas.

## Como funciona a revisão

É um agendador simples inspirado em repetição espaçada, sem a pretensão de reproduzir FSRS ou outro algoritmo completo:

- **Errei:** volta em 1 minuto, reinicia a sequência de acertos e reduz a facilidade.
- **Difícil:** volta em pelo menos 1 dia; aumenta o intervalo atual em cerca de 20%, sem aumentar a sequência de acertos.
- **Bom:** 1 dia no primeiro acerto, 6 dias no segundo; depois multiplica o intervalo pela facilidade.
- **Fácil:** 4 dias no primeiro acerto; depois aumenta mais que “Bom” e eleva a facilidade.

Os botões mostram o próximo intervalo calculado para o cartão. A data definitiva é calculada pelo banco no momento de salvar. Palavras erradas não reaparecem antes de vencer o minuto; se a sessão terminar, você pode abrir outra quando elas estiverem disponíveis.

“Consolidada” significa pelo menos dois acertos na sequência do agendador. É um indicador de prática, não uma avaliação de fluência. Uma nota “Errei” reinicia essa sequência.

A meta conta **palavras diferentes revisadas naquele dia**, incluindo tentativas erradas. Repetir a mesma palavra no dia não aumenta a contagem. A sequência conta dias consecutivos com alguma revisão no idioma selecionado; uma sequência de ontem permanece ativa até você perder um dia inteiro. O fuso configurado define os limites de cada dia. A mesma meta diária configurada é aplicada separadamente a cada idioma.

Excluir uma palavra remove seus vínculos, mas preserva os registros de estudo e as estatísticas históricas. Uma palavra nova com o mesmo texto inicia um novo cartão.

## Login e mídia

O login continua usando o Supabase por cookies. A sessão é verificada no servidor. Os novos endpoints autenticados usam as mesmas credenciais públicas do projeto e as políticas do banco.

O bloco `midia` em `src/pages/login.astro` continua disponível para configurar imagem ou vídeo do painel direito. O caminho padrão é vazio; restaure ali sua personalização se você a alterou depois do pacote anterior.

As vozes de pronúncia dependem do navegador/sistema. Não há serviço pago de geração de áudio neste pacote.

## Validação realizada

- Compilação Astro/Tailwind e verificação TypeScript.
- Migração executada duas vezes num PostgreSQL local de teste, com RLS entre duas contas.
- Agendamento de notas, tentativas repetidas, conflitos de versão, filtros de idioma/baralho e importação com rollback e deduplicação.
- Estatísticas, sequência por fuso, exclusão preservando histórico e importação do legado com atribuição de proprietário.
- Renderização no servidor com dados de teste e testes de DOM para navegação, temas e formulários.

A sessão real de Supabase, o envio real de email e a aparência em navegador não foram verificados nesta execução. Confira esses pontos no seu ambiente antes de publicar. Os dados e o servidor usados na verificação não estão no pacote.

O teste de banco reproduzível está em `tests/database.mjs`. Para executá-lo separadamente com Node 24+, instale `@electric-sql/pglite` como dependência de desenvolvimento e rode `node --experimental-strip-types tests/database.mjs`. Isso testa um PostgreSQL local em memória, sem tocar no Supabase real. Essa dependência não é necessária para o app funcionar.

Referências oficiais usadas para auth e RLS:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/auth/server-side/advanced-guide
- https://supabase.com/docs/guides/database/postgres/row-level-security

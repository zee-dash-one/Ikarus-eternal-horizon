# Autenticação de produção — Supabase Auth
Atualizado em 2026-10-21. Decisão do usuário: email e senha com confirmação por email, além de Google. DEV continua usando email mockado e SQLite local.

## Implementado
- SDK oficial `@supabase/supabase-js@2.118.0` no cliente e no servidor. Cadastro separado do login; aviso para confirmar email; senha não passa pelo SQLite nem pelos endpoints de perfil/recordes.
- OAuth Google via Supabase com PKCE e callback para a página do jogo. O SDK gerencia a sessão/renovação; a API recebe Bearer, verifica `getUser(token)` no Auth e exige email confirmado.
- Identidades externas têm namespace próprio no SQLite e não herdam contas mockadas pelo mesmo email. Não se confia em identidade enviada pelo cliente nem em JWT apenas decodificado. O provedor indisponível retorna erro de serviço; não se cria guest.
- Produção usa kit web + HTTPS, origens exatas e chave publishable/anon. Chaves secret/service_role são rejeitadas. Rotas mock não são registradas no servidor de produção. DEV usa cookies locais; produção usa Bearer sem depender de cookie de terceiros.
- Testes cobrem parâmetros do SDK, confirmação exigida, Google, tokens rejeitados, isolamento de identidade, CORS e ausência de mock em produção. Isso não substitui validar contas reais.

## Configuração necessária para o piloto
1. Criar um projeto no Supabase. Em Authentication, habilitar email/senha e **Confirm email**. Sem confirmação habilitada, o app recusa a sessão automática devolvida pelo cadastro.
2. Configurar Site URL e a lista de Redirect URLs para a URL real do frontend, incluindo o caminho da instalação. Não cadastrar wildcard amplo para produção.
3. Habilitar Google no Supabase. Criar/configurar o cliente OAuth Web no Google Cloud: origem do jogo e callback `https://<project-ref>.supabase.co/auth/v1/callback`. Client ID/secret ficam no painel do provedor.
4. Configurar remetente SMTP no Supabase para enviar confirmação a usuários reais. O SMTP padrão restringe destinatários à equipe do projeto e serve para testes, não para o piloto público. Nenhum segredo SMTP vai para o repositório/frontend.
5. Copiar os exemplos de ambiente de `poc3/` e `demo-host/`, preenchendo URL do projeto, chave **pública**, domínio HTTPS da API, origens e caminho de banco durável. O servidor não precisa de service_role.
6. Subir a API com Node >=24.12 e o arquivo de ambiente: `node --env-file=.env.production src/index.ts`. Manter atrás de HTTPS/reverse proxy; o processo continua em loopback.
7. Confirmar uma conta nova por email, testar senha incorreta, email não confirmado, Google, logout, expiração/renovação, conta diferente e indisponibilidade da API. Depois executar `npm run build:release` no frontend.

## Pendências externas
Nenhum projeto Supabase, domínio, remetente SMTP ou cliente Google foi criado/configurado nesta tarefa. Nenhuma conta real foi cadastrada e nenhum email real foi enviado. F05 permanece aberto para ativação/QA online; o código e os testes da integração estão entregues. Recuperação de senha/autosserviço de conta e validação em iframe Itch devem ser tratados antes de anunciar esses recursos; não estão implícitos neste piloto.

Referências oficiais consultadas: [email/senha](https://supabase.com/docs/guides/auth/passwords), [Google](https://supabase.com/docs/guides/auth/social-login/auth-google), [verificação getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

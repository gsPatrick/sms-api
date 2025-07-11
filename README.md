# SMS Active - Backend

Backend para sistema de venda de SMS API SMS Active desenvolvido em Node.js com Express, Sequelize e PostgreSQL.

## 🚀 Tecnologias

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **Sequelize** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **express-validator** - Validação de dados
- **helmet** - Segurança HTTP
- **cors** - Cross-Origin Resource Sharing
- **express-rate-limit** - Rate limiting

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Configuração do banco
│   ├── models/                  # Modelos do Sequelize
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── SmsMessage.js
│   │   ├── SmsService.js
│   │   ├── ActiveNumber.js
│   │   └── index.js
│   ├── Features/                # Módulos por funcionalidade
│   │   ├── Auth/
│   │   │   ├── Auth.service.js
│   │   │   ├── Auth.controller.js
│   │   │   └── Auth.routes.js
│   │   ├── Credits/
│   │   ├── SMS/
│   │   └── Admin/
│   ├── Utils/                   # Utilitários
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── smsActive.js
│   └── Routes/
│       └── index.js             # Centralização das rotas
├── scripts/
│   └── seed.js                  # Script de dados iniciais
├── app.js                       # Arquivo principal
├── package.json
├── .env.example
└── README.md
```

## 🛠️ Instalação

### Pré-requisitos

- Node.js 16+ 
- PostgreSQL 12+
- npm ou yarn

### Passos

1. **Clone o repositório e navegue para o backend:**
   ```bash
   cd backend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```
   
   Edite o arquivo `.env` com suas configurações:
   ```env
   # Configurações do Servidor
   PORT=3001
   NODE_ENV=development

   # Configurações do Banco de Dados
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=smsactive_db
   DB_USER=postgres
   DB_PASSWORD=sua_senha

   # Configurações de Autenticação
   JWT_SECRET=sua_chave_secreta_jwt
   JWT_EXPIRES_IN=7d

   # Configurações da API SMS Active
   SMS_ACTIVE_API_KEY=sua_chave_api_sms_active
   SMS_ACTIVE_BASE_URL=https://api.sms-activate.ae/stubs/handler_api.php

   # Configurações do Stripe
   STRIPE_SECRET_KEY=sk_test_sua_chave_stripe
   STRIPE_PUBLISHABLE_KEY=pk_test_sua_chave_publica_stripe
   STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret

   # Configurações do Mercado Pago
   MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_mp
   MERCADO_PAGO_PUBLIC_KEY=sua_chave_publica_mp
   MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_mp

   # URLs do Frontend
   FRONTEND_URL=http://localhost:3000
   ```

4. **Configure o banco de dados PostgreSQL:**
   ```sql
   CREATE DATABASE smsactive_db;
   ```

5. **Execute as migrações e seed:**
   ```bash
   npm run db:sync
   npm run db:seed
   ```

6. **Inicie o servidor:**
   ```bash
   # Desenvolvimento
   npm run dev

   # Produção
   npm start
   ```

## 📚 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Perfil do usuário
- `PUT /api/auth/profile` - Atualizar perfil
- `PUT /api/auth/password` - Alterar senha

### Créditos
- `GET /api/credits/balance` - Saldo de créditos
- `POST /api/credits/add` - Adicionar créditos (Admin)
- `GET /api/credits/history` - Histórico de transações
- `GET /api/credits/stats` - Estatísticas de créditos
- `POST /api/credits/refund` - Reembolso (Admin)
- `GET /api/credits/all-transactions` - Todas as transações (Admin)

### SMS
- `POST /api/sms/request-number` - Solicitar número para OTP
- `GET /api/sms/status/:id` - Verificar status do SMS
- `POST /api/sms/reactivate/:id` - Reativar número
- `POST /api/sms/cancel/:id` - Cancelar número
- `GET /api/sms/history` - Histórico de SMS
- `GET /api/sms/active-numbers` - Números ativos
- `POST /api/sms/webhook` - Webhook SMS Active
- `GET /api/sms/all-history` - Histórico completo (Admin)

### Administração
- `GET /api/admin/users` - Listar usuários
- `GET /api/admin/users/:id` - Detalhes do usuário
- `PUT /api/admin/users/:id` - Atualizar usuário
- `DELETE /api/admin/users/:id` - Deletar usuário
- `GET /api/admin/services` - Listar serviços SMS
- `POST /api/admin/services` - Criar serviço SMS
- `PUT /api/admin/services/:id` - Atualizar serviço SMS
- `DELETE /api/admin/services/:id` - Deletar serviço SMS
- `GET /api/admin/stats` - Estatísticas do sistema
- `GET /api/admin/services/available` - Serviços disponíveis

### Utilitários
- `GET /api/health` - Health check

## 🔐 Autenticação

O sistema utiliza JWT (JSON Web Tokens) para autenticação. Inclua o token no header das requisições:

```
Authorization: Bearer seu_jwt_token
```

## 👥 Tipos de Usuário

- **Admin**: Acesso completo ao sistema
- **Client**: Acesso às funcionalidades de cliente

## 🔒 Segurança

- Rate limiting implementado
- Validação de dados com express-validator
- Headers de segurança com helmet
- Senhas hasheadas com bcryptjs
- CORS configurado

## 📊 Banco de Dados

### Modelos Principais

- **User**: Usuários do sistema
- **Transaction**: Transações financeiras
- **SmsMessage**: Mensagens SMS
- **SmsService**: Serviços SMS disponíveis
- **ActiveNumber**: Números ativos para OTP

## 🧪 Dados de Teste

Após executar o seed, você terá:

**Usuário Admin:**
- Email: admin@smsbra.com.br
- Senha: Admin123!

**Usuário Teste:**
- Email: teste@smsbra.com.br
- Senha: Teste123!

## 🚀 Deploy

### Variáveis de Ambiente para Produção

Certifique-se de configurar todas as variáveis de ambiente necessárias:

- `NODE_ENV=production`
- `JWT_SECRET` (chave forte e única)
- Configurações reais de banco de dados
- Chaves reais das APIs (SMS Active, Stripe, Mercado Pago)

### Comandos de Deploy

```bash
# Instalar dependências
npm ci --only=production

# Sincronizar banco de dados
npm run db:sync

# Executar seed (se necessário)
npm run db:seed

# Iniciar aplicação
npm start
```

## 📝 Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento com nodemon
- `npm run db:sync` - Sincroniza modelos com o banco
- `npm run db:seed` - Executa seed de dados iniciais

## 🐛 Troubleshooting

### Erro de Conexão com Banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Certifique-se de que o banco de dados existe

### Erro de Autenticação JWT
- Verifique se o `JWT_SECRET` está configurado
- Confirme se o token está sendo enviado corretamente

### Erro na API SMS Active
- Verifique se a `SMS_ACTIVE_API_KEY` está correta
- Confirme se há saldo na conta SMS Active

## 📞 Suporte

Para suporte técnico, entre em contato através do email: suporte@smsbra.com.br


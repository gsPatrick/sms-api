## Esboço dos Endpoints da API

### Autenticação (Auth)
- `POST /api/auth/register`: Registro de novo usuário.
- `POST /api/auth/login`: Login de usuário.
- `POST /api/auth/logout`: Logout de usuário.
- `GET /api/auth/me`: Obter informações do usuário logado.

### Usuários (Users) - Apenas para Admin
- `GET /api/users`: Listar todos os usuários.
- `GET /api/users/:id`: Obter detalhes de um usuário específico.
- `PUT /api/users/:id`: Atualizar informações de um usuário.
- `DELETE /api/users/:id`: Deletar um usuário.
- `POST /api/users/:id/add-credits`: Adicionar créditos a um usuário.

### Créditos e Transações (Credits & Transactions)
- `POST /api/credits/purchase`: Iniciar compra de créditos (integração com gateways).
- `POST /api/credits/webhook/stripe`: Webhook para Stripe.
- `POST /api/credits/webhook/mercadopago`: Webhook para Mercado Pago.
- `GET /api/transactions`: Listar transações do usuário logado (ou todas para Admin).
- `GET /api/transactions/:id`: Obter detalhes de uma transação específica.

### SMS (SMS)
- `POST /api/sms/send`: Enviar SMS (para usuários com permissão).
- `POST /api/sms/receive/webhook`: Webhook para recebimento de SMS (da API SMS Active).
- `GET /api/sms/history`: Histórico de SMS enviados/recebidos pelo usuário.
- `GET /api/sms/history/:id`: Detalhes de uma mensagem SMS específica.
- `POST /api/sms/reactivate/:id`: Reativar um número para recebimento de SMS.
- `POST /api/sms/cancel/:id`: Cancelar um número para recebimento de SMS.

### Serviços SMS (SmsServices) - Apenas para Admin
- `GET /api/services`: Listar todos os serviços SMS disponíveis.
- `POST /api/services`: Criar um novo serviço SMS.
- `PUT /api/services/:id`: Atualizar um serviço SMS.
- `DELETE /api/services/:id`: Deletar um serviço SMS.

### Relatórios (Reports)
- `GET /api/reports/sms-summary`: Resumo de SMS (enviados, recebidos, falhas).
- `GET /api/reports/transactions-summary`: Resumo de transações.
- `GET /api/reports/user-activity`: Atividade de usuários (apenas Admin).



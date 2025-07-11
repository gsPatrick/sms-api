## Esboço do Esquema do Banco de Dados

### Usuários (Users)
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `email`: String (Unique)
- `password_hash`: String
- `role`: Enum ('admin', 'client')
- `credits`: Decimal (Default: 0.00)
- `created_at`: DateTime
- `updated_at`: DateTime

### Transações (Transactions)
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to Users)
- `type`: Enum ('credit_purchase', 'sms_sent', 'sms_received')
- `amount`: Decimal
- `gateway`: String (e.g., 'Stripe', 'MercadoPago', 'Internal')
- `transaction_id_gateway`: String (ID da transação no gateway de pagamento)
- `status`: Enum ('pending', 'completed', 'failed')
- `created_at`: DateTime
- `updated_at`: DateTime

### Mensagens SMS (SmsMessages)
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to Users)
- `type`: Enum ('sent', 'received')
- `from_number`: String
- `to_number`: String
- `message_body`: Text
- `status`: Enum ('sent', 'delivered', 'failed', 'pending', 'received')
- `api_message_id`: String (ID da mensagem na API SMS Active)
- `cost`: Decimal (Custo da mensagem, se aplicável)
- `service_code`: String (Código do serviço para recebimento de OTP)
- `reactivation_count`: Integer (Contador de reativações)
- `cancelled`: Boolean (Indica se o número foi cancelado)
- `cancellation_time`: DateTime (Timestamp do cancelamento)
- `created_at`: DateTime
- `updated_at`: DateTime

### Serviços SMS (SmsServices) - Para recebimento de OTP
- `id`: UUID (Primary Key)
- `name`: String (Nome do serviço, ex: 'WhatsApp', 'Telegram')
- `description`: Text
- `price_per_otp`: Decimal
- `active`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

### Números Ativos (ActiveNumbers) - Para gerenciar números alugados para OTP
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to Users)
- `sms_service_id`: UUID (Foreign Key to SmsServices)
- `phone_number`: String (Número de telefone alugado)
- `start_time`: DateTime (Quando o número foi ativado)
- `end_time`: DateTime (Quando o número expira ou foi desativado)
- `status`: Enum ('active', 'expired', 'cancelled')
- `last_message_received_at`: DateTime (Última vez que uma mensagem foi recebida neste número)
- `created_at`: DateTime
- `updated_at`: DateTime



/**
 * Modelo de Mensagem SMS
 * 
 * Define a estrutura da tabela de mensagens SMS no banco de dados
 * Registra todas as mensagens SMS enviadas e recebidas
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmsMessage = sequelize.define('SmsMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('sent', 'received'),
    allowNull: false
  },
  from_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Número de origem da mensagem'
  },
  to_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Número de destino da mensagem'
  },
  message_body: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Conteúdo da mensagem SMS'
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'failed', 'pending', 'received', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  api_message_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID da mensagem na API SMS Active'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: 'Custo da mensagem'
  },
  service_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Código do serviço para recebimento de OTP'
  },
  reactivation_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Contador de reativações'
  },
  cancelled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Indica se o número foi cancelado'
  },
  cancellation_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp do cancelamento'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Data de expiração do número'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Dados adicionais da mensagem em formato JSON'
  }
}, {
  tableName: 'sms_messages',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['api_message_id']
    },
    {
      fields: ['service_code']
    }
  ]
});

/**
 * Método para marcar como cancelado
 */
SmsMessage.prototype.markAsCancelled = async function() {
  this.cancelled = true;
  this.cancellation_time = new Date();
  this.status = 'cancelled';
  await this.save();
};

/**
 * Método para incrementar contador de reativação
 */
SmsMessage.prototype.incrementReactivation = async function() {
  this.reactivation_count += 1;
  await this.save();
};

module.exports = SmsMessage;


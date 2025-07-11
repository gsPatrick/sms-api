/**
 * Modelo de Transação
 * 
 * Define a estrutura da tabela de transações no banco de dados
 * Registra todas as transações financeiras do sistema
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
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
    type: DataTypes.ENUM('credit_purchase', 'sms_sent', 'sms_received', 'refund'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  gateway: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Gateway de pagamento utilizado (Stripe, MercadoPago, Internal)'
  },
  transaction_id_gateway: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID da transação no gateway de pagamento'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição adicional da transação'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Dados adicionais da transação em formato JSON'
  }
}, {
  tableName: 'transactions',
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
      fields: ['transaction_id_gateway']
    }
  ]
});

module.exports = Transaction;


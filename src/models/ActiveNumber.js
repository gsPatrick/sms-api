/**
 * Modelo de Número Ativo
 * 
 * Define a estrutura da tabela de números ativos no banco de dados
 * Gerencia números alugados para recebimento de OTP
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActiveNumber = sequelize.define('ActiveNumber', {
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
  sms_service_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sms_services',
      key: 'id'
    }
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Número de telefone alugado'
  },
  api_activation_id: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'ID da ativação na API SMS Active'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Quando o número foi ativado'
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Quando o número expira ou foi desativado'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'active'
  },
  last_message_received_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Última vez que uma mensagem foi recebida neste número'
  },
  country_code: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Código do país do número'
  },
  operator: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Operadora do número'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: 'Custo do número'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Dados adicionais do número em formato JSON'
  }
}, {
  tableName: 'active_numbers',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['api_activation_id']
    },
    {
      fields: ['phone_number']
    }
  ]
});

/**
 * Método para marcar como expirado
 */
ActiveNumber.prototype.markAsExpired = async function() {
  this.status = 'expired';
  this.end_time = new Date();
  await this.save();
};

/**
 * Método para marcar como cancelado
 */
ActiveNumber.prototype.markAsCancelled = async function() {
  this.status = 'cancelled';
  this.end_time = new Date();
  await this.save();
};

/**
 * Método para marcar como completado
 */
ActiveNumber.prototype.markAsCompleted = async function() {
  this.status = 'completed';
  this.end_time = new Date();
  await this.save();
};

/**
 * Método para atualizar última mensagem recebida
 */
ActiveNumber.prototype.updateLastMessageReceived = async function() {
  this.last_message_received_at = new Date();
  await this.save();
};

module.exports = ActiveNumber;


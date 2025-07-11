/**
 * Modelo de Serviço SMS
 * 
 * Define a estrutura da tabela de serviços SMS no banco de dados
 * Registra os serviços disponíveis para recebimento de OTP
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SmsService = sequelize.define('SmsService', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Nome do serviço (ex: WhatsApp, Telegram)'
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Código do serviço na API SMS Active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Descrição do serviço'
  },
  price_per_otp: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Preço por OTP recebido'
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Indica se o serviço está ativo'
  },
  icon_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL do ícone do serviço'
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Categoria do serviço (social, messaging, etc.)'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Dados adicionais do serviço em formato JSON'
  }
}, {
  tableName: 'sms_services',
  indexes: [
    {
      fields: ['active']
    },
    {
      fields: ['code']
    },
    {
      fields: ['category']
    }
  ]
});

module.exports = SmsService;


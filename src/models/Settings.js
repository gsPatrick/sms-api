// src/models/Setting.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    unique: true,
    comment: 'Chave única da configuração (ex: MERCADOPAGO_ACCESS_TOKEN)'
  },
  value: {
    type: DataTypes.TEXT, // Usar TEXT para acomodar tokens longos
    allowNull: true,
    comment: 'Valor da configuração'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Descrição do que a configuração faz'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Indica se a configuração pode ser lida por usuários não-admin'
  }
}, {
  tableName: 'settings',
  timestamps: true // Adiciona createdAt e updatedAt
});

module.exports = Setting;
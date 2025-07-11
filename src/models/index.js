/**
 * Arquivo de índice dos modelos
 * 
 * Centraliza a importação de todos os modelos e define as associações
 * entre eles para manter a integridade referencial
 */

const { sequelize } = require('../config/database');
const User = require('./User');
const Transaction = require('./Transaction');
const SmsMessage = require('./SmsMessage');
const SmsService = require('./SmsService');
const ActiveNumber = require('./ActiveNumber');

// Definindo as associações entre os modelos

// User -> Transaction (1:N)
User.hasMany(Transaction, {
  foreignKey: 'user_id',
  as: 'transactions'
});

Transaction.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// User -> SmsMessage (1:N)
User.hasMany(SmsMessage, {
  foreignKey: 'user_id',
  as: 'sms_messages'
});

SmsMessage.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// SmsService -> SmsMessage (1:N)
SmsService.hasMany(SmsMessage, {
  foreignKey: 'service_id',
  as: 'messages'
});

SmsMessage.belongsTo(SmsService, {
  foreignKey: 'service_id',
  as: 'service'
});

// User -> ActiveNumber (1:N)
User.hasMany(ActiveNumber, {
  foreignKey: 'user_id',
  as: 'active_numbers'
});

ActiveNumber.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// SmsService -> ActiveNumber (1:N)
SmsService.hasMany(ActiveNumber, {
  foreignKey: 'service_id',
  as: 'active_numbers'
});

ActiveNumber.belongsTo(SmsService, {
  foreignKey: 'service_id',
  as: 'service'
});

/**
 * Função para testar a conexão com o banco de dados
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao conectar com o banco de dados:', error);
    throw error;
  }
};

/**
 * Função para sincronizar os modelos com o banco de dados
 */
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Modelos sincronizados com o banco de dados.');
  } catch (error) {
    console.error('❌ Erro ao sincronizar modelos:', error);
    throw error;
  }
};

// Exporta todos os modelos e funções utilitárias
module.exports = {
  sequelize,
  User,
  Transaction,
  SmsMessage,
  SmsService,
  ActiveNumber,
  testConnection,
  syncDatabase
};


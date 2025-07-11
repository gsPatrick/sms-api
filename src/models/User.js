/**
 * Modelo de Usuário
 * 
 * Define a estrutura da tabela de usuários no banco de dados
 * Inclui validações e métodos para autenticação
 */

const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      notEmpty: true
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'client'),
    allowNull: false,
    defaultValue: 'client'
  },
  credits: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    }
  }
});

/**
 * Método para verificar a senha
 * @param {string} password - Senha em texto plano
 * @returns {boolean} - True se a senha estiver correta
 */
User.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

/**
 * Método para adicionar créditos
 * @param {number} amount - Quantidade de créditos a adicionar
 */
User.prototype.addCredits = async function(amount) {
  this.credits = parseFloat(this.credits) + parseFloat(amount);
  await this.save();
};

/**
 * Método para debitar créditos
 * @param {number} amount - Quantidade de créditos a debitar
 * @returns {boolean} - True se o débito foi realizado com sucesso
 */
User.prototype.debitCredits = async function(amount) {
  if (parseFloat(this.credits) >= parseFloat(amount)) {
    this.credits = parseFloat(this.credits) - parseFloat(amount);
    await this.save();
    return true;
  }
  return false;
};

module.exports = User;


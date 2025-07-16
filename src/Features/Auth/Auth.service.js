/**
 * Serviço de Autenticação
 *
 * Contém a lógica de negócio para autenticação de usuários
 * incluindo registro, login e gerenciamento de sessões
 */

const { User } = require('../../models');
const { generateToken } = require('../../Utils/auth');
const { Op } = require('sequelize'); // <<<< ESTA LINHA ESTAVA FALTANDO!

class AuthService {
  /**
   * Registra um novo usuário
   * @param {Object} userData - Dados do usuário
   * @returns {Object} - Usuário criado e token
   */
  async register(userData) {
    const { username, email, password, role = 'client' } = userData;

    // Verifica se o usuário já existe
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [ // <<<< CORREÇÃO: Usar [Op.or]
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('Email já está em uso');
      }
      if (existingUser.username === username) {
        throw new Error('Nome de usuário já está em uso');
      }
    }

    // Cria o novo usuário
    const user = await User.create({
      username,
      email,
      password_hash: password, // Será hasheado pelo hook do modelo
      role
    });

    // Gera o token
    const token = generateToken(user);

    // Remove a senha do retorno
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    return {
      user: userResponse,
      token
    };
  }

  /**
   * Realiza o login do usuário
   * @param {Object} loginData - Dados de login
   * @returns {Object} - Usuário e token
   */
  async login(loginData) {
    const { email, password } = loginData;

    // Busca o usuário pelo email
    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verifica se o usuário está ativo
    if (!user.is_active) {
      throw new Error('Conta desativada. Entre em contato com o suporte.');
    }

    // Verifica a senha
    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      throw new Error('Credenciais inválidas');
    }

    // Gera o token
    const token = generateToken(user);

    // Remove a senha do retorno
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    return {
      user: userResponse,
      token
    };
  }

  /**
   * Obtém as informações do usuário autenticado
   * @param {string} userId - ID do usuário
   * @returns {Object} - Dados do usuário
   */
  async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Atualiza o perfil do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} updateData - Dados para atualização
   * @returns {Object} - Usuário atualizado
   */
  async updateProfile(userId, updateData) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Campos permitidos para atualização
    const allowedFields = ['username', 'email'];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Verifica se username ou email já existem
    if (filteredData.username || filteredData.email) {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [ // <<<< CORREÇÃO: Usar [Op.or]
            filteredData.email ? { email: filteredData.email } : null,
            filteredData.username ? { username: filteredData.username } : null
          ].filter(Boolean),
          id: { [Op.ne]: userId } // <<<< CORREÇÃO: Usar [Op.ne]
        }
      });

      if (existingUser) {
        if (existingUser.email === filteredData.email) {
          throw new Error('Email já está em uso');
        }
        if (existingUser.username === filteredData.username) {
          throw new Error('Nome de usuário já está em uso');
        }
      }
    }

    // Atualiza o usuário
    await user.update(filteredData);

    // Remove a senha do retorno
    const userResponse = user.toJSON();
    delete userResponse.password_hash;

    return userResponse;
  }

  /**
   * Altera a senha do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} passwordData - Dados da senha
   * @returns {boolean} - Sucesso da operação
   */
  async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;

    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica a senha atual
    const isCurrentPasswordValid = await user.checkPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Atualiza a senha
    await user.update({
      password_hash: newPassword // Será hasheado pelo hook do modelo
    });

    return true;
  }
}

module.exports = new AuthService();
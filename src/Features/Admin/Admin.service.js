/**
 * Serviço de Administração
 * 
 * Contém a lógica de negócio para funcionalidades administrativas
 * incluindo gerenciamento de usuários e serviços SMS
 */

const { User, SmsService, Transaction, SmsMessage } = require('../../models');
const { Op } = require('sequelize');

class AdminService {
  /**
   * Obtém lista de todos os usuários
   * @param {Object} options - Opções de paginação e filtros
   * @returns {Object} - Lista de usuários paginada
   */
  async getAllUsers(options = {}) {
    const {
      page = 1,
      limit = 20,
      role,
      is_active,
      search
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    // Filtros opcionais
    if (role) {
      where.role = role;
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (search) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      users: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    };
  }

  /**
   * Obtém detalhes de um usuário específico
   * @param {string} userId - ID do usuário
   * @returns {Object} - Dados do usuário com estatísticas
   */
  async getUserDetails(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Estatísticas do usuário
    const totalTransactions = await Transaction.count({
      where: { user_id: userId }
    });

    const totalSmsMessages = await SmsMessage.count({
      where: { user_id: userId }
    });

    const totalSpent = await Transaction.sum('amount', {
      where: {
        user_id: userId,
        type: {
          [Op.in]: ['sms_sent', 'sms_received']
        },
        status: 'completed'
      }
    }) || 0;

    const totalPurchased = await Transaction.sum('amount', {
      where: {
        user_id: userId,
        type: 'credit_purchase',
        status: 'completed'
      }
    }) || 0;

    return {
      user,
      stats: {
        total_transactions: totalTransactions,
        total_sms_messages: totalSmsMessages,
        total_spent: parseFloat(totalSpent),
        total_purchased: parseFloat(totalPurchased)
      }
    };
  }

  /**
   * Atualiza informações de um usuário
   * @param {string} userId - ID do usuário
   * @param {Object} updateData - Dados para atualização
   * @returns {Object} - Usuário atualizado
   */
  async updateUser(userId, updateData) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Campos permitidos para atualização pelo admin
    const allowedFields = ['username', 'email', 'role', 'is_active', 'credits'];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Verifica se username ou email já existem (se estão sendo alterados)
    if (filteredData.username || filteredData.email) {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            filteredData.email ? { email: filteredData.email } : null,
            filteredData.username ? { username: filteredData.username } : null
          ].filter(Boolean),
          id: { [Op.ne]: userId }
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
   * Deleta um usuário
   * @param {string} userId - ID do usuário
   * @returns {boolean} - Sucesso da operação
   */
  async deleteUser(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Não permite deletar admin
    if (user.role === 'admin') {
      throw new Error('Não é possível deletar usuários administradores');
    }

    await user.destroy();
    return true;
  }

  /**
   * Obtém lista de todos os serviços SMS
   * @param {Object} options - Opções de paginação e filtros
   * @returns {Object} - Lista de serviços paginada
   */
  async getAllSmsServices(options = {}) {
    const {
      page = 1,
      limit = 20,
      active,
      category,
      search
    } = options;

    const offset = (page - 1) * limit;
    const where = {};

    // Filtros opcionais
    if (active !== undefined) {
      where.active = active;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { code: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows } = await SmsService.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      services: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    };
  }

  /**
   * Cria um novo serviço SMS
   * @param {Object} serviceData - Dados do serviço
   * @returns {Object} - Serviço criado
   */
  async createSmsService(serviceData) {
    const { name, code, description, price_per_otp, category, icon_url } = serviceData;

    // Verifica se o código já existe
    const existingService = await SmsService.findOne({
      where: {
        [Op.or]: [
          { name },
          { code }
        ]
      }
    });

    if (existingService) {
      if (existingService.name === name) {
        throw new Error('Nome do serviço já está em uso');
      }
      if (existingService.code === code) {
        throw new Error('Código do serviço já está em uso');
      }
    }

    const service = await SmsService.create({
      name,
      code,
      description,
      price_per_otp: parseFloat(price_per_otp),
      category,
      icon_url,
      active: true
    });

    return service;
  }

  /**
   * Atualiza um serviço SMS
   * @param {string} serviceId - ID do serviço
   * @param {Object} updateData - Dados para atualização
   * @returns {Object} - Serviço atualizado
   */
  async updateSmsService(serviceId, updateData) {
    const service = await SmsService.findByPk(serviceId);

    if (!service) {
      throw new Error('Serviço não encontrado');
    }

    // Campos permitidos para atualização
    const allowedFields = ['name', 'code', 'description', 'price_per_otp', 'category', 'icon_url', 'active'];
    const filteredData = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    // Verifica se nome ou código já existem (se estão sendo alterados)
    if (filteredData.name || filteredData.code) {
      const existingService = await SmsService.findOne({
        where: {
          [Op.or]: [
            filteredData.name ? { name: filteredData.name } : null,
            filteredData.code ? { code: filteredData.code } : null
          ].filter(Boolean),
          id: { [Op.ne]: serviceId }
        }
      });

      if (existingService) {
        if (existingService.name === filteredData.name) {
          throw new Error('Nome do serviço já está em uso');
        }
        if (existingService.code === filteredData.code) {
          throw new Error('Código do serviço já está em uso');
        }
      }
    }

    await service.update(filteredData);
    return service;
  }

  /**
   * Deleta um serviço SMS
   * @param {string} serviceId - ID do serviço
   * @returns {boolean} - Sucesso da operação
   */
  async deleteSmsService(serviceId) {
    const service = await SmsService.findByPk(serviceId);

    if (!service) {
      throw new Error('Serviço não encontrado');
    }

    // Verifica se há números ativos usando este serviço
    const { ActiveNumber } = require('../../models');
    const activeNumbers = await ActiveNumber.count({
      where: {
        sms_service_id: serviceId,
        status: 'active'
      }
    });

    if (activeNumbers > 0) {
      throw new Error('Não é possível deletar serviço com números ativos');
    }

    await service.destroy();
    return true;
  }

  /**
   * Obtém estatísticas gerais do sistema
   * @returns {Object} - Estatísticas do sistema
   */
  async getSystemStats() {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const totalServices = await SmsService.count();
    const activeServices = await SmsService.count({ where: { active: true } });

    const totalTransactions = await Transaction.count();
    const completedTransactions = await Transaction.count({ where: { status: 'completed' } });

    const totalRevenue = await Transaction.sum('amount', {
      where: {
        type: 'credit_purchase',
        status: 'completed'
      }
    }) || 0;

    const totalSmsMessages = await SmsMessage.count();
    const receivedSmsMessages = await SmsMessage.count({ where: { status: 'received' } });

    // Estatísticas do último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const newUsersLastMonth = await User.count({
      where: {
        created_at: { [Op.gte]: lastMonth }
      }
    });

    const revenueLastMonth = await Transaction.sum('amount', {
      where: {
        type: 'credit_purchase',
        status: 'completed',
        created_at: { [Op.gte]: lastMonth }
      }
    }) || 0;

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        new_last_month: newUsersLastMonth
      },
      services: {
        total: totalServices,
        active: activeServices
      },
      transactions: {
        total: totalTransactions,
        completed: completedTransactions
      },
      revenue: {
        total: parseFloat(totalRevenue),
        last_month: parseFloat(revenueLastMonth)
      },
      sms: {
        total: totalSmsMessages,
        received: receivedSmsMessages
      }
    };
  }
}

module.exports = new AdminService();


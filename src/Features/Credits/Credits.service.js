/**
 * Serviço de Créditos
 * 
 * Contém a lógica de negócio para gerenciamento de créditos
 * incluindo compra, débito e histórico de transações
 */

const { User, Transaction } = require('../../models');
const { Op } = require('sequelize'); // Importação do operador Op

class CreditsService {
  /**
   * Obtém o saldo de créditos do usuário
   * @param {string} userId - ID do usuário
   * @returns {Object} - Saldo e informações do usuário
   */
  async getBalance(userId) {
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'credits']
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return {
      user_id: user.id,
      username: user.username,
      email: user.email,
      credits: parseFloat(user.credits)
    };
  }

  /**
   * Adiciona créditos ao usuário
   * @param {string} userId - ID do usuário
   * @param {number} amount - Quantidade de créditos
   * @param {Object} transactionData - Dados da transação
   * @returns {Object} - Transação criada
   */
  async addCredits(userId, amount, transactionData = {}) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Cria a transação
    const transaction = await Transaction.create({
      user_id: userId,
      type: 'credit_purchase', // Ou 'refund', dependendo do contexto da chamada
      amount: parseFloat(amount),
      gateway: transactionData.gateway || 'Internal',
      transaction_id_gateway: transactionData.transaction_id_gateway,
      status: transactionData.status || 'completed',
      description: transactionData.description || `Adição de ${amount} créditos`,
      metadata: transactionData.metadata || {}
    });

    // Adiciona os créditos ao usuário se a transação foi completada
    // Se a transação é de crédito_purchase ou refund e foi completada, o saldo do usuário é atualizado.
    // Isso garante que o saldo seja atualizado apenas uma vez, após a confirmação do pagamento.
    if (transaction.status === 'completed' && (transaction.type === 'credit_purchase' || transaction.type === 'refund')) {
      await user.addCredits(amount);
    }

    return transaction;
  }

  /**
   * Debita créditos do usuário
   * @param {string} userId - ID do usuário
   * @param {number} amount - Quantidade de créditos
   * @param {Object} transactionData - Dados da transação
   * @returns {Object} - Transação criada
   */
  async debitCredits(userId, amount, transactionData = {}) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verifica se o usuário tem créditos suficientes
    if (parseFloat(user.credits) < parseFloat(amount)) {
      throw new Error('Créditos insuficientes');
    }

    // Debita os créditos
    const success = await user.debitCredits(amount);

    if (!success) {
      throw new Error('Erro ao debitar créditos');
    }

    // Cria a transação
    const transaction = await Transaction.create({
      user_id: userId,
      type: transactionData.type || 'sms_sent', // 'sms_sent' ou 'sms_received'
      amount: parseFloat(amount),
      gateway: 'Internal',
      status: 'completed',
      description: transactionData.description || `Débito de ${amount} créditos`,
      metadata: transactionData.metadata || {}
    });

    return transaction;
  }

  /**
   * Obtém o histórico de transações do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de paginação e filtros
   * @returns {Object} - Lista de transações paginada
   */
  async getTransactionHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      type, // Pode ser uma string ou um array de strings
      status,
      startDate,
      endDate
    } = options;

    const offset = (page - 1) * limit;
    const where = { user_id: userId };

    // Lógica para lidar com 'type' sendo um array ou string
    if (type) {
      if (Array.isArray(type)) {
        where.type = { [Op.in]: type }; // Se for array, usa Op.in
      } else {
        where.type = type; // Se for string, usa diretamente
      }
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    return {
      transactions: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    };
  }

  /**
   * Obtém estatísticas de créditos do usuário
   * @param {string} userId - ID do usuário
   * @returns {Object} - Estatísticas de créditos
   */
  async getCreditStats(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Total de créditos comprados
    const totalPurchased = await Transaction.sum('amount', {
      where: {
        user_id: userId,
        type: 'credit_purchase',
        status: 'completed'
      }
    }) || 0;

    // Total de créditos gastos
    const totalSpent = await Transaction.sum('amount', {
      where: {
        user_id: userId,
        type: {
          [Op.in]: ['sms_sent', 'sms_received']
        },
        status: 'completed'
      }
    }) || 0;

    // Transações do último mês
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const lastMonthTransactions = await Transaction.count({
      where: {
        user_id: userId,
        created_at: {
          [Op.gte]: lastMonth
        }
      }
    });

    return {
      current_balance: parseFloat(user.credits),
      total_purchased: parseFloat(totalPurchased),
      total_spent: parseFloat(totalSpent),
      last_month_transactions: lastMonthTransactions
    };
  }

  /**
   * Processa reembolso de créditos
   * @param {string} userId - ID do usuário
   * @param {number} amount - Quantidade de créditos
   * @param {string} reason - Motivo do reembolso
   * @returns {Object} - Transação de reembolso
   */
  async refundCredits(userId, amount, reason = 'Reembolso') {
    const user = await User.findByPk(userId);

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // ✅ CORREÇÃO: A chamada para user.addCredits já está no addCredits, para não duplicar
    // await user.addCredits(amount); 

    // Cria a transação de reembolso, que por sua vez, adiciona os créditos
    const transaction = await this.addCredits(userId, amount, {
      type: 'refund',
      gateway: 'Internal',
      status: 'completed',
      description: reason,
      metadata: { refund_reason: reason }
    });

    return transaction;
  }
}

module.exports = new CreditsService();
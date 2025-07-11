/**
 * Controlador de Créditos
 * 
 * Gerencia as requisições HTTP relacionadas ao gerenciamento de créditos
 * e delega a lógica de negócio para o CreditsService
 */

const CreditsService = require('./Credits.service');

class CreditsController {
  /**
   * Obtém o saldo de créditos do usuário
   * GET /api/credits/balance
   */
  async getBalance(req, res) {
    try {
      const balance = await CreditsService.getBalance(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Saldo obtido com sucesso',
        data: balance
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Adiciona créditos ao usuário (apenas Admin)
   * POST /api/credits/add
   */
  async addCredits(req, res) {
    try {
      const { user_id, amount, description } = req.body;
      
      const transaction = await CreditsService.addCredits(user_id, amount, {
        description: description || `Créditos adicionados pelo admin ${req.user.username}`,
        metadata: { added_by_admin: req.user.id }
      });
      
      res.status(201).json({
        success: true,
        message: 'Créditos adicionados com sucesso',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém o histórico de transações do usuário
   * GET /api/credits/history
   */
  async getTransactionHistory(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        type: req.query.type,
        status: req.query.status,
        startDate: req.query.start_date,
        endDate: req.query.end_date
      };

      const history = await CreditsService.getTransactionHistory(req.user.id, options);
      
      res.status(200).json({
        success: true,
        message: 'Histórico obtido com sucesso',
        data: history
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém estatísticas de créditos do usuário
   * GET /api/credits/stats
   */
  async getCreditStats(req, res) {
    try {
      const stats = await CreditsService.getCreditStats(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Processa reembolso de créditos (apenas Admin)
   * POST /api/credits/refund
   */
  async refundCredits(req, res) {
    try {
      const { user_id, amount, reason } = req.body;
      
      const transaction = await CreditsService.refundCredits(
        user_id, 
        amount, 
        reason || `Reembolso processado pelo admin ${req.user.username}`
      );
      
      res.status(201).json({
        success: true,
        message: 'Reembolso processado com sucesso',
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém histórico de transações de todos os usuários (apenas Admin)
   * GET /api/credits/all-transactions
   */
  async getAllTransactions(req, res) {
    try {
      const { Transaction, User } = require('../../models');
      const { Op } = require('sequelize');
      
      const {
        page = 1,
        limit = 20,
        type,
        status,
        user_id,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtros opcionais
      if (type) where.type = type;
      if (status) where.status = status;
      if (user_id) where.user_id = user_id;

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
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

      res.status(200).json({
        success: true,
        message: 'Transações obtidas com sucesso',
        data: {
          transactions: rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(count / limit),
            total_items: count,
            items_per_page: parseInt(limit)
          }
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new CreditsController();


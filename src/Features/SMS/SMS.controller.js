/**
 * Controlador de SMS
 * 
 * Gerencia as requisições HTTP relacionadas ao gerenciamento de SMS
 * e delega a lógica de negócio para o SMSService
 */

const SMSService = require('./SMS.service');

class SMSController {
  /**
   * Solicita um número para recebimento de SMS OTP
   * POST /api/sms/request-number
   */
  async requestNumber(req, res) {
    try {
      const result = await SMSService.requestNumber(req.user.id, req.body);
      
      res.status(201).json({
        success: true,
        message: 'Número solicitado com sucesso',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Verifica o status de recebimento de SMS
   * GET /api/sms/status/:activeNumberId
   */
  async checkSmsStatus(req, res) {
    try {
      const { activeNumberId } = req.params;
      const result = await SMSService.checkSmsStatus(req.user.id, activeNumberId);
      
      res.status(200).json({
        success: true,
        message: 'Status verificado com sucesso',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Reativa um número para receber outro SMS
   * POST /api/sms/reactivate/:activeNumberId
   */
  async reactivateNumber(req, res) {
    try {
      const { activeNumberId } = req.params;
      const result = await SMSService.reactivateNumber(req.user.id, activeNumberId);
      
      res.status(200).json({
        success: true,
        message: 'Número reativado com sucesso',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Cancela um número ativo
   * POST /api/sms/cancel/:activeNumberId
   */
  async cancelNumber(req, res) {
    try {
      const { activeNumberId } = req.params;
      const { reason } = req.body;
      
      const result = await SMSService.cancelNumber(req.user.id, activeNumberId, reason);
      
      res.status(200).json({
        success: true,
        message: 'Número cancelado com sucesso',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém o histórico de SMS do usuário
   * GET /api/sms/history
   */
  async getSmsHistory(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        service_code: req.query.service_code,
        startDate: req.query.start_date,
        endDate: req.query.end_date
      };

      const history = await SMSService.getSmsHistory(req.user.id, options);
      
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
   * Obtém os números ativos do usuário
   * GET /api/sms/active-numbers
   */
  async getActiveNumbers(req, res) {
    try {
      const activeNumbers = await SMSService.getActiveNumbers(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Números ativos obtidos com sucesso',
        data: activeNumbers
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Webhook para recebimento de SMS da API SMS Active
   * POST /api/sms/webhook
   */
  async smsWebhook(req, res) {
    try {
      // Processa o webhook da API SMS Active
      const { activation_id, status, code, phone } = req.body;
      
      if (!activation_id) {
        return res.status(400).json({
          success: false,
          message: 'ID de ativação não fornecido'
        });
      }

      // Busca o número ativo pelo ID da ativação
      const { ActiveNumber } = require('../../models');
      const activeNumber = await ActiveNumber.findOne({
        where: { api_activation_id: activation_id }
      });

      if (!activeNumber) {
        return res.status(404).json({
          success: false,
          message: 'Ativação não encontrada'
        });
      }

      // Processa baseado no status
      if (status === 'completed' && code) {
        await SMSService.processSmsReceived(activeNumber, code);
      } else if (status === 'cancelled') {
        await activeNumber.markAsCancelled();
      }

      res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso'
      });
    } catch (error) {
      console.error('Erro no webhook SMS:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obtém histórico de SMS de todos os usuários (apenas Admin)
   * GET /api/sms/all-history
   */
  async getAllSmsHistory(req, res) {
    try {
      const { SmsMessage, User } = require('../../models');
      const { Op } = require('sequelize');
      
      const {
        page = 1,
        limit = 20,
        status,
        service_code,
        user_id,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // Filtros opcionais
      if (status) where.status = status;
      if (service_code) where.service_code = service_code;
      if (user_id) where.user_id = user_id;

      if (startDate || endDate) {
        where.created_at = {};
        if (startDate) where.created_at[Op.gte] = new Date(startDate);
        if (endDate) where.created_at[Op.lte] = new Date(endDate);
      }

      const { count, rows } = await SmsMessage.findAndCountAll({
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
        message: 'Histórico obtido com sucesso',
        data: {
          messages: rows,
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

module.exports = new SMSController();


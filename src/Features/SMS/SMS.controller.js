/**
 * Controlador de SMS
 * 
 * Gerencia as requisições HTTP relacionadas ao gerenciamento de SMS
 * e delega a lógica de negócio para o SMSService
 */

const SMSService = require('./SMS.service');
const { ActiveNumber, SmsMessage, User } = require('../../models');
const { Op } = require('sequelize');

class SMSController {

  // =========================================================================
  // ✅ NOVOS MÉTODOS DO CONTROLLER PARA O FLUXO PAÍS -> SERVIÇO
  // =========================================================================
  
  /**
   * Obtém a lista de países disponíveis da API SMS Active.
   * GET /api/sms/countries
   */
  async getAvailableCountries(req, res) {
    try {
      // Delega a busca para o SMSService
      const countries = await SMSService.getAvailableCountries();
      res.status(200).json({
        success: true,
        message: 'Países obtidos com sucesso.',
        data: countries
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Obtém os serviços e preços para um país específico.
   * GET /api/sms/services-by-country/:countryId
   */
  async getServicesByCountry(req, res) {
    try {
      const { countryId } = req.params;
      // Delega a busca para o SMSService
      const services = await SMSService.getServicesByCountry(countryId);
      res.status(200).json({
        success: true,
        message: `Serviços para o país ${countryId} obtidos com sucesso.`,
        data: services
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // =========================================================================
  // MÉTODOS EXISTENTES (sem alterações na assinatura)
  // =========================================================================

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
      const options = { /* ... */ };
      const history = await SMSService.getSmsHistory(req.user.id, options);
      res.status(200).json({ success: true, message: 'Histórico obtido com sucesso', data: history });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Obtém os números ativos do usuário
   * GET /api/sms/active-numbers
   */
  async getActiveNumbers(req, res) {
    try {
      const activeNumbers = await SMSService.getActiveNumbers(req.user.id);
      res.status(200).json({ success: true, message: 'Números ativos obtidos com sucesso', data: activeNumbers });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Webhook para recebimento de SMS da API SMS Active
   * POST /api/sms/webhook
   */
  async smsWebhook(req, res) {
    try {
      const { activation_id, status, code, phone } = req.body;
      await SMSService.processWebhook(activation_id, status, code, phone);
      res.status(200).json({ success: true, message: 'Webhook processado com sucesso' });
    } catch (error) {
      console.error('Erro no webhook SMS:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
  }

  /**
   * Obtém estatísticas de uso de SMS para o usuário logado
   * GET /api/sms/stats
   */
  async getSmsUsageStats(req, res) {
    try {
        const userId = req.user.id;
        const period = req.query.period || 'daily';
        const days = parseInt(req.query.days) || 30; // Padrão 30 dias
        const stats = await SMSService.getSmsUsageStats(userId, period, days); 
        res.status(200).json({ success: true, message: 'Estatísticas obtidas com sucesso', data: stats });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
  }

  /**
   * Obtém histórico de SMS de todos os usuários (apenas Admin)
   * GET /api/sms/all-history
   */
  async getAllSmsHistory(req, res) {
    // ...
  }
}

module.exports = new SMSController();
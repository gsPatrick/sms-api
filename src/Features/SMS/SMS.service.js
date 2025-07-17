/**
 * Serviço de SMS
 * 
 * Contém a lógica de negócio para gerenciamento de SMS
 * incluindo solicitação de números, recebimento de códigos OTP e histórico
 */

const { SmsMessage, ActiveNumber, SmsService, User } = require('../../models');
const smsActiveAPI = require('../../Utils/smsActive');
const CreditsService = require('../Credits/Credits.service');
const { Op, fn, col, literal } = require('sequelize'); // <<<< CORREÇÃO AQUI! Adicionado fn, col, literal

class SMSService {
  /**
   * Solicita um número para recebimento de SMS OTP
   * @param {string} userId - ID do usuário
   * @param {Object} requestData - Dados da solicitação
   * @returns {Object} - Número ativo criado
   */
  async requestNumber(userId, requestData) {
    const { service_code, country_code = '0', operator = '' } = requestData;

    // Verifica se o serviço existe
    const service = await SmsService.findOne({
      where: { code: service_code, active: true }
    });

    if (!service) {
      throw new Error('Serviço não encontrado ou inativo');
    }

    // Verifica se o usuário tem créditos suficientes
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (parseFloat(user.credits) < parseFloat(service.price_per_otp)) {
      throw new Error('Créditos insuficientes');
    }

    try {
      // Solicita o número na API SMS Active
      const numberData = await smsActiveAPI.getNumber(service_code, country_code, operator);

      // Debita os créditos do usuário
      await CreditsService.debitCredits(userId, service.price_per_otp, {
        type: 'sms_received',
        description: `Solicitação de número para ${service.name}`,
        metadata: {
          service_code,
          api_activation_id: numberData.id,
          phone_number: numberData.number
        }
      });

      // Cria o registro do número ativo
      const activeNumber = await ActiveNumber.create({
        user_id: userId,
        sms_service_id: service.id,
        phone_number: numberData.number,
        api_activation_id: numberData.id,
        country_code,
        operator,
        cost: service.price_per_otp,
        status: 'active',
        metadata: {
          service_name: service.name,
          requested_at: new Date()
        }
      });

      // Cria o registro da mensagem SMS
      const smsMessage = await SmsMessage.create({
        user_id: userId,
        type: 'received',
        to_number: numberData.number,
        status: 'pending',
        api_message_id: numberData.id,
        cost: service.price_per_otp,
        service_code,
        metadata: {
          service_name: service.name,
          active_number_id: activeNumber.id
        }
      });

      // Agenda o cancelamento automático após 2 minutos se não receber código
      setTimeout(async () => {
        await this.checkAndCancelIfNoMessage(activeNumber.id);
      }, 2 * 60 * 1000); // 2 minutos

      return {
        active_number: activeNumber,
        sms_message: smsMessage,
        service: service
      };
    } catch (error) {
      throw new Error(`Erro ao solicitar número: ${error.message}`);
    }
  }

  /**
   * Verifica o status de uma ativação e cancela se não recebeu mensagem
   * @param {string} activeNumberId - ID do número ativo
   */
  async checkAndCancelIfNoMessage(activeNumberId) {
    try {
      const activeNumber = await ActiveNumber.findByPk(activeNumberId);
      
      if (!activeNumber || activeNumber.status !== 'active') {
        return;
      }

      // Verifica se recebeu alguma mensagem
      if (!activeNumber.last_message_received_at) {
        await this.cancelNumber(activeNumber.user_id, activeNumberId, 'Cancelamento automático - sem mensagem recebida em 2 minutos');
      }
    } catch (error) {
      console.error('Erro ao verificar cancelamento automático:', error);
    }
  }

  /**
   * Verifica o status de recebimento de SMS
   * @param {string} userId - ID do usuário
   * @param {string} activeNumberId - ID do número ativo
   * @returns {Object} - Status da mensagem
   */
  async checkSmsStatus(userId, activeNumberId) {
    const activeNumber = await ActiveNumber.findOne({
      where: { id: activeNumberId, user_id: userId },
      include: [
        {
          model: SmsService,
          as: 'smsService'
        }
      ]
    });

    if (!activeNumber) {
      throw new Error('Número ativo não encontrado');
    }

    try {
      // Verifica o status na API SMS Active
      const status = await smsActiveAPI.getStatus(activeNumber.api_activation_id);

      // Atualiza o registro local baseado no status da API
      if (status.status === 'completed' && status.code) {
        await this.processSmsReceived(activeNumber, status.code);
      } else if (status.status === 'cancelled') {
        await activeNumber.markAsCancelled();
      }

      return {
        active_number: activeNumber,
        status: status.status,
        code: status.code,
        service: activeNumber.smsService
      };
    } catch (error) {
      throw new Error(`Erro ao verificar status: ${error.message}`);
    }
  }

   async getSmsUsageStats(userId, period = 'daily', days = 30) {
    let groupByFormat;
    let startDate;

    if (period === 'daily') {
      // Para o PostgreSQL, use TO_CHAR para formatar a data como DD/MM
      groupByFormat = "TO_CHAR(\"created_at\", 'DD/MM')";
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    } else if (period === 'monthly') {
      // Para o PostgreSQL, use TO_CHAR para formatar a data como MM/YYYY
      groupByFormat = "TO_CHAR(\"created_at\", 'MM/YYYY')";
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6); // Últimos 6 meses
      startDate.setDate(1); // Primeiro dia do mês
    } else {
      throw new Error('Período inválido. Use "daily" ou "monthly".');
    }

    const whereClause = {
      user_id: userId,
      created_at: {
        [Op.gte]: startDate,
      },
    };

    const stats = await SmsMessage.findAll({
      attributes: [
        // Agrupa por data formatada
        [literal(groupByFormat), 'date'],
        [fn('COUNT', col('id')), 'total_sms'],
        [fn('SUM', literal("CASE WHEN status = 'received' THEN 1 ELSE 0 END")), 'delivered_sms'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'failed_sms'], // Assumindo 'cancelled' como falha
      ],
      where: whereClause,
      group: [literal(groupByFormat)],
      order: [literal(groupByFormat)], // Ordena pela data formatada
      raw: true, // Retorna dados puros
    });
    
    // A API retornará os dados como string (ex: "date": "16/07")
    // Você pode precisar de um pré-processamento no frontend ou aqui para garantir ordem.
    // Para 'daily', garanta que todos os dias do período estejam presentes, mesmo com 0 envios.
    // Para fins de demonstração, o resultado raw do Sequelize é suficiente.
    
    return stats.map(item => ({
      date: item.date, // Ex: "16/07" ou "07/2025"
      total_sms: parseInt(item.total_sms),
      delivered_sms: parseInt(item.delivered_sms),
      failed_sms: parseInt(item.failed_sms),
    }));
  }


  /**
   * Processa o recebimento de um SMS
   * @param {Object} activeNumber - Número ativo
   * @param {string} code - Código recebido
   */
  async processSmsReceived(activeNumber, code) {
    // Atualiza o número ativo
    await activeNumber.updateLastMessageReceived();
    await activeNumber.markAsCompleted();

    // Atualiza a mensagem SMS
    const smsMessage = await SmsMessage.findOne({
      where: {
        user_id: activeNumber.user_id,
        api_message_id: activeNumber.api_activation_id
      }
    });

    if (smsMessage) {
      await smsMessage.update({
        message_body: code,
        status: 'received'
      });
    }

    // Marca a ativação como concluída na API
    await smsActiveAPI.completeActivation(activeNumber.api_activation_id);
  }

  /**
   * Reativa um número para receber outro SMS
   * @param {string} userId - ID do usuário
   * @param {string} activeNumberId - ID do número ativo
   * @returns {Object} - Número reativado
   */
  async reactivateNumber(userId, activeNumberId) {
    const activeNumber = await ActiveNumber.findOne({
      where: { id: activeNumberId, user_id: userId },
      include: [
        {
          model: SmsService,
          as: 'smsService'
        }
      ]
    });

    if (!activeNumber) {
      throw new Error('Número ativo não encontrado');
    }

    if (activeNumber.status === 'cancelled') {
      throw new Error('Não é possível reativar um número cancelado');
    }

    // Verifica se o usuário tem créditos suficientes
    const user = await User.findByPk(userId);
    if (parseFloat(user.credits) < parseFloat(activeNumber.smsService.price_per_otp)) {
      throw new Error('Créditos insuficientes para reativação');
    }

    try {
      // Solicita outro SMS na API
      await smsActiveAPI.requestAnotherSms(activeNumber.api_activation_id);

      // Debita os créditos
      await CreditsService.debitCredits(userId, activeNumber.smsService.price_per_otp, {
        type: 'sms_received',
        description: `Reativação de número para ${activeNumber.smsService.name}`,
        metadata: {
          reactivation: true,
          active_number_id: activeNumber.id
        }
      });

      // Atualiza o contador de reativações
      const smsMessage = await SmsMessage.findOne({
        where: {
          user_id: userId,
          api_message_id: activeNumber.api_activation_id
        }
      });

      if (smsMessage) {
        await smsMessage.incrementReactivation();
      }

      // Reativa o número
      await activeNumber.update({ status: 'active' });

      return activeNumber;
    } catch (error) {
      throw new Error(`Erro ao reativar número: ${error.message}`);
    }
  }

  /**
   * Cancela um número ativo
   * @param {string} userId - ID do usuário
   * @param {string} activeNumberId - ID do número ativo
   * @param {string} reason - Motivo do cancelamento
   * @returns {Object} - Número cancelado
   */
  async cancelNumber(userId, activeNumberId, reason = 'Cancelado pelo usuário') {
    const activeNumber = await ActiveNumber.findOne({
      where: { id: activeNumberId, user_id: userId }
    });

    if (!activeNumber) {
      throw new Error('Número ativo não encontrado');
    }

    if (activeNumber.status === 'cancelled') {
      throw new Error('Número já foi cancelado');
    }

    try {
      // Cancela na API SMS Active
      await smsActiveAPI.cancelActivation(activeNumber.api_activation_id);

      // Marca como cancelado localmente
      await activeNumber.markAsCancelled();

      // Atualiza a mensagem SMS
      const smsMessage = await SmsMessage.findOne({
        where: {
          user_id: userId,
          api_message_id: activeNumber.api_activation_id
        }
      });

      if (smsMessage) {
        await smsMessage.markAsCancelled();
      }

      return activeNumber;
    } catch (error) {
      throw new Error(`Erro ao cancelar número: ${error.message}`);
    }
  }

  /**
   * Obtém o histórico de SMS do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de paginação e filtros
   * @returns {Object} - Lista de mensagens paginada
   */
  async getSmsHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      service_code,
      startDate,
      endDate
    } = options;

    const offset = (page - 1) * limit;
    const where = { user_id: userId };

    // Filtros opcionais
    if (status) {
      where.status = status;
    }

    if (service_code) {
      where.service_code = service_code;
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

    return {
      messages: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    };
  }

  /**
   * Obtém os números ativos do usuário
   * @param {string} userId - ID do usuário
   * @returns {Array} - Lista de números ativos
   */
  async getActiveNumbers(userId) {
    const activeNumbers = await ActiveNumber.findAll({
      where: {
        user_id: userId,
        status: 'active'
      },
      include: [
        {
          model: SmsService,
          as: 'smsService'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return activeNumbers;
  }
}

module.exports = new SMSService();


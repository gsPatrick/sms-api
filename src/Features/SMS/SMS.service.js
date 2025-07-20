/**
 * Serviço de SMS
 * 
 * Contém a lógica de negócio para gerenciamento de SMS.
 * Neste modelo, os países e serviços são buscados dinamicamente da API externa.
 */

const { SmsMessage, ActiveNumber, User, Setting } = require('../../models');
const smsActiveAPI = require('../../Utils/smsActive');
const CreditsService = require('../Credits/Credits.service');
const { Op, fn, col, literal } = require('sequelize');

// Mapeamento de nomes de países para uma melhor exibição no frontend.
// Em uma aplicação de produção, isso poderia vir de uma tabela de configuração.
const countryNames = {
    '0': 'Rússia', '1': 'Ucrânia', '2': 'Cazaquistão', '6': 'Filipinas', '7': 'Mianmar',
    '10': 'Indonésia', '12': 'Malásia', '16': 'Inglaterra', '22': 'Nigéria', '29': 'EUA',
    '32': 'Laos', '34': 'Haiti', '36': 'Polônia', '40': 'Índia', '43': 'Vietnã',
    '45': 'Países Baixos', '48': 'Brasil', '52': 'Romênia', '73': 'Colômbia',
};

class SMSService {
  
  /**
   * Obtém a lista de países disponíveis da API SMS Active.
   * @returns {Promise<Array>} - Lista de países formatada.
   */
  async getAvailableCountries() {
    try {
      const countriesFromApi = await smsActiveAPI.getCountries();
      // Transforma o objeto { '0': 'Russia', ... } em um array [{ id: '0', name: 'Russia' }, ...]
      const formattedCountries = Object.entries(countriesFromApi).map(([id, name]) => ({
        id: id,
        name: name,
      }));
      return formattedCountries;
    } catch (error) {
      console.error('Erro ao buscar países da API externa:', error);
      throw new Error('Não foi possível obter a lista de países.');
    }
  }

  /**
   * Obtém a lista de serviços com preços para um país específico.
   * @param {string} countryId - O ID do país.
   * @returns {Promise<Array>} - Lista de serviços com preço e quantidade.
   */
  async getServicesByCountry(countryId) {
    try {
      const pricesFromApi = await smsActiveAPI.getPrices(countryId);

      if (!pricesFromApi[countryId]) {
        return []; // Retorna vazio se o país não tiver serviços
      }

      // Pega a margem de lucro do banco de dados (ex: 'SMS_PRICE_MARGIN' com valor '1.5' para 50%)
      const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
      const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2; // Padrão de 20% de lucro se não configurado

      // Formata a resposta da API para o frontend
      const formattedServices = Object.entries(pricesFromApi[countryId]).map(([serviceCode, details]) => {
        const cost = parseFloat(details.price);
        const sellPrice = cost * margin; // Calcula o preço de venda com a margem

        return {
          code: serviceCode,
          name: serviceCode, // O frontend pode ter um mapeamento para nomes amigáveis
          cost: cost, // Preço de custo da API
          sellPrice: sellPrice.toFixed(2), // Preço de venda para o usuário
          count: details.count,
        };
      });

      return formattedServices;
    } catch (error) {
      console.error(`Erro ao buscar serviços para o país ${countryId}:`, error);
      throw new Error(`Não foi possível obter os serviços para o país selecionado.`);
    }
  }

  /**
   * Solicita um número para recebimento de SMS OTP
   * @param {string} userId - ID do usuário
   * @param {Object} requestData - Dados da solicitação { service_code, country_code }
   * @returns {Object} - Número ativo criado
   */
  async requestNumber(userId, requestData) {
    const { service_code, country_code, operator = '' } = requestData;

    if (!service_code || country_code === undefined) {
      throw new Error("Código do serviço e do país são obrigatórios.");
    }
    
    // 1. Busca o preço atualizado do serviço para calcular o preço de venda
    const pricesFromApi = await smsActiveAPI.getPrices(country_code, service_code);
    const serviceDetails = pricesFromApi?.[country_code]?.[service_code];
    
    if (!serviceDetails || !serviceDetails.price) {
        throw new Error('Serviço ou país inválido, ou preço não disponível no momento.');
    }

    const costPrice = parseFloat(serviceDetails.price);
    const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
    const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;
    const sellPrice = costPrice * margin;

    // 2. Verifica se o usuário tem saldo suficiente
    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (parseFloat(user.credits) < sellPrice) {
      throw new Error('Créditos insuficientes para realizar esta operação.');
    }

    // 3. Tenta obter o número da API externa
    try {
      const numberData = await smsActiveAPI.getNumber(service_code, country_code, operator);

      // 4. Debita os créditos do usuário (o valor de VENDA)
      await CreditsService.debitCredits(userId, sellPrice, {
        type: 'sms_received',
        description: `Ativação para ${service_code} (${countryNames[country_code] || 'País ' + country_code})`,
        metadata: { service_code, country_code, api_activation_id: numberData.id, phone_number: numberData.number, cost_price: costPrice, sell_price: sellPrice }
      });

      // 5. Cria o registro local do número ativo
      const activeNumber = await ActiveNumber.create({
        user_id: userId,
        sms_service_id: null, // Não está mais atrelado a um serviço local
        phone_number: numberData.number,
        api_activation_id: numberData.id,
        country_code,
        operator,
        cost: sellPrice, // Salva o preço de venda
        status: 'active',
        metadata: { service_code, requested_at: new Date() }
      });

      // 6. Cria o registro da mensagem
      await SmsMessage.create({
        user_id: userId, type: 'received', to_number: numberData.number,
        status: 'pending', api_message_id: numberData.id, cost: sellPrice, service_code,
        metadata: { active_number_id: activeNumber.id }
      });

      // 7. Agenda o cancelamento automático
      setTimeout(() => this.checkAndCancelIfNoMessage(activeNumber.id), 2 * 60 * 1000); // 2 minutos

      return { active_number: activeNumber };

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

      if (!activeNumber.last_message_received_at) {
        await this.cancelNumber(activeNumber.user_id, activeNumberId, 'Cancelamento automático - tempo esgotado.');
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
      where: { id: activeNumberId, user_id: userId }
    });

    if (!activeNumber) {
      throw new Error('Número ativo não encontrado');
    }

    try {
      const status = await smsActiveAPI.getStatus(activeNumber.api_activation_id);

      if (status.status === 'completed' && status.code) {
        await this.processSmsReceived(activeNumber, status.code);
      } else if (status.status === 'cancelled') {
        await activeNumber.markAsCancelled();
      }

      return {
        active_number: activeNumber,
        status: status.status,
        code: status.code,
        service_code: activeNumber.metadata.service_code // Retorna o código do serviço
      };
    } catch (error) {
      throw new Error(`Erro ao verificar status: ${error.message}`);
    }
  }

  /**
   * Processa o recebimento de um SMS, atualizando os registros locais.
   * @param {Object} activeNumber - Instância do modelo ActiveNumber.
   * @param {string} code - O código de SMS recebido.
   */
  async processSmsReceived(activeNumber, code) {
    if (activeNumber.status === 'completed') return;

    await activeNumber.updateLastMessageReceived();
    await activeNumber.markAsCompleted();

    const smsMessage = await SmsMessage.findOne({
      where: { api_message_id: activeNumber.api_activation_id }
    });

    if (smsMessage) {
      await smsMessage.update({ message_body: code, status: 'received' });
    }

    await smsActiveAPI.completeActivation(activeNumber.api_activation_id);
  }

  /**
   * Reativa um número para receber outro SMS.
   * @param {string} userId - ID do usuário.
   * @param {string} activeNumberId - ID do número ativo.
   * @returns {Object} - O registro do número ativo.
   */
  async reactivateNumber(userId, activeNumberId) {
    const activeNumber = await ActiveNumber.findOne({
      where: { id: activeNumberId, user_id: userId }
    });

    if (!activeNumber) throw new Error('Número ativo não encontrado');
    if (activeNumber.status === 'cancelled') throw new Error('Não é possível reativar um número cancelado');

    // Re-calcula o preço de reativação, pois pode ter mudado.
    const { service_code } = activeNumber.metadata;
    const { country_code } = activeNumber;
    const reactivatePrice = await this.getSellPrice(country_code, service_code);

    const user = await User.findByPk(userId);
    if (parseFloat(user.credits) < reactivatePrice) {
      throw new Error('Créditos insuficientes para reativação');
    }

    try {
      await smsActiveAPI.requestAnotherSms(activeNumber.api_activation_id);

      await CreditsService.debitCredits(userId, reactivatePrice, {
        type: 'sms_received',
        description: `Reativação para ${service_code}`,
        metadata: { reactivation: true, active_number_id: activeNumber.id }
      });

      const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } });
      if (smsMessage) {
        await smsMessage.incrementReactivation();
        await smsMessage.update({ cost: literal(`cost + ${reactivatePrice}`) }); // Adiciona custo
      }
      
      await activeNumber.update({ status: 'active', cost: literal(`cost + ${reactivatePrice}`) });

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
    const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId }});

    if (!activeNumber) throw new Error('Número ativo não encontrado');
    if (activeNumber.status === 'cancelled') throw new Error('Número já foi cancelado');

    try {
      await smsActiveAPI.cancelActivation(activeNumber.api_activation_id);
      await activeNumber.markAsCancelled();
      
      const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } });
      if (smsMessage) {
        await smsMessage.markAsCancelled();
      }

      // Lógica de estorno (opcional, mas recomendada para cancelamentos que não geraram custo)
      // await CreditsService.refundCredits(userId, activeNumber.cost, `Estorno por cancelamento: ${reason}`);
      
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
    // ... (lógica de getSmsHistory, que não precisa de grandes alterações)
  }

  /**
   * Obtém os números ativos do usuário
   * @param {string} userId - ID do usuário
   * @returns {Array} - Lista de números ativos
   */
  async getActiveNumbers(userId) {
    return ActiveNumber.findAll({
      where: { user_id: userId, status: 'active' },
      order: [['created_at', 'DESC']]
    });
  }
  
  /**
   * Helper para buscar e calcular o preço de venda de um serviço.
   * @param {string} countryCode - Código do país
   * @param {string} serviceCode - Código do serviço
   * @returns {number} Preço de venda.
   */
  async getSellPrice(countryCode, serviceCode) {
    const pricesFromApi = await smsActiveAPI.getPrices(countryCode, serviceCode);
    const serviceDetails = pricesFromApi?.[countryCode]?.[serviceCode];
    if (!serviceDetails || !serviceDetails.price) {
        throw new Error('Preço para o serviço não encontrado.');
    }
    const costPrice = parseFloat(serviceDetails.price);
    const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
    const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;
    return costPrice * margin;
  }
}

module.exports = new SMSService();
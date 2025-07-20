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

// =========================================================================
// ✅ MAPA DE NOMES DE PAÍSES
// Esta é a fonte da verdade para os nomes dos países, ignorando os nomes
// inconsistentes que vêm da API externa.
// =========================================================================
const countryNames = {
    '0': 'Rússia', '1': 'Ucrânia', '2': 'Cazaquistão', '3': 'China', '4': 'Filipinas',
    '5': 'Mianmar', '6': 'Indonésia', '7': 'Malásia', '8': 'Quênia', '9': 'Tanzânia',
    '10': 'Vietnã', '11': 'Quirguistão', '12': 'Estados Unidos', '13': 'Israel',
    '14': 'Hong Kong', '15': 'Polônia', '16': 'Inglaterra', '17': 'África do Sul',
    '18': 'Nigéria', '21': 'Egito', '22': 'Índia', '24': 'Irlanda', '25': 'Camboja',
    '26': 'Laos', '27': 'Haiti', '29': 'Costa do Marfim', '31': 'Gâmbia', '32': 'Sérvia',
    '34': 'Iêmen', '36': 'Canadá', '37': 'Romênia', '39': 'Países Baixos',
    '40': 'Portugal', '43': 'Alemanha', '45': 'Argentina', '46': 'República Tcheca',
    '47': 'Suécia', '48': 'Brasil', '51': 'Finlândia', '52': 'Colômbia',
    '53': 'França', '56': 'Paquistão', '61': 'Espanha', '73': 'Chile'
    // Adicione outros países conforme necessário
};

class SMSService {
  
  /**
   * Obtém a lista de países disponíveis da API SMS Active, usando nosso mapeamento de nomes.
   * @returns {Promise<Array>} - Lista de países formatada e ordenada.
   */
  async getAvailableCountries() {
    try {
      const countriesFromApi = await smsActiveAPI.getCountries();
      
      // =========================================================================
      // ✅ CORREÇÃO APLICADA AQUI
      // Usamos nosso `countryNames` para garantir nomes corretos e ordenamos
      // a lista alfabeticamente para uma melhor experiência do usuário.
      // =========================================================================
      const formattedCountries = Object.keys(countriesFromApi)
        .map(id => ({
            id: id,
            // Pega o nome do nosso mapa. Se não existir, usa o nome da API como fallback.
            name: countryNames[id] || countriesFromApi[id], 
        }))
        .sort((a, b) => a.name.localeCompare(b.name)); // Ordena os países por nome

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
        return [];
      }

      const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
      const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;

      const formattedServices = Object.entries(pricesFromApi[countryId]).map(([serviceCode, details]) => {
        const cost = parseFloat(details.price);
        const sellPrice = cost * margin;

        return {
          code: serviceCode,
          name: serviceCode,
          cost: cost,
          sellPrice: sellPrice.toFixed(2),
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
    
    const sellPrice = await this.getSellPrice(country_code, service_code);

    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (parseFloat(user.credits) < sellPrice) {
      throw new Error('Créditos insuficientes para realizar esta operação.');
    }

    try {
      const numberData = await smsActiveAPI.getNumber(service_code, country_code, operator);
      const costPrice = (await this.getCostPrice(country_code, service_code));

      await CreditsService.debitCredits(userId, sellPrice, {
        type: 'sms_received',
        description: `Ativação para ${service_code} (${countryNames[country_code] || 'País ' + country_code})`,
        metadata: { service_code, country_code, api_activation_id: numberData.id, phone_number: numberData.number, cost_price: costPrice, sell_price: sellPrice }
      });

      const activeNumber = await ActiveNumber.create({
        user_id: userId,
        sms_service_id: null,
        phone_number: numberData.number,
        api_activation_id: numberData.id,
        country_code,
        operator,
        cost: sellPrice,
        status: 'active',
        metadata: { service_code, requested_at: new Date() }
      });

      await SmsMessage.create({
        user_id: userId, type: 'received', to_number: numberData.number,
        status: 'pending', api_message_id: numberData.id, cost: sellPrice, service_code,
        metadata: { active_number_id: activeNumber.id }
      });

      setTimeout(() => this.checkAndCancelIfNoMessage(activeNumber.id), 2 * 60 * 1000);

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
        service_code: activeNumber.metadata.service_code
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
        await smsMessage.update({ cost: literal(`cost + ${reactivatePrice}`) });
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
    // Implementação do getSmsHistory...
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
   * @returns {Promise<number>} Preço de venda.
   */
  async getSellPrice(countryCode, serviceCode) {
    const costPrice = await this.getCostPrice(countryCode, serviceCode);
    const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
    const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;
    return costPrice * margin;
  }

  /**
   * Helper para buscar o preço de custo de um serviço na API.
   * @param {string} countryCode - Código do país
   * @param {string} serviceCode - Código do serviço
   * @returns {Promise<number>} Preço de custo.
   */
  async getCostPrice(countryCode, serviceCode) {
    const pricesFromApi = await smsActiveAPI.getPrices(countryCode, serviceCode);
    const serviceDetails = pricesFromApi?.[countryCode]?.[serviceCode];
    if (!serviceDetails || !serviceDetails.price) {
        throw new Error('Preço para o serviço não encontrado.');
    }
    return parseFloat(serviceDetails.price);
  }
}

module.exports = new SMSService();
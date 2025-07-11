/**
 * Utilitários para integração com SMS Active API
 * 
 * Funções para interagir com a API do SMS Active
 * para gerenciamento de números virtuais e recebimento de SMS
 */

const axios = require('axios');

class SmsActiveAPI {
  constructor() {
    this.baseURL = process.env.SMS_ACTIVE_BASE_URL;
    this.apiKey = process.env.SMS_ACTIVE_API_KEY;
  }

  /**
   * Faz uma requisição para a API SMS Active
   * @param {Object} params - Parâmetros da requisição
   * @returns {Object} - Resposta da API
   */
  async makeRequest(params) {
    try {
      const response = await axios.get(this.baseURL, {
        params: {
          api_key: this.apiKey,
          ...params
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error('Erro na requisição SMS Active:', error.message);
      throw new Error(`Erro na API SMS Active: ${error.message}`);
    }
  }

  /**
   * Obtém o saldo da conta
   * @returns {number} - Saldo da conta
   */
  async getBalance() {
    const response = await this.makeRequest({
      action: 'getBalance'
    });

    if (response.includes('ACCESS_BALANCE')) {
      return parseFloat(response.split(':')[1]);
    }

    throw new Error('Erro ao obter saldo');
  }

  /**
   * Obtém a quantidade de números disponíveis por serviço
   * @param {string} country - Código do país (opcional)
   * @param {string} operator - Operadora (opcional)
   * @returns {Object} - Quantidade de números disponíveis
   */
  async getNumbersStatus(country = '0', operator = '') {
    const params = {
      action: 'getNumbersStatus',
      country
    };

    if (operator) {
      params.operator = operator;
    }

    return await this.makeRequest(params);
  }

  /**
   * Solicita um número para recebimento de SMS
   * @param {string} service - Código do serviço
   * @param {string} country - Código do país
   * @param {string} operator - Operadora (opcional)
   * @returns {Object} - Dados do número solicitado
   */
  async getNumber(service, country = '0', operator = '') {
    const params = {
      action: 'getNumber',
      service,
      country
    };

    if (operator) {
      params.operator = operator;
    }

    const response = await this.makeRequest(params);

    if (typeof response === 'string' && response.includes('ACCESS_NUMBER')) {
      const [, id, number] = response.split(':');
      return {
        id,
        number,
        status: 'active'
      };
    }

    // Tratamento de erros
    if (response === 'NO_NUMBERS') {
      throw new Error('Nenhum número disponível');
    }
    if (response === 'NO_BALANCE') {
      throw new Error('Saldo insuficiente');
    }
    if (response === 'BAD_ACTION') {
      throw new Error('Ação inválida');
    }
    if (response === 'BAD_SERVICE') {
      throw new Error('Serviço inválido');
    }
    if (response === 'BAD_KEY') {
      throw new Error('Chave API inválida');
    }

    throw new Error(`Erro desconhecido: ${response}`);
  }

  /**
   * Obtém o status de uma ativação
   * @param {string} id - ID da ativação
   * @returns {Object} - Status da ativação
   */
  async getStatus(id) {
    const response = await this.makeRequest({
      action: 'getStatus',
      id
    });

    if (typeof response === 'string') {
      if (response === 'STATUS_WAIT_CODE') {
        return { status: 'waiting', code: null };
      }
      if (response === 'STATUS_WAIT_RETRY') {
        return { status: 'waiting_retry', code: null };
      }
      if (response.includes('STATUS_OK')) {
        const code = response.split(':')[1];
        return { status: 'completed', code };
      }
      if (response === 'STATUS_CANCEL') {
        return { status: 'cancelled', code: null };
      }
    }

    return { status: 'unknown', code: null };
  }

  /**
   * Altera o status de uma ativação
   * @param {string} id - ID da ativação
   * @param {number} status - Novo status (1=ready, 3=request_another_sms, 6=complete, 8=cancel)
   * @returns {string} - Resposta da API
   */
  async setStatus(id, status) {
    const response = await this.makeRequest({
      action: 'setStatus',
      id,
      status
    });

    return response;
  }

  /**
   * Cancela uma ativação
   * @param {string} id - ID da ativação
   * @returns {string} - Resposta da API
   */
  async cancelActivation(id) {
    return await this.setStatus(id, 8);
  }

  /**
   * Solicita outro SMS para a mesma ativação
   * @param {string} id - ID da ativação
   * @returns {string} - Resposta da API
   */
  async requestAnotherSms(id) {
    return await this.setStatus(id, 3);
  }

  /**
   * Marca uma ativação como concluída
   * @param {string} id - ID da ativação
   * @returns {string} - Resposta da API
   */
  async completeActivation(id) {
    return await this.setStatus(id, 6);
  }

  /**
   * Obtém a lista de serviços disponíveis
   * @returns {Object} - Lista de serviços
   */
  async getServices() {
    return await this.makeRequest({
      action: 'getServices'
    });
  }

  /**
   * Obtém a lista de países disponíveis
   * @returns {Object} - Lista de países
   */
  async getCountries() {
    return await this.makeRequest({
      action: 'getCountries'
    });
  }

  /**
   * Obtém os preços atuais por país e serviço
   * @param {string} country - Código do país
   * @param {string} service - Código do serviço
   * @returns {Object} - Preços atuais
   */
  async getPrices(country = '', service = '') {
    const params = {
      action: 'getPrices'
    };

    if (country) params.country = country;
    if (service) params.service = service;

    return await this.makeRequest(params);
  }
}

module.exports = new SmsActiveAPI();


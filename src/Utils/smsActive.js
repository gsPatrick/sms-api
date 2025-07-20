/**
 * Utilitários para integração com SMS Active API (handler_api.php - V1)
 * 
 * Funções para interagir com a API do SMS Active, tratando as respostas mistas (JSON e texto).
 */

const axios = require('axios');

class SmsActiveAPI {
  constructor() {
    // Usando o endpoint correto da API V1, como você identificou.
    this.baseURL = 'https://api.sms-activate.org/stubs/handler_api.php';
    this.apiKey = process.env.SMS_ACTIVE_API_KEY; // Garanta que sua .env tem a chave correta.
  }

  /**
   * Faz uma requisição para a API SMS Active.
   * @param {Object} params - Parâmetros da requisição (ex: { action: 'getCountries' })
   * @returns {Promise<Object|string>} - Resposta da API.
   */
  async makeRequest(params) {
    if (!this.apiKey) {
      throw new Error('Chave da API SMS Active (SMS_ACTIVE_API_KEY) não foi definida no arquivo .env');
    }

    try {
      const response = await axios.get(this.baseURL, {
        params: {
          api_key: this.apiKey,
          ...params
        },
        timeout: 30000
      });
      
      // O Axios já tentará parsear a resposta se o header indicar JSON.
      // Se não, retornará como texto. Isso é ideal para esta API mista.
      return response.data;

    } catch (error) {
      console.error('Erro na requisição para SMS Activate:', error.message);
      if (error.response && error.response.data) {
        // A API V1 retorna erros como strings de texto simples
        throw new Error(`Erro da API SMS Activate: ${error.response.data}`);
      }
      throw new Error(`Erro de comunicação com a API SMS Activate: ${error.message}`);
    }
  }

  /**
   * Obtém o saldo da conta.
   * A API retorna: ACCESS_BALANCE:123.45
   * @returns {Promise<number>} - Saldo da conta.
   */
  async getBalance() {
    const response = await this.makeRequest({ action: 'getBalance' });
    if (typeof response === 'string' && response.includes('ACCESS_BALANCE')) {
      return parseFloat(response.split(':')[1]);
    }
    throw new Error(`Erro ao obter saldo: ${response}`);
  }

  /**
   * ✅ CORRIGIDO: Obtém a lista de países.
   * A API retorna um objeto JSON com os detalhes de cada país, que é retornado diretamente.
   * @returns {Promise<Object>} - Objeto de países.
   */
  async getCountries() {
    // Esta chamada agora retornará o objeto JSON corretamente.
    return this.makeRequest({ action: 'getCountries' });
  }

  /**
   * ✅ CORRIGIDO: Obtém os preços atuais.
   * A API retorna um objeto JSON com a estrutura { "countryId": { "serviceCode": { details } } }.
   * @param {string} country - Código do país (opcional).
   * @param {string} service - Código do serviço (opcional).
   * @returns {Promise<Object>} - Objeto de preços.
   */
  async getPrices(country = '', service = '') {
    const params = { action: 'getPrices' };
    if (country) params.country = country;
    if (service) params.service = service;
    // Esta chamada agora retornará o objeto JSON de preços corretamente.
    return this.makeRequest(params);
  }

  /**
   * Solicita um número para recebimento de SMS.
   * A API retorna: ACCESS_NUMBER:ID:NUMBER
   * @param {string} service - Código do serviço.
   * @param {string} country - Código do país.
   * @param {string} operator - Operadora (opcional).
   * @returns {Promise<Object>} - Dados do número solicitado.
   */
  async getNumber(service, country = '0', operator = '') {
    const params = { action: 'getNumber', service, country };
    if (operator) params.operator = operator;

    const response = await this.makeRequest(params);

    if (typeof response === 'string' && response.includes('ACCESS_NUMBER')) {
      const [, id, number] = response.split(':');
      return { id, number, status: 'active' };
    }
    
    // Se a resposta não for o esperado, lança um erro com a mensagem da API.
    throw new Error(`Erro ao solicitar número: ${response}`);
  }

  /**
   * Obtém o status de uma ativação.
   * A API retorna strings como STATUS_WAIT_CODE, STATUS_OK:12345, etc.
   * @param {string} id - ID da ativação.
   * @returns {Promise<Object>} - Status da ativação.
   */
  async getStatus(id) {
    const response = await this.makeRequest({ action: 'getStatus', id });

    if (typeof response === 'string') {
      if (response === 'STATUS_WAIT_CODE') return { status: 'waiting', code: null };
      if (response === 'STATUS_WAIT_RETRY') return { status: 'waiting_retry', code: null };
      if (response.includes('STATUS_OK')) {
        const code = response.split(':')[1];
        return { status: 'completed', code };
      }
      if (response === 'STATUS_CANCEL') return { status: 'cancelled', code: null };
    }
    return { status: 'unknown', code: null, raw: response };
  }
  
  /**
   * Altera o status de uma ativação.
   * @param {string} id - ID da ativação.
   * @param {number} status - Novo status (1, 3, 6, 8).
   * @returns {Promise<string>} - Resposta da API.
   */
  async setStatus(id, status) {
    return this.makeRequest({ action: 'setStatus', id, status });
  }

  async cancelActivation(id) { return this.setStatus(id, 8); }
  async requestAnotherSms(id) { return this.setStatus(id, 3); }
  async completeActivation(id) { return this.setStatus(id, 6); }
}

module.exports = new SmsActiveAPI();
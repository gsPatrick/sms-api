const axios = require('axios');

class SmsActiveAPI {
  constructor() {
    // Usando o endpoint correto da API V1
    this.baseURL = 'https://api.sms-activate.org/stubs/handler_api.php';
    this.apiKey = process.env.SMS_ACTIVE_API_KEY; // Certifique-se que sua .env tem SMS_ACTIVE_API_KEY
  }

  /**
   * Faz uma requisição para a API SMS Active.
   * A API V1 tem um retorno misto (às vezes JSON, às vezes texto), então tratamos ambos.
   * @param {Object} params - Parâmetros da requisição
   * @returns {Object|string} - Resposta da API
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
      
      // A API V1 às vezes retorna JSON, às vezes texto.
      // O axios tentará parsear JSON automaticamente se o header for 'application/json'.
      // Se não for, response.data será uma string.
      return response.data;

    } catch (error) {
      console.error('Erro na requisição para SMS Activate:', error.message);
      // Se a API retornar um erro (ex: 4xx, 5xx), o axios lança uma exceção.
      // Podemos inspecionar error.response.data se houver mais detalhes.
      if (error.response && error.response.data) {
        throw new Error(`Erro da API SMS Activate: ${error.response.data}`);
      }
      throw new Error(`Erro de comunicação com a API SMS Activate: ${error.message}`);
    }
  }

  /**
   * Obtém o saldo da conta.
   * Retorna uma string: ACCESS_BALANCE:123.45
   * @returns {number} - Saldo da conta
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
   * A API retorna um objeto JSON com os detalhes de cada país.
   * @returns {Object} - Objeto de países.
   */
  async getCountries() {
    return this.makeRequest({ action: 'getCountries' });
  }

  /**
   * ✅ CORRIGIDO: Obtém os preços atuais por país e/ou serviço.
   * A API retorna um objeto JSON com a estrutura { "countryId": { "serviceCode": { details } } }
   * @param {string} country - Código do país (opcional)
   * @param {string} service - Código do serviço (opcional)
   * @returns {Object} - Objeto de preços.
   */
  async getPrices(country = '', service = '') {
    const params = { action: 'getPrices' };
    if (country) params.country = country;
    if (service) params.service = service;
    return this.makeRequest(params);
  }

  /**
   * Solicita um número para recebimento de SMS.
   * Retorna uma string: ACCESS_NUMBER:ID:NUMBER
   * @param {string} service - Código do serviço
   * @param {string} country - Código do país
   * @param {string} operator - Operadora (opcional)
   * @returns {Object} - Dados do número solicitado
   */
  async getNumber(service, country = '0', operator = '') {
    const params = { action: 'getNumber', service, country };
    if (operator) params.operator = operator;

    const response = await this.makeRequest(params);

    if (typeof response === 'string' && response.includes('ACCESS_NUMBER')) {
      const [, id, number] = response.split(':');
      return { id, number, status: 'active' };
    }
    
    // Tratamento de outros erros baseados em string
    throw new Error(`Erro ao solicitar número: ${response}`);
  }

  /**
   * Obtém o status de uma ativação.
   * Retorna strings como STATUS_WAIT_CODE, STATUS_OK:12345, etc.
   * @param {string} id - ID da ativação
   * @returns {Object} - Status da ativação
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
    // Retorna a resposta crua se não for um status conhecido para depuração
    return { status: 'unknown', code: null, raw: response };
  }
  
  /**
   * Altera o status de uma ativação.
   * @param {string} id - ID da ativação
   * @param {number} status - Novo status (1, 3, 6, 8)
   * @returns {string} - Resposta da API
   */
  async setStatus(id, status) {
    return this.makeRequest({ action: 'setStatus', id, status });
  }

  async cancelActivation(id) { return this.setStatus(id, 8); }
  async requestAnotherSms(id) { return this.setStatus(id, 3); }
  async completeActivation(id) { return this.setStatus(id, 6); }
}

module.exports = new SmsActiveAPI();
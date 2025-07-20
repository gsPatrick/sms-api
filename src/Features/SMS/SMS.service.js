/**
 * Serviço de SMS
 * 
 * Contém a lógica de negócio para gerenciamento de SMS.
 * Compatível com a API V1 (handler_api.php) do SMS-Activate.
 */

const { SmsMessage, ActiveNumber, User, Setting } = require('../../models');
const smsActiveAPI = require('../../Utils/smsActive');
const CreditsService = require('../Credits/Credits.service');
const { Op, fn, col, literal } = require('sequelize');

// =========================================================================
// ✅ MAPA DE NOMES DE SERVIÇOS MASSIVAMENTE EXPANDIDO
// Usando os dados do seu services.json para garantir a tradução correta dos nomes.
// =========================================================================
const serviceNamesMap = {
    "ig": "Instagram+Threads", "go": "Google,youtube,Gmail", "fb": "facebook", "wa": "Whatsapp", "tg": "Telegram",
    "am": "Amazon", "mm": "Microsoft", "hw": "Alipay/Alibaba/1688", "ds": "Discord", "yw": "Grindr",
    "oi": "Tinder", "vi": "Viber", "mb": "Yahoo", "lf": "TikTok/Douyin", "tw": "Twitter", "wb": "WeChat",
    "ni": "Gojek", "ka": "Shopee", "fk": "BLIBLI", "ew": "Nike", "ot": "Any other", "vk": "vk.com",
    "nv": "Naver", "li": "Baidu", "jg": "Grab", "ev": "Picpay", "ub": "Uber", "sg": "OZON", "ue": "Onet",
    "vz": "Hinge", "xh": "OVO", "jr": "Samokat", "bw": "Signal", "nz": "Foodpanda", "da": "MTS CashBack",
    "ts": "PayPal", "uu": "Wildberries", "wx": "Apple", "ju": "Indomaret", "tn": "LinkedIN", "pm": "AOL",
    "fr": "Dana", "mg": "Magnit", "me": "Line messenger", "ok": "ok.ru", "qf": "RedBook", "aez": "Shein",
    "ya": "Yandex/Uber", "dl": "Lazada", "ki": "99app", "cn": "Fiverr", "pf": "pof.com",
    "pc": "Casino/bet/gambling", "dh": "eBay", "sn": "OLX", "xd": "Tokopedia", "nf": "Netflix",
    "kc": "Vinted", "gp": "Ticketmaster", "aaa": "Nubank", "ve": "Dream11", "rr": "Wolt", "bnl": "Reddit",
    "ua": "BlaBlaCar", "fd": "Mamba", "qq": "Tencent QQ", "kf": "Weibo", "yl": "Yalla", "tm": "Akulaku",
    "ep": "Temu", "im": "Imo", "bz": "Blizzard", "do": "Leboncoin", "aor": "OKX", "zk": "Deliveroo",
    "tl": "Truecaller", "abn": "Bybit", "cq": "Mercado", "mo": "Bumble", "gf": "GoogleVoice",
    "fv": "Vidio", "tx": "Bolt", "fu": "Snapchat", "wr": "Walmart", "pd": "IFood", "wh": "TanTan",
    "ly": "Olacabs", "ft": "Bookmakers", "agl": "Betano", "ac": "DoorDash", "afz": "Klarna",
    "hx": "AliExpress", "aff": "C6 Bank", "aq": "Glovo", "mt": "Steam", "df": "Happn", "ma": "Mail.ru",
    "rl": "inDriver", "gq": "Freelancer", "bl": "BIGO LIVE", "qv": "Badoo", "uk": "Airbnb", "aba": "Rappi",
    "ij": "Revolut", "dr": "OpenAI", "abg": "PagBank", "hb": "Twitch", "bc": "GCash", "ls": "Careem",
    "vg": "ShellBox", "ie": "bet365", "ta": "Wink", "tu": "Lyft", "tr": "Paysend", "xt": "Flipkart",
    "alo": "Profee", "ov": "Beget", "hc": "MOMO", "gr": "Astropay", "ms": "NovaPoshta", "ank": "Garena",
    "hp": "Meesho", "gt": "Gett", "ng": "FunPay", "sr": "Starbucks", "gj": "Carousell", "xr": "Tango",
    "aon": "Binance", "fh": "Lalamove", "ns": "Oldubil", "sh": "Vkusvill", "zh": "Zoho",
    "je": "Nanovest", "afe": "GovBr"
};

class SMSService {
  
  /**
   * Obtém a lista de países disponíveis, processando a resposta correta da API V1.
   * @returns {Promise<Array>} - Lista de países formatada e ordenada.
   */
  async getAvailableCountries() {
    try {
      const countriesFromApi = await smsActiveAPI.getCountries();
      
      if (typeof countriesFromApi !== 'object' || countriesFromApi === null) {
          throw new Error('Formato de resposta inesperado da API de países.');
      }

      const formattedCountries = Object.values(countriesFromApi)
        .filter(country => country && country.visible === 1)
        .map(country => ({
            id: country.id.toString(),
            name: country.eng,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return formattedCountries;
    } catch (error) {
      console.error('Erro ao buscar e processar países da API externa:', error);
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

      const formattedServices = Object.entries(pricesFromApi[countryId])
        .filter(([_, details]) => details.cost !== null && !isNaN(details.cost) && details.count > 0)
        .map(([serviceCode, details]) => {
            const cost = parseFloat(details.cost);
            const sellPrice = cost * margin;

            return {
                code: serviceCode,
                name: serviceNamesMap[serviceCode] || serviceCode, // Usa o mapa de nomes
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
   * Obtém estatísticas de uso de SMS para o usuário.
   * @param {string} userId - ID do usuário.
   * @param {string} period - 'daily' ou 'monthly'.
   * @param {number} days - Número de dias para o período.
   * @returns {Promise<Array>} - Dados estatísticos.
   */
  async getSmsUsageStats(userId, period = 'daily', days = 30) {
    let groupByFormat;
    let startDate = new Date();

    if (period === 'daily') {
      groupByFormat = "TO_CHAR(\"created_at\", 'DD/MM')";
      startDate.setDate(startDate.getDate() - days);
    } else if (period === 'monthly') {
      groupByFormat = "TO_CHAR(\"created_at\", 'MM/YYYY')";
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setDate(1);
    } else {
      throw new Error('Período inválido. Use "daily" ou "monthly".');
    }

    const whereClause = {
      user_id: userId,
      created_at: { [Op.gte]: startDate },
    };

    const stats = await SmsMessage.findAll({
      attributes: [
        [literal(groupByFormat), 'date'],
        [fn('COUNT', col('id')), 'total_sms'],
        [fn('SUM', literal("CASE WHEN status = 'received' THEN 1 ELSE 0 END")), 'delivered_sms'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'failed_sms'],
      ],
      where: whereClause,
      group: [literal(groupByFormat)],
      order: [literal(groupByFormat)],
      raw: true,
    });
    
    return stats.map(item => ({
      date: item.date,
      total_sms: parseInt(item.total_sms || 0),
      delivered_sms: parseInt(item.delivered_sms || 0),
      failed_sms: parseInt(item.failed_sms || 0),
    }));
  }

  /**
   * Solicita um número para recebimento de SMS OTP
   * @param {string} userId - ID do usuário
   * @param {Object} requestData - Dados da solicitação { service_code, country_code }
   * @returns {Object} - Número ativo criado
   */
  async requestNumber(userId, requestData) {
    const { service_code, country_code, operator = '' } = requestData;
    if (!service_code || country_code === undefined) { throw new Error("Código do serviço e do país são obrigatórios."); }
    
    const sellPrice = await this.getSellPrice(country_code, service_code);

    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (parseFloat(user.credits) < sellPrice) { throw new Error('Créditos insuficientes para realizar esta operação.'); }

    try {
      const numberData = await smsActiveAPI.getNumber(service_code, country_code, operator);
      const costPrice = await this.getCostPrice(country_code, service_code);
      const countryName = await this.getCountryNameById(country_code);

      await CreditsService.debitCredits(userId, sellPrice, {
        type: 'sms_received',
        description: `Ativação para ${serviceNamesMap[service_code] || service_code} (${countryName})`,
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

  async getSellPrice(countryCode, serviceCode) {
    const costPrice = await this.getCostPrice(countryCode, serviceCode);
    const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
    const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;
    return costPrice * margin;
  }

  async getCostPrice(countryCode, serviceCode) {
    const pricesFromApi = await smsActiveAPI.getPrices(countryCode, serviceCode);
    const serviceDetails = pricesFromApi?.[countryCode]?.[serviceCode];
    if (!serviceDetails || serviceDetails.cost === null || isNaN(parseFloat(serviceDetails.cost))) {
        throw new Error('Preço para o serviço não encontrado ou inválido.');
    }
    return parseFloat(serviceDetails.cost);
  }

  async getCountryNameById(countryId) {
    const countriesFromApi = await smsActiveAPI.getCountries();
    if(countriesFromApi[countryId] && countriesFromApi[countryId].eng) {
        return countriesFromApi[countryId].eng;
    }
    return `País ${countryId}`;
  }

  async checkAndCancelIfNoMessage(activeNumberId) { try { const activeNumber = await ActiveNumber.findByPk(activeNumberId); if (!activeNumber || activeNumber.status !== 'active') { return; } if (!activeNumber.last_message_received_at) { await this.cancelNumber(activeNumber.user_id, activeNumberId, 'Cancelamento automático - tempo esgotado.'); } } catch (error) { console.error('Erro ao verificar cancelamento automático:', error); } }
  async checkSmsStatus(userId, activeNumberId) { const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId } }); if (!activeNumber) { throw new Error('Número ativo não encontrado'); } try { const status = await smsActiveAPI.getStatus(activeNumber.api_activation_id); if (status.status === 'completed' && status.code) { await this.processSmsReceived(activeNumber, status.code); } else if (status.status === 'cancelled') { await activeNumber.markAsCancelled(); } return { active_number: activeNumber, status: status.status, code: status.code, service_code: activeNumber.metadata.service_code }; } catch (error) { throw new Error(`Erro ao verificar status: ${error.message}`); } }
  async processSmsReceived(activeNumber, code) { if (activeNumber.status === 'completed') return; await activeNumber.updateLastMessageReceived(); await activeNumber.markAsCompleted(); const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } }); if (smsMessage) { await smsMessage.update({ message_body: code, status: 'received' }); } await smsActiveAPI.completeActivation(activeNumber.api_activation_id); }
  async reactivateNumber(userId, activeNumberId) { const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId } }); if (!activeNumber) throw new Error('Número ativo não encontrado'); if (activeNumber.status === 'cancelled') throw new Error('Não é possível reativar um número cancelado'); const { service_code } = activeNumber.metadata; const { country_code } = activeNumber; const reactivatePrice = await this.getSellPrice(country_code, service_code); const user = await User.findByPk(userId); if (parseFloat(user.credits) < reactivatePrice) { throw new Error('Créditos insuficientes para reativação'); } try { await smsActiveAPI.requestAnotherSms(activeNumber.api_activation_id); await CreditsService.debitCredits(userId, reactivatePrice, { type: 'sms_received', description: `Reativação para ${service_code}`, metadata: { reactivation: true, active_number_id: activeNumber.id } }); const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } }); if (smsMessage) { await smsMessage.incrementReactivation(); await smsMessage.update({ cost: literal(`cost + ${reactivatePrice}`) }); } await activeNumber.update({ status: 'active', cost: literal(`cost + ${reactivatePrice}`) }); return activeNumber; } catch (error) { throw new Error(`Erro ao reativar número: ${error.message}`); } }
  async cancelNumber(userId, activeNumberId, reason = 'Cancelado pelo usuário') { const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId }}); if (!activeNumber) throw new Error('Número ativo não encontrado'); if (activeNumber.status === 'cancelled') throw new Error('Número já foi cancelado'); try { await smsActiveAPI.cancelActivation(activeNumber.api_activation_id); await activeNumber.markAsCancelled(); const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } }); if (smsMessage) { await smsMessage.markAsCancelled(); } return activeNumber; } catch (error) { throw new Error(`Erro ao cancelar número: ${error.message}`); } }
  async getSmsHistory(userId, options = {}) { const { page = 1, limit = 20, status, service_code, startDate, endDate } = options; const offset = (page - 1) * limit; const where = { user_id: userId }; if (status) { where.status = status; } if (service_code) { where.service_code = service_code; } if (startDate || endDate) { where.created_at = {}; if (startDate) { where.created_at[Op.gte] = new Date(startDate); } if (endDate) { where.created_at[Op.lte] = new Date(endDate); } } const { count, rows } = await SmsMessage.findAndCountAll({ where, order: [['created_at', 'DESC']], limit: parseInt(limit), offset: parseInt(offset), include: [{ model: User, as: 'user', attributes: ['id', 'username', 'email'] }] }); return { messages: rows, pagination: { current_page: parseInt(page), total_pages: Math.ceil(count / limit), total_items: count, items_per_page: parseInt(limit) } }; }
  async getActiveNumbers(userId) { return ActiveNumber.findAll({ where: { user_id: userId, status: 'active' }, order: [['created_at', 'DESC']] }); }

    // =========================================================================
  // ✅ NOVOS MÉTODOS DE SERVIÇO PARA O FLUXO SERVIÇO -> PAÍS
  // =========================================================================

  /**
   * Obtém a lista de todos os serviços disponíveis na API Externa.
   * @returns {Promise<Array>} - Lista de serviços formatada.
   */
  async getAllAvailableServices() {
    try {
      // Esta é uma nova função que precisaremos adicionar ao nosso smsActive.js
      const servicesFromApi = await smsActiveAPI.getServicesList();
      
      const formattedServices = servicesFromApi.map(service => ({
        code: service.code,
        name: serviceNamesMap[service.code] || service.name, // Usa nosso mapa ou o nome da API
      })).sort((a, b) => a.name.localeCompare(b.name));

      return formattedServices;
    } catch (error) {
      console.error('Erro ao buscar lista de serviços da API externa:', error);
      throw new Error('Não foi possível obter a lista de serviços.');
    }
  }

  /**
   * Obtém a lista de países com preços para um serviço específico.
   * @param {string} serviceCode - O código do serviço (ex: 'wa').
   * @returns {Promise<Array>} - Lista de países com preço e quantidade.
   */
  async getCountriesByService(serviceCode) {
    try {
      const pricesFromApi = await smsActiveAPI.getPricesForService(serviceCode);
      const allCountries = await smsActiveAPI.getCountries();

      if (!pricesFromApi[serviceCode]) {
        return []; // Nenhum país disponível para este serviço
      }

      const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
      const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;

      const formattedCountries = Object.entries(pricesFromApi[serviceCode])
        .filter(([_, details]) => details.cost !== null && !isNaN(details.cost) && details.count > 0)
        .map(([countryId, details]) => {
            const cost = parseFloat(details.cost);
            const sellPrice = cost * margin;

            return {
                id: countryId,
                name: allCountries[countryId] ? allCountries[countryId].eng : `País #${countryId}`,
                cost: cost,
                sellPrice: sellPrice.toFixed(2),
                count: details.count,
            };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      return formattedCountries;
    } catch (error) {
      console.error(`Erro ao buscar países para o serviço ${serviceCode}:`, error);
      throw new Error(`Não foi possível obter os países para o serviço selecionado.`);
    }
  }
}

module.exports = new SMSService();
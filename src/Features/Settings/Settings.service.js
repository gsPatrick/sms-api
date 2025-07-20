// src/Features/Settings/Settings.service.js
const { Setting } = require('../../models');

class SettingsService {
  /**
   * Obtém o valor de uma configuração pela chave.
   * @param {string} key - A chave da configuração.
   * @returns {Promise<string|null>} - O valor da configuração ou null.
   */
  async getSetting(key) {
    const setting = await Setting.findByPk(key);
    return setting ? setting.value : null;
  }

  /**
   * Obtém todas as configurações (apenas para admin).
   * @returns {Promise<Array>} - Lista de todas as configurações.
   */
  async getAllSettings() {
    return Setting.findAll({
      order: [['key', 'ASC']]
    });
  }

  /**
   * Atualiza ou cria uma configuração.
   * @param {string} key - A chave da configuração.
   * @param {string} value - O novo valor.
   * @returns {Promise<Object>} - A configuração atualizada.
   */
  async updateSetting(key, value) {
    // Upsert: atualiza se existir, cria se não existir.
    const [setting] = await Setting.upsert({
      key,
      value
    });
    return setting;
  }
}

module.exports = new SettingsService();
// src/Features/Settings/Settings.controller.js
const SettingsService = require('./Settings.service');

class SettingsController {
  /**
   * Obtém todas as configurações.
   * GET /api/settings
   */
  async getSettings(req, res) {
    try {
      const settings = await SettingsService.getAllSettings();
      res.status(200).json({
        success: true,
        message: 'Configurações obtidas com sucesso.',
        data: settings
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  /**
   * Atualiza uma ou mais configurações.
   * PUT /api/settings
   */
  async updateSettings(req, res) {
    try {
      const settingsPayload = req.body; // Espera um objeto { "CHAVE": "valor", "OUTRA_CHAVE": "outro_valor" }
      const updatedSettings = [];

      for (const key in settingsPayload) {
        if (Object.hasOwnProperty.call(settingsPayload, key)) {
          const value = settingsPayload[key];
          const updated = await SettingsService.updateSetting(key, value);
          updatedSettings.push(updated);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Configurações atualizadas com sucesso.',
        data: updatedSettings
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SettingsController();s
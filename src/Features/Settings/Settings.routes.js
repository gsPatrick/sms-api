// src/Features/Settings/Settings.routes.js
const express = require('express');
const { authenticate, authorize } = require('../../Utils/auth');
const SettingsController = require('./Settings.controller');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../../Utils/validation');

const router = express.Router();

// Todas as rotas de configuração exigem que o usuário seja um administrador
router.use(authenticate, authorize(['admin']));

/**
 * @route   GET /api/settings
 * @desc    Obtém todas as configurações do sistema
 * @access  Private (Admin only)
 */
router.get('/', SettingsController.getSettings);

/**
 * @route   PUT /api/settings
 * @desc    Atualiza as configurações do sistema
 * @access  Private (Admin only)
 */
router.put('/', [
    // Validação genérica para garantir que o corpo seja um objeto não vazio
    body().isObject().withMessage('O corpo da requisição deve ser um objeto.'),
    handleValidationErrors
], SettingsController.updateSettings);

module.exports = router;
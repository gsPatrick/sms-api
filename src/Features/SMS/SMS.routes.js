/**
 * Rotas de SMS
 * 
 * Define as rotas HTTP para gerenciamento de SMS
 * incluindo validações e middlewares de segurança
 */

const express = require('express');
const SMSController = require('./'); // ✅ Importa o SMSController
const { authenticate, authorize } = require('../../Utils/auth');
const {
  validateSmsRequest,
  validateUUID,
  validatePagination,
  handleValidationErrors
} = require('../../Utils/validation');
const { body, query } = require('express-validator');

const router = express.Router();

/**
 * @route   POST /api/sms/request-number
 * @desc    Solicita um número para recebimento de SMS OTP
 * @access  Private
 */
router.post('/request-number', [
  authenticate,
  validateSmsRequest
], SMSController.requestNumber);

/**
 * @route   GET /api/sms/status/:activeNumberId
 * @desc    Verifica o status de recebimento de SMS
 * @access  Private
 */
router.get('/status/:activeNumberId', [
  authenticate,
  validateUUID('activeNumberId')
], SMSController.checkSmsStatus);

/**
 * @route   POST /api/sms/reactivate/:activeNumberId
 * @desc    Reativa um número para receber outro SMS
 * @access  Private
 */
router.post('/reactivate/:activeNumberId', [
  authenticate,
  validateUUID('activeNumberId')
], SMSController.reactivateNumber);

/**
 * @route   POST /api/sms/cancel/:activeNumberId
 * @desc    Cancela um número ativo
 * @access  Private
 */
router.post('/cancel/:activeNumberId', [
  authenticate,
  validateUUID('activeNumberId'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Motivo deve ter no máximo 500 caracteres'),
  
  handleValidationErrors
], SMSController.cancelNumber);

/**
 * @route   GET /api/sms/history
 * @desc    Obtém o histórico de SMS do usuário
 * @access  Private
 */
router.get('/history', [
  authenticate,
  validatePagination,
  query('status')
    .optional()
    .isIn(['sent', 'delivered', 'failed', 'pending', 'received', 'cancelled'])
    .withMessage('Status deve ser: sent, delivered, failed, pending, received ou cancelled'),
  
  query('service_code')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Código do serviço deve ter entre 1 e 20 caracteres'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO8601'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO8601'),
  
  handleValidationErrors
], SMSController.getSmsHistory);

/**
 * @route   GET /api/sms/active-numbers
 * @desc    Obtém os números ativos do usuário
 * @access  Private
 */
router.get('/active-numbers', authenticate, SMSController.getActiveNumbers);

/**
 * @route   POST /api/sms/webhook
 * @desc    Webhook para recebimento de SMS da API SMS Active
 * @access  Public (mas deve ser validado por IP ou token)
 */
router.post('/webhook', [
  body('activation_id')
    .notEmpty()
    .withMessage('ID de ativação é obrigatório'),
  
  body('status')
    .optional()
    .isIn(['completed', 'cancelled', 'waiting'])
    .withMessage('Status deve ser: completed, cancelled ou waiting'),
  
  body('code')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Código deve ter entre 1 e 20 caracteres'),
  
  body('phone')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Telefone deve ter entre 1 e 20 caracteres'),
  
  handleValidationErrors
], SMSController.smsWebhook);

/**
 * @route   GET /api/sms/stats
 * @desc    Obtém estatísticas de uso de SMS para o usuário logado
 * @access  Private
 * ✅ NOVO ENDPOINT NO ROUTES, APONTANDO PARA O CONTROLLER
 */
router.get('/stats', [
  authenticate,
  query('period')
    .optional()
    .isIn(['daily', 'monthly'])
    .withMessage('Período deve ser "daily" ou "monthly"'),
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Dias deve ser um número inteiro entre 1 e 365'),
  handleValidationErrors
], SMSController.getSmsUsageStats);


/**
 * @route   GET /api/sms/all-history
 * @desc    Obtém histórico de SMS de todos os usuários (apenas Admin)
 * @access  Private (Admin only)
 */
router.get('/all-history', [
  authenticate,
  authorize(['admin']),
  validatePagination,
  query('status')
    .optional()
    .isIn(['sent', 'delivered', 'failed', 'pending', 'received', 'cancelled'])
    .withMessage('Status deve ser: sent, delivered, failed, pending, received ou cancelled'),
  
  query('service_code')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Código do serviço deve ter entre 1 e 20 caracteres'),
  
  query('user_id')
    .optional()
    .isUUID()
    .withMessage('ID do usuário deve ser um UUID válido'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO8601'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO8601'),
  
  handleValidationErrors
], SMSController.getAllSmsHistory);

module.exports = router;
/**
 * Rotas de Créditos
 * 
 * Define as rotas HTTP para gerenciamento de créditos
 * incluindo validações e middlewares de segurança
 */

const express = require('express');
const CreditsController = require('./Credits.controller');
const { authenticate, authorize } = require('../../Utils/auth');
const {
  validatePagination,
  validateUUID,
  handleValidationErrors
} = require('../../Utils/validation');
const { body, query } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/credits/balance
 * @desc    Obtém o saldo de créditos do usuário
 * @access  Private
 */
router.get('/balance', authenticate, CreditsController.getBalance);

/**
 * @route   POST /api/credits/add
 * @desc    Adiciona créditos ao usuário (apenas Admin)
 * @access  Private (Admin only)
 */
router.post('/add', [
  authenticate,
  authorize(['admin']),
  body('user_id')
    .isUUID()
    .withMessage('ID do usuário deve ser um UUID válido'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser um número positivo maior que 0'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  
  handleValidationErrors
], CreditsController.addCredits);

/**
 * @route   GET /api/credits/history
 * @desc    Obtém o histórico de transações do usuário
 * @access  Private
 */
router.get('/history', [
  authenticate,
  validatePagination,
  query('type')
    .optional()
    .isIn(['credit_purchase', 'sms_sent', 'sms_received', 'refund'])
    .withMessage('Tipo deve ser: credit_purchase, sms_sent, sms_received ou refund'),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Status deve ser: pending, completed, failed ou cancelled'),
  
  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Data de início deve estar no formato ISO8601'),
  
  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Data de fim deve estar no formato ISO8601'),
  
  handleValidationErrors
], CreditsController.getTransactionHistory);

/**
 * @route   GET /api/credits/stats
 * @desc    Obtém estatísticas de créditos do usuário
 * @access  Private
 */
router.get('/stats', authenticate, CreditsController.getCreditStats);

/**
 * @route   POST /api/credits/refund
 * @desc    Processa reembolso de créditos (apenas Admin)
 * @access  Private (Admin only)
 */
router.post('/refund', [
  authenticate,
  authorize(['admin']),
  body('user_id')
    .isUUID()
    .withMessage('ID do usuário deve ser um UUID válido'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valor deve ser um número positivo maior que 0'),
  
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Motivo deve ter no máximo 500 caracteres'),
  
  handleValidationErrors
], CreditsController.refundCredits);

/**
 * @route   GET /api/credits/all-transactions
 * @desc    Obtém histórico de transações de todos os usuários (apenas Admin)
 * @access  Private (Admin only)
 */
router.get('/all-transactions', [
  authenticate,
  authorize(['admin']),
  validatePagination,
  query('type')
    .optional()
    .isIn(['credit_purchase', 'sms_sent', 'sms_received', 'refund'])
    .withMessage('Tipo deve ser: credit_purchase, sms_sent, sms_received ou refund'),
  
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Status deve ser: pending, completed, failed ou cancelled'),
  
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
], CreditsController.getAllTransactions);

module.exports = router;


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
  handleValidationErrors,
  validateTransactionHistory
} = require('../../Utils/validation');
const { body, query } = require('express-validator');

const router = express.Router();

/**
 * @route   GET /api/credits/balance
 * @desc    Obtém o saldo de créditos do usuário
 * @access  Private
 */
router.get('/balance', authenticate, CreditsController.getBalance);

// =========================================================================
// ✅ NOVO ENDPOINT PÚBLICO PARA TESTES
// AVISO: REMOVER ANTES DE IR PARA PRODUÇÃO!
// =========================================================================
/**
 * @route   POST /api/credits/add-balance-for-self (TESTE)
 * @desc    Adiciona créditos à própria conta do usuário (APENAS PARA TESTES).
 * @access  Private (Qualquer usuário autenticado)
 */
router.post('/add-balance-for-self', [
  authenticate, // Autentica para saber QUEM é o usuário
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('O valor deve ser um número positivo maior que 0.01'),
  handleValidationErrors
], CreditsController.addBalanceForSelf);
// =========================================================================


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
  ...validateTransactionHistory,
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
  ...validateTransactionHistory,
  query('user_id')
    .optional()
    .isUUID()
    .withMessage('ID do usuário deve ser um UUID válido'),
  handleValidationErrors
], CreditsController.getAllTransactions);



// =========================================================================
// ✅ NOVAS ROTAS PARA A LÓGICA DE SERVIÇO -> PAÍS
// =========================================================================

/**
 * @route   GET /api/sms/get-all-services
 * @desc    Obtém a lista de todos os serviços disponíveis.
 * @access  Private
 */
router.get('/get-all-services', 
    authenticate, 
    SMSController.getAllServices
);

/**
 * @route   GET /api/sms/countries-by-service/:serviceCode
 * @desc    Obtém a lista de países e preços para um serviço específico.
 * @access  Private
 */
router.get('/countries-by-service/:serviceCode',
  [
    authenticate,
    param('serviceCode')
      .notEmpty()
      .withMessage('O código do serviço é obrigatório na URL.')
      .isString()
      .withMessage('O código do serviço deve ser um texto.'),
    handleValidationErrors
  ],
  SMSController.getCountriesByService
);


module.exports = router;
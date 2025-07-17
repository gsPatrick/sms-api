/**
 * Rotas de Pagamentos
 * 
 * Define as rotas HTTP para funcionalidades de pagamento
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const PaymentsController = require('./Payments.controller');
const { authenticate, authorize } = require('../../Utils/auth');

const router = express.Router();

/**
 * @route GET /api/payments/packages
 * @desc Lista pacotes de créditos disponíveis
 * @access Private (mas acessível a clientes logados)
 */
router.get('/packages', authenticate, PaymentsController.getCreditPackages);

/**
 * @route POST /api/payments/stripe/create
 * @desc Cria sessão de pagamento no Stripe
 * @access Private
 */
router.post('/stripe/create',
  authenticate, // Autenticação para usuários logados
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0'),
    body('credits').isInt({ min: 1 }).withMessage('Quantidade de créditos deve ser maior que 0'),
    body('currency').optional().isIn(['BRL', 'USD', 'EUR']).withMessage('Moeda inválida')
  ],
  PaymentsController.createStripePayment
);

/**
 * @route POST /api/payments/mercadopago/create
 * @desc Cria preferência de pagamento no Mercado Pago
 * @access Private
 */
router.post('/mercadopago/create',
  authenticate, // Autenticação para usuários logados
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Valor deve ser maior que 0'),
    body('credits').isInt({ min: 1 }).withMessage('Quantidade de créditos deve ser maior que 0')
  ],
  PaymentsController.createMercadoPagoPayment
);

/**
 * @route GET /api/payments/transactions
 * @desc Esta rota não é usada pelo frontend do SMSBRA para histórico de compras.
 * @access Private (Pode ser removida ou adaptada se necessário)
 */
// REMOVIDO: router.get('/transactions', ...) para evitar confusão ou endpoint não utilizado.

module.exports = router;
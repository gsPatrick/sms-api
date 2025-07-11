/**
 * Centralização das Rotas
 * 
 * Arquivo principal que centraliza todas as rotas da aplicação
 * e organiza os endpoints por funcionalidade
 */

const express = require('express');

// Importação das rotas por funcionalidade
const authRoutes = require('../Features/Auth/Auth.routes');
const creditsRoutes = require('../Features/Credits/Credits.routes');
const smsRoutes = require('../Features/SMS/SMS.routes');
const adminRoutes = require('../Features/Admin/Admin.routes');
const paymentsRoutes = require('../Features/Payments/Payments.routes');

const router = express.Router();

/**
 * Middleware para log de requisições (desenvolvimento)
 */
if (process.env.NODE_ENV === 'development') {
  router.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
  });
}

/**
 * Rota de health check
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando corretamente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Rotas de autenticação
 * /api/auth/*
 */
router.use('/auth', authRoutes);

/**
 * Rotas de créditos
 * /api/credits/*
 */
router.use('/credits', creditsRoutes);

/**
 * Rotas de SMS
 * /api/sms/*
 */
router.use('/sms', smsRoutes);

/**
 * Rotas de administração
 * /api/admin/*
 */
router.use('/admin', adminRoutes);

/**
 * Rotas de pagamentos
 * /api/payments/*
 */
router.use('/payments', paymentsRoutes);

/**
 * Middleware para rotas não encontradas
 */
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl
  });
});

/**
 * Middleware global de tratamento de erros
 */
router.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

module.exports = router;


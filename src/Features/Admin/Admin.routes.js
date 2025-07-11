/**
 * Rotas de Administração
 * 
 * Define as rotas HTTP para funcionalidades administrativas
 * incluindo validações e middlewares de segurança
 */

const express = require('express');
const AdminController = require('./Admin.controller');
const { authenticate, authorize } = require('../../Utils/auth');
const {
  validateUUID,
  validatePagination,
  validateSmsServiceCreation,
  handleValidationErrors
} = require('../../Utils/validation');
const { body, query } = require('express-validator');

const router = express.Router();

// Middleware para garantir que apenas admins acessem essas rotas
router.use(authenticate);
router.use(authorize(['admin']));

/**
 * @route   GET /api/admin/users
 * @desc    Obtém lista de todos os usuários
 * @access  Private (Admin only)
 */
router.get('/users', [
  validatePagination,
  query('role')
    .optional()
    .isIn(['admin', 'client'])
    .withMessage('Role deve ser admin ou client'),
  
  query('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active deve ser um valor booleano'),
  
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Busca deve ter entre 1 e 100 caracteres'),
  
  handleValidationErrors
], AdminController.getAllUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Obtém detalhes de um usuário específico
 * @access  Private (Admin only)
 */
router.get('/users/:userId', [
  validateUUID('userId')
], AdminController.getUserDetails);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Atualiza informações de um usuário
 * @access  Private (Admin only)
 */
router.put('/users/:userId', [
  validateUUID('userId'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Nome de usuário deve ter entre 3 e 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Nome de usuário deve conter apenas letras, números e underscore'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  
  body('role')
    .optional()
    .isIn(['admin', 'client'])
    .withMessage('Role deve ser admin ou client'),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active deve ser um valor booleano'),
  
  body('credits')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Créditos deve ser um número positivo'),
  
  handleValidationErrors
], AdminController.updateUser);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Deleta um usuário
 * @access  Private (Admin only)
 */
router.delete('/users/:userId', [
  validateUUID('userId')
], AdminController.deleteUser);

/**
 * @route   GET /api/admin/services
 * @desc    Obtém lista de todos os serviços SMS
 * @access  Private (Admin only)
 */
router.get('/services', [
  validatePagination,
  query('active')
    .optional()
    .isBoolean()
    .withMessage('active deve ser um valor booleano'),
  
  query('category')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Categoria deve ter entre 1 e 50 caracteres'),
  
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Busca deve ter entre 1 e 100 caracteres'),
  
  handleValidationErrors
], AdminController.getAllSmsServices);

/**
 * @route   POST /api/admin/services
 * @desc    Cria um novo serviço SMS
 * @access  Private (Admin only)
 */
router.post('/services', [
  validateSmsServiceCreation,
  body('category')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Categoria deve ter entre 1 e 50 caracteres'),
  
  body('icon_url')
    .optional()
    .isURL()
    .withMessage('URL do ícone deve ser uma URL válida'),
  
  handleValidationErrors
], AdminController.createSmsService);

/**
 * @route   PUT /api/admin/services/:serviceId
 * @desc    Atualiza um serviço SMS
 * @access  Private (Admin only)
 */
router.put('/services/:serviceId', [
  validateUUID('serviceId'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome deve ter entre 1 e 100 caracteres'),
  
  body('code')
    .optional()
    .isLength({ min: 1, max: 20 })
    .withMessage('Código deve ter entre 1 e 20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Código deve conter apenas letras, números e underscore'),
  
  body('price_per_otp')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Preço por OTP deve ser um número positivo'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  
  body('category')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Categoria deve ter entre 1 e 50 caracteres'),
  
  body('icon_url')
    .optional()
    .isURL()
    .withMessage('URL do ícone deve ser uma URL válida'),
  
  body('active')
    .optional()
    .isBoolean()
    .withMessage('active deve ser um valor booleano'),
  
  handleValidationErrors
], AdminController.updateSmsService);

/**
 * @route   DELETE /api/admin/services/:serviceId
 * @desc    Deleta um serviço SMS
 * @access  Private (Admin only)
 */
router.delete('/services/:serviceId', [
  validateUUID('serviceId')
], AdminController.deleteSmsService);

/**
 * @route   GET /api/admin/stats
 * @desc    Obtém estatísticas gerais do sistema
 * @access  Private (Admin only)
 */
router.get('/stats', AdminController.getSystemStats);

/**
 * Rotas públicas para usuários (não requerem permissão de admin)
 */

/**
 * @route   GET /api/admin/services/available
 * @desc    Obtém serviços SMS disponíveis (para usuários)
 * @access  Private
 */
router.get('/services/available', [
  // Remove a verificação de admin para esta rota específica
  (req, res, next) => {
    // Apenas verifica se está autenticado, não se é admin
    next();
  }
], AdminController.getAvailableServices);

module.exports = router;


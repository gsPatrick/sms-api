/**
 * Utilitários de Validação
 * 
 * Funções auxiliares para validação de dados de entrada
 * usando express-validator
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para verificar erros de validação
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  
  next();
};

/**
 * Validações para registro de usuário
 */
const validateUserRegistration = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Nome de usuário deve ter entre 3 e 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Nome de usuário deve conter apenas letras, números e underscore'),
  
  body('email')
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  
  handleValidationErrors
];

/**
 * Validações para login de usuário
 */
const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Email deve ser válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória'),
  
  handleValidationErrors
];

/**
 * Validações para compra de créditos
 */
const validateCreditPurchase = [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Valor deve ser um número positivo maior que 1'),
  
  body('gateway')
    .isIn(['stripe', 'mercadopago'])
    .withMessage('Gateway deve ser stripe ou mercadopago'),
  
  handleValidationErrors
];

/**
 * Validações para solicitação de número SMS
 */
const validateSmsRequest = [
  body('service_code')
    .notEmpty()
    .withMessage('Código do serviço é obrigatório'),
  
  body('country_code')
    .optional()
    .isLength({ min: 1, max: 3 })
    .withMessage('Código do país deve ter entre 1 e 3 caracteres'),
  
  body('operator')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Operadora deve ter entre 1 e 50 caracteres'),
  
  handleValidationErrors
];

/**
 * Validações para parâmetros UUID
 */
const validateUUID = (paramName) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} deve ser um UUID válido`),
  
  handleValidationErrors
];

/**
 * Validações para paginação
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página deve ser um número inteiro positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limite deve ser um número inteiro entre 1 e 100'),
  
  handleValidationErrors
];

/**
 * Validações para criação de serviço SMS (Admin)
 */
const validateSmsServiceCreation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Nome deve ter entre 1 e 100 caracteres'),
  
  body('code')
    .isLength({ min: 1, max: 20 })
    .withMessage('Código deve ter entre 1 e 20 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Código deve conter apenas letras, números e underscore'),
  
  body('price_per_otp')
    .isFloat({ min: 0 })
    .withMessage('Preço por OTP deve ser um número positivo'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Descrição deve ter no máximo 500 caracteres'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validateCreditPurchase,
  validateSmsRequest,
  validateUUID,
  validatePagination,
  validateSmsServiceCreation
};


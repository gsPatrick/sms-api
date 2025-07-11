/**
 * Rotas de Autenticação
 * 
 * Define as rotas HTTP para autenticação de usuários
 * incluindo validações e middlewares de segurança
 */

const express = require('express');
const AuthController = require('./Auth.controller');
const { authenticate } = require('../../Utils/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  handleValidationErrors
} = require('../../Utils/validation');
const { body } = require('express-validator');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registra um novo usuário
 * @access  Public
 */
router.post('/register', validateUserRegistration, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Realiza o login do usuário
 * @access  Public
 */
router.post('/login', validateUserLogin, AuthController.login);

/**
 * @route   POST /api/auth/logout
 * @desc    Realiza o logout do usuário
 * @access  Private
 */
router.post('/logout', authenticate, AuthController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Obtém as informações do usuário autenticado
 * @access  Private
 */
router.get('/me', authenticate, AuthController.getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Atualiza o perfil do usuário
 * @access  Private
 */
router.put('/profile', [
  authenticate,
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
  
  handleValidationErrors
], AuthController.updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Altera a senha do usuário
 * @access  Private
 */
router.put('/password', [
  authenticate,
  body('currentPassword')
    .notEmpty()
    .withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Nova senha deve ter pelo menos 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Nova senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    }),
  
  handleValidationErrors
], AuthController.changePassword);

module.exports = router;


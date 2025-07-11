/**
 * Controlador de Autenticação
 * 
 * Gerencia as requisições HTTP relacionadas à autenticação
 * e delega a lógica de negócio para o AuthService
 */

const AuthService = require('./Auth.service');

class AuthController {
  /**
   * Registra um novo usuário
   * POST /api/auth/register
   */
  async register(req, res) {
    try {
      const result = await AuthService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Usuário registrado com sucesso',
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Realiza o login do usuário
   * POST /api/auth/login
   */
  async login(req, res) {
    try {
      const result = await AuthService.login(req.body);
      
      res.status(200).json({
        success: true,
        message: 'Login realizado com sucesso',
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém as informações do usuário autenticado
   * GET /api/auth/me
   */
  async getProfile(req, res) {
    try {
      const user = await AuthService.getProfile(req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Perfil obtido com sucesso',
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Atualiza o perfil do usuário
   * PUT /api/auth/profile
   */
  async updateProfile(req, res) {
    try {
      const user = await AuthService.updateProfile(req.user.id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Perfil atualizado com sucesso',
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Altera a senha do usuário
   * PUT /api/auth/password
   */
  async changePassword(req, res) {
    try {
      await AuthService.changePassword(req.user.id, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Logout do usuário
   * POST /api/auth/logout
   */
  async logout(req, res) {
    try {
      // Como estamos usando JWT stateless, o logout é apenas uma confirmação
      // O cliente deve remover o token do armazenamento local
      res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new AuthController();


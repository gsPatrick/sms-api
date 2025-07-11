/**
 * Controlador de Administração
 * 
 * Gerencia as requisições HTTP relacionadas às funcionalidades administrativas
 * e delega a lógica de negócio para o AdminService
 */

const AdminService = require('./Admin.service');

class AdminController {
  /**
   * Obtém lista de todos os usuários
   * GET /api/admin/users
   */
  async getAllUsers(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        role: req.query.role,
        is_active: req.query.is_active,
        search: req.query.search
      };

      const result = await AdminService.getAllUsers(options);
      
      res.status(200).json({
        success: true,
        message: 'Usuários obtidos com sucesso',
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
   * Obtém detalhes de um usuário específico
   * GET /api/admin/users/:userId
   */
  async getUserDetails(req, res) {
    try {
      const { userId } = req.params;
      const result = await AdminService.getUserDetails(userId);
      
      res.status(200).json({
        success: true,
        message: 'Detalhes do usuário obtidos com sucesso',
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Atualiza informações de um usuário
   * PUT /api/admin/users/:userId
   */
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const result = await AdminService.updateUser(userId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Usuário atualizado com sucesso',
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
   * Deleta um usuário
   * DELETE /api/admin/users/:userId
   */
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      await AdminService.deleteUser(userId);
      
      res.status(200).json({
        success: true,
        message: 'Usuário deletado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém lista de todos os serviços SMS
   * GET /api/admin/services
   */
  async getAllSmsServices(req, res) {
    try {
      const options = {
        page: req.query.page,
        limit: req.query.limit,
        active: req.query.active,
        category: req.query.category,
        search: req.query.search
      };

      const result = await AdminService.getAllSmsServices(options);
      
      res.status(200).json({
        success: true,
        message: 'Serviços obtidos com sucesso',
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
   * Cria um novo serviço SMS
   * POST /api/admin/services
   */
  async createSmsService(req, res) {
    try {
      const result = await AdminService.createSmsService(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Serviço criado com sucesso',
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
   * Atualiza um serviço SMS
   * PUT /api/admin/services/:serviceId
   */
  async updateSmsService(req, res) {
    try {
      const { serviceId } = req.params;
      const result = await AdminService.updateSmsService(serviceId, req.body);
      
      res.status(200).json({
        success: true,
        message: 'Serviço atualizado com sucesso',
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
   * Deleta um serviço SMS
   * DELETE /api/admin/services/:serviceId
   */
  async deleteSmsService(req, res) {
    try {
      const { serviceId } = req.params;
      await AdminService.deleteSmsService(serviceId);
      
      res.status(200).json({
        success: true,
        message: 'Serviço deletado com sucesso'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém estatísticas gerais do sistema
   * GET /api/admin/stats
   */
  async getSystemStats(req, res) {
    try {
      const stats = await AdminService.getSystemStats();
      
      res.status(200).json({
        success: true,
        message: 'Estatísticas obtidas com sucesso',
        data: stats
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * Obtém serviços SMS disponíveis (para usuários)
   * GET /api/admin/services/available
   */
  async getAvailableServices(req, res) {
    try {
      const { SmsService } = require('../../models');
      
      const services = await SmsService.findAll({
        where: { active: true },
        order: [['name', 'ASC']],
        attributes: ['id', 'name', 'code', 'description', 'price_per_otp', 'category', 'icon_url']
      });
      
      res.status(200).json({
        success: true,
        message: 'Serviços disponíveis obtidos com sucesso',
        data: services
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new AdminController();


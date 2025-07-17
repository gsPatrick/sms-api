/**
 * Controlador de Pagamentos
 * 
 * Gerencia as requisições HTTP relacionadas aos pagamentos
 */

const PaymentsService = require('./Payments.service'); // Importar o serviço

class PaymentsController {
  /**
   * Lista os pacotes de créditos disponíveis
   */
   async getCreditPackages(req, res) {
    try {
      const packages = PaymentsService.getCreditPackages(); 
      
      res.status(200).json({
        success: true,
        data: packages,
        message: 'Pacotes de créditos obtidos com sucesso'
      });
    } catch (error) {
      console.error('Erro ao obter pacotes de créditos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao obter pacotes'
      });
    }
  }
  /**
   * Cria uma sessão de pagamento no Stripe
   */
 async createStripePayment(req, res) { // Tornar async
    try {
      const { amount, credits, currency } = req.body;
      const userId = req.user.id; // Pegar o ID do usuário autenticado

      // ✅ CHAMADA REAL PARA O SERVIÇO DO STRIPE
      const session = await PaymentsService.createStripePaymentSession(userId, { amount, credits, currency });

      res.status(200).json({ // Status 200 OK
        success: true,
        data: session,
        message: 'Sessão de pagamento Stripe criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar pagamento Stripe:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao processar pagamento Stripe'
      });
    }
  }

  /**
   * Cria uma preferência de pagamento no Mercado Pago
   */
 async createMercadoPagoPayment(req, res) { // Tornar async
    try {
      const { amount, credits } = req.body;
      const userId = req.user.id; // Pegar o ID do usuário autenticado

      // ✅ CHAMADA REAL PARA O SERVIÇO DO MERCADO PAGO
      const preference = await PaymentsService.createMercadoPagoPreference(userId, { amount, credits });

      res.status(200).json({ // Status 200 OK
        success: true,
        data: preference,
        message: 'Preferência de pagamento Mercado Pago criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar pagamento Mercado Pago:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao processar pagamento Mercado Pago'
      });
    }
  }


  /**
   * Lista histórico de transações do usuário
   */
  getUserTransactions(req, res) {
    // ESTA É UMA SIMULAÇÃO. NO PROJETO REAL, CHAMARIA PaymentsService.getUserTransactions (se houvesse um) ou CreditsService.getTransactionHistory
    try {
      const { page = 1, limit = 10 } = req.query;

      // Simulação de dados
      const transactions = {
        rows: [
          {
            id: '1',
            amount: 60.00,
            credits: 50,
            status: 'completed',
            gateway: 'mercadopago',
            created_at: new Date().toISOString()
          },
          {
            id: '2',
            amount: 15.00,
            credits: 10,
            status: 'completed',
            gateway: 'stripe',
            created_at: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        count: 2
      };

      res.json({
        success: true,
        data: {
          transactions: transactions.rows,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(transactions.count / parseInt(limit)),
            total_items: transactions.count,
            items_per_page: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Erro ao obter transações do usuário:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }
}

module.exports = new PaymentsController();
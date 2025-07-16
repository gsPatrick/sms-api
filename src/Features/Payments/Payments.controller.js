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
  async getCreditPackages(req, res) { // Tornar assíncrono para chamar o serviço
    try {
      // ✅ CORREÇÃO: Chamar o serviço para obter os pacotes
      const packages = PaymentsService.getCreditPackages(); 
      
      res.status(200).json({ // Status 200 OK
        success: true,
        data: packages,
        message: 'Pacotes de créditos obtidos com sucesso' // Adicionar mensagem de sucesso
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
  createStripePayment(req, res) {
    // ESTA É UMA SIMULAÇÃO. NO PROJETO REAL, CHAMARIA PaymentsService.createStripePaymentSession
    try {
      const { amount, credits, currency } = req.body;

      // Simulação de resposta do Stripe
      const session = {
        session_id: 'cs_test_' + Math.random().toString(36).substr(2, 9),
        session_url: 'https://checkout.stripe.com/pay/cs_test_' + Math.random().toString(36).substr(2, 9),
        amount: amount,
        credits: credits,
        currency: currency || 'BRL'
      };

      res.json({
        success: true,
        data: session,
        message: 'Sessão de pagamento criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar pagamento Stripe:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao processar pagamento'
      });
    }
  }

  /**
   * Cria uma preferência de pagamento no Mercado Pago
   */
  createMercadoPagoPayment(req, res) {
    // ESTA É UMA SIMULAÇÃO. NO PROJETO REAL, CHAMARIA PaymentsService.createMercadoPagoPreference
    try {
      const { amount, credits } = req.body;

      // Simulação de resposta do Mercado Pago
      const preference = {
        preference_id: 'MP-' + Math.random().toString(36).substr(2, 9),
        init_point: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=MP-' + Math.random().toString(36).substr(2, 9),
        amount: amount,
        credits: credits
      };

      res.json({
        success: true,
        data: preference,
        message: 'Preferência de pagamento criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar pagamento Mercado Pago:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Erro ao processar pagamento'
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
/**
 * Serviço de Pagamentos
 * 
 * Contém a lógica de negócio para processamento de pagamentos
 * incluindo integração com Stripe e Mercado Pago
 */

const Stripe = require('stripe');
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const { User, Transaction } = require('../../models');
// const CreditsService = require('../Credits/Credits.service');

class PaymentsService {
  constructor() {
    // Inicializa Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Inicializa Mercado Pago
    this.mercadoPago = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    });
    this.mpPayment = new Payment(this.mercadoPago);
    this.mpPreference = new Preference(this.mercadoPago);
  }

  /**
   * Cria uma sessão de pagamento no Stripe
   * @param {string} userId - ID do usuário
   * @param {Object} paymentData - Dados do pagamento
   * @returns {Object} - Sessão de pagamento criada
   */
  async createStripePaymentSession(userId, paymentData) {
    const { amount, currency = 'brl', credits } = paymentData;

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Cria a sessão de pagamento
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: `${credits} Créditos SMS`,
                description: `Compra de ${credits} créditos para recebimento de SMS`,
                images: ['https://smsbra.com.br/logo.png'],
              },
              unit_amount: Math.round(amount * 100), // Stripe usa centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/dashboard/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/dashboard/payment/cancel`,
        metadata: {
          user_id: userId,
          credits: credits.toString(),
          gateway: 'stripe'
        },
        customer_email: user.email,
        billing_address_collection: 'required',
        payment_intent_data: {
          metadata: {
            user_id: userId,
            credits: credits.toString()
          }
        }
      });

      // Cria transação pendente
      const transaction = await Transaction.create({
        user_id: userId,
        type: 'credit_purchase',
        amount: parseFloat(amount),
        gateway: 'stripe',
        transaction_id_gateway: session.id,
        status: 'pending',
        description: `Compra de ${credits} créditos via Stripe`,
        metadata: {
          session_id: session.id,
          credits: credits,
          stripe_payment_intent: session.payment_intent
        }
      });

      return {
        session_id: session.id,
        session_url: session.url,
        transaction_id: transaction.id
      };
    } catch (error) {
      throw new Error(`Erro ao criar sessão Stripe: ${error.message}`);
    }
  }

  /**
   * Cria uma preferência de pagamento no Mercado Pago
   * @param {string} userId - ID do usuário
   * @param {Object} paymentData - Dados do pagamento
   * @returns {Object} - Preferência de pagamento criada
   */
  async createMercadoPagoPreference(userId, paymentData) {
    const { amount, credits } = paymentData;

    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Cria a preferência de pagamento
      const preference = await this.mpPreference.create({
        body: {
          items: [
            {
              title: `${credits} Créditos SMS`,
              description: `Compra de ${credits} créditos para recebimento de SMS`,
              quantity: 1,
              unit_price: parseFloat(amount),
              currency_id: 'BRL'
            }
          ],
          payer: {
            email: user.email,
            name: user.username
          },
          back_urls: {
            success: `${process.env.FRONTEND_URL}/dashboard/payment/success`,
            failure: `${process.env.FRONTEND_URL}/dashboard/payment/cancel`,
            pending: `${process.env.FRONTEND_URL}/dashboard/payment/pending`
          },
          auto_return: 'approved',
          external_reference: userId,
          metadata: {
            user_id: userId,
            credits: credits.toString(),
            gateway: 'mercadopago'
          },
          notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/mercadopago/webhook`,
          statement_descriptor: 'SMS BRA'
        }
      });

      // Cria transação pendente
      const transaction = await Transaction.create({
        user_id: userId,
        type: 'credit_purchase',
        amount: parseFloat(amount),
        gateway: 'mercadopago',
        transaction_id_gateway: preference.id,
        status: 'pending',
        description: `Compra de ${credits} créditos via Mercado Pago`,
        metadata: {
          preference_id: preference.id,
          credits: credits
        }
      });

      return {
        preference_id: preference.id,
        init_point: preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        transaction_id: transaction.id
      };
    } catch (error) {
      throw new Error(`Erro ao criar preferência Mercado Pago: ${error.message}`);
    }
  }

  /**
   * Processa webhook do Stripe
   * @param {Object} event - Evento do webhook
   * @param {string} signature - Assinatura do webhook
   * @returns {boolean} - Sucesso do processamento
   */
  async processStripeWebhook(event, signature) {
    try {
      // Verifica a assinatura do webhook
      const webhookEvent = this.stripe.webhooks.constructEvent(
        event,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (webhookEvent.type) {
        case 'checkout.session.completed':
          await this.handleStripePaymentSuccess(webhookEvent.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handleStripePaymentFailed(webhookEvent.data.object);
          break;
        default:
          console.log(`Evento Stripe não tratado: ${webhookEvent.type}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao processar webhook Stripe:', error);
      throw error;
    }
  }

  /**
   * Processa webhook do Mercado Pago
   * @param {Object} notification - Notificação do webhook
   * @returns {boolean} - Sucesso do processamento
   */
  async processMercadoPagoWebhook(notification) {
    try {
      const { type, data } = notification;

      if (type === 'payment') {
        const payment = await this.mpPayment.get({ id: data.id });
        
        switch (payment.status) {
          case 'approved':
            await this.handleMercadoPagoPaymentSuccess(payment);
            break;
          case 'rejected':
          case 'cancelled':
            await this.handleMercadoPagoPaymentFailed(payment);
            break;
          default:
            console.log(`Status Mercado Pago não tratado: ${payment.status}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Erro ao processar webhook Mercado Pago:', error);
      throw error;
    }
  }

  /**
   * Manipula pagamento bem-sucedido do Stripe
   * @param {Object} session - Sessão do checkout
   */
  async handleStripePaymentSuccess(session) {
    try {
      const { user_id, credits } = session.metadata;

      // Atualiza a transação
      const transaction = await Transaction.findOne({
        where: {
          transaction_id_gateway: session.id,
          gateway: 'stripe'
        }
      });

      if (transaction) {
        await transaction.update({
          status: 'completed',
          metadata: {
            ...transaction.metadata,
            payment_intent: session.payment_intent,
            amount_total: session.amount_total
          }
        });

        // Adiciona créditos ao usuário
        // await CreditsService.addCredits(user_id, parseFloat(credits), {
        //   gateway: 'stripe',
        //   transaction_id_gateway: session.id,
        //   status: 'completed',
        //   description: `Compra de ${credits} créditos via Stripe - Pagamento aprovado`
        // });

        console.log(`Pagamento Stripe aprovado para usuário ${user_id}: ${credits} créditos`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento Stripe aprovado:', error);
    }
  }

  /**
   * Manipula pagamento falhado do Stripe
   * @param {Object} paymentIntent - Intent de pagamento
   */
  async handleStripePaymentFailed(paymentIntent) {
    try {
      const { user_id } = paymentIntent.metadata;

      // Atualiza a transação
      const transaction = await Transaction.findOne({
        where: {
          user_id: user_id,
          gateway: 'stripe',
          status: 'pending'
        }
      });

      if (transaction) {
        await transaction.update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            failure_reason: paymentIntent.last_payment_error?.message
          }
        });

        console.log(`Pagamento Stripe falhado para usuário ${user_id}`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento Stripe falhado:', error);
    }
  }

  /**
   * Manipula pagamento bem-sucedido do Mercado Pago
   * @param {Object} payment - Pagamento do Mercado Pago
   */
  async handleMercadoPagoPaymentSuccess(payment) {
    try {
      const { user_id, credits } = payment.metadata;

      // Atualiza a transação
      const transaction = await Transaction.findOne({
        where: {
          user_id: user_id,
          gateway: 'mercadopago',
          status: 'pending'
        }
      });

      if (transaction) {
        await transaction.update({
          status: 'completed',
          metadata: {
            ...transaction.metadata,
            payment_id: payment.id,
            payment_method: payment.payment_method_id
          }
        });

        // Adiciona créditos ao usuário
        // await CreditsService.addCredits(user_id, parseFloat(credits), {
        //   gateway: 'mercadopago',
        //   transaction_id_gateway: payment.id.toString(),
        //   status: 'completed',
        //   description: `Compra de ${credits} créditos via Mercado Pago - Pagamento aprovado`
        // });

        console.log(`Pagamento Mercado Pago aprovado para usuário ${user_id}: ${credits} créditos`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento Mercado Pago aprovado:', error);
    }
  }

  /**
   * Manipula pagamento falhado do Mercado Pago
   * @param {Object} payment - Pagamento do Mercado Pago
   */
  async handleMercadoPagoPaymentFailed(payment) {
    try {
      const { user_id } = payment.metadata;

      // Atualiza a transação
      const transaction = await Transaction.findOne({
        where: {
          user_id: user_id,
          gateway: 'mercadopago',
          status: 'pending'
        }
      });

      if (transaction) {
        await transaction.update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            payment_id: payment.id,
            failure_reason: payment.status_detail
          }
        });

        console.log(`Pagamento Mercado Pago falhado para usuário ${user_id}`);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento Mercado Pago falhado:', error);
    }
  }

  /**
   * Obtém detalhes de uma transação
   * @param {string} transactionId - ID da transação
   * @returns {Object} - Detalhes da transação
   */
  async getTransactionDetails(transactionId) {
    const transaction = await Transaction.findByPk(transactionId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!transaction) {
      throw new Error('Transação não encontrada');
    }

    return transaction;
  }

  /**
   * Lista pacotes de créditos disponíveis
   * @returns {Array} - Lista de pacotes
   */
  getCreditPackages() {
    return [
      {
        id: 'basic',
        name: 'Básico',
        credits: 10,
        price: 5.00,
        description: 'Ideal para uso pessoal',
        popular: false
      },
      {
        id: 'standard',
        name: 'Padrão',
        credits: 50,
        price: 20.00,
        description: 'Melhor custo-benefício',
        popular: true,
        discount: 20
      },
      {
        id: 'premium',
        name: 'Premium',
        credits: 100,
        price: 35.00,
        description: 'Para uso intensivo',
        popular: false,
        discount: 30
      },
      {
        id: 'enterprise',
        name: 'Empresarial',
        credits: 500,
        price: 150.00,
        description: 'Para empresas',
        popular: false,
        discount: 40
      }
    ];
  }
}

module.exports = new PaymentsService();


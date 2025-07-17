// src/Features/Payments/Payments.service.js
/**
 * Serviço de Pagamentos
 * 
 * Contém a lógica de negócio para processamento de pagamentos
 * incluindo integração com Stripe e Mercado Pago
 */

const Stripe = require('stripe');
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');
const { User, Transaction } = require('../../models');
const CreditsService = require('../Credits/Credits.service');

// Helper para formatar datas em ISO com offset para MercadoPago
// Essa função é importante para o formato de data que o Mercado Pago espera para expiração.
function formatDateToPreference(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const padMs = (n) => String(n).padStart(3, '0');
  
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = padMs(date.getMilliseconds());
  
  const offset = -date.getTimezoneOffset(); // Offset em minutos
  const offsetHours = Math.floor(Math.abs(offset) / 60);
  const offsetMinutes = Math.abs(offset) % 60;
  const offsetSign = offset >= 0 ? '+' : '-'; // Mercado Pago usa + para UTC-X, - para UTC+X
  const offsetFormatted = `${offsetSign}${pad(offsetHours)}:${pad(offsetMinutes)}`;
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}${offsetFormatted}`;
}


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

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Expira em 24 horas

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
          external_reference: userId, // Usado para identificar o usuário no webhook
          metadata: {
            user_id: userId,
            credits: credits.toString(),
            gateway: 'mercadopago'
          },
          notification_url: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/payments/mercadopago/webhook`,
          statement_descriptor: 'SMS BRA',
          // ✅ NOVO: Adicionado expiração da preferência
          expires: true,
          expiration_date_from: formatDateToPreference(now),
          expiration_date_to: formatDateToPreference(expiresAt),
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

      const transaction = await Transaction.findOne({
        where: {
          transaction_id_gateway: session.id,
          gateway: 'stripe',
          status: 'pending'
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

        await CreditsService.addCredits(user_id, parseFloat(credits), {
          gateway: 'stripe',
          transaction_id_gateway: session.id,
          status: 'completed',
          description: `Compra de ${credits} créditos via Stripe - Pagamento aprovado`,
        });

        console.log(`Pagamento Stripe aprovado para usuário ${user_id}: ${credits} créditos. Transação ${transaction.id} marcada como completa.`);
      } else {
        console.warn(`Transação Stripe para sessão ${session.id} não encontrada ou já processada.`);
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

      const transaction = await Transaction.findOne({
        where: {
          user_id: user_id,
          gateway: 'stripe',
          // Precisamos de um identificador mais robusto aqui se a transaction_id_gateway
          // for apenas o session.id, e a paymentIntent.id for diferente.
          // Para este caso, podemos tentar achar uma transação pendente para o user_id.
          status: 'pending'
        }
      });

      if (transaction) {
        await transaction.update({
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            failure_reason: paymentIntent.last_payment_error?.message,
            payment_intent_id: paymentIntent.id
          }
        });

        console.log(`Pagamento Stripe falhado para usuário ${user_id}. Transação ${transaction.id} marcada como falha.`);
      } else {
        console.warn(`Transação Stripe pendente para usuário ${user_id} não encontrada para marcar como falha.`);
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

      const transaction = await Transaction.findOne({
        where: {
          transaction_id_gateway: payment.preference_id, // Usamos o preference_id aqui para encontrar a transação
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

        await CreditsService.addCredits(user_id, parseFloat(credits), {
          gateway: 'mercadopago',
          transaction_id_gateway: payment.id.toString(), // Usar o ID do pagamento real do MP
          status: 'completed',
          description: `Compra de ${credits} créditos via Mercado Pago - Pagamento aprovado`,
        });

        console.log(`Pagamento Mercado Pago aprovado para usuário ${user_id}: ${credits} créditos. Transação ${transaction.id} marcada como completa.`);
      } else {
        console.warn(`Transação Mercado Pago para preferência ${payment.preference_id} não encontrada ou já processada.`);
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

      const transaction = await Transaction.findOne({
        where: {
          transaction_id_gateway: payment.preference_id,
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

        console.log(`Pagamento Mercado Pago falhado para usuário ${user_id}. Transação ${transaction.id} marcada como falha.`);
      } else {
        console.warn(`Transação Mercado Pago pendente para preferência ${payment.preference_id} não encontrada para marcar como falha.`);
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
        price: 15.00,
        description: 'Ideal para uso pessoal',
        popular: false
      },
      {
        id: 'standard',
        name: 'Padrão',
        credits: 50,
        price: 60.00,
        description: 'Perfeito para pequenas empresas',
        popular: true,
        discount: 20
      },
      {
        id: 'premium',
        name: 'Premium',
        credits: 100,
        price: 100.00,
        description: 'Para uso profissional intenso',
        popular: false,
        discount: 33
      },
      {
        id: 'enterprise',
        name: 'Empresarial',
        credits: 500,
        price: 400.00,
        description: 'Solução completa para empresas',
        popular: false,
        discount: 47
      }
    ];
  }
}

module.exports = new PaymentsService();
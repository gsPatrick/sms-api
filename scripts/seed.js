/**
 * Script de Seed - Dados Iniciais
 * 
 * Popula o banco de dados com dados iniciais necessários
 * para o funcionamento do sistema
 */

require('dotenv').config();
const { User, SmsService, syncDatabase } = require('../src/models');

/**
 * Dados iniciais dos serviços SMS
 */
const initialServices = [
  {
    name: 'WhatsApp',
    code: 'wa',
    description: 'Recebimento de códigos OTP do WhatsApp',
    price_per_otp: 0.50,
    category: 'messaging',
    active: true
  },
  {
    name: 'Telegram',
    code: 'tg',
    description: 'Recebimento de códigos OTP do Telegram',
    price_per_otp: 0.30,
    category: 'messaging',
    active: true
  },
  {
    name: 'Instagram',
    code: 'ig',
    description: 'Recebimento de códigos OTP do Instagram',
    price_per_otp: 0.60,
    category: 'social',
    active: true
  },
  {
    name: 'Facebook',
    code: 'fb',
    description: 'Recebimento de códigos OTP do Facebook',
    price_per_otp: 0.55,
    category: 'social',
    active: true
  },
  {
    name: 'Google',
    code: 'go',
    description: 'Recebimento de códigos OTP do Google',
    price_per_otp: 0.40,
    category: 'tech',
    active: true
  },
  {
    name: 'Twitter/X',
    code: 'tw',
    description: 'Recebimento de códigos OTP do Twitter/X',
    price_per_otp: 0.45,
    category: 'social',
    active: true
  },
  {
    name: 'Discord',
    code: 'ds',
    description: 'Recebimento de códigos OTP do Discord',
    price_per_otp: 0.35,
    category: 'gaming',
    active: true
  },
  {
    name: 'Uber',
    code: 'ub',
    description: 'Recebimento de códigos OTP do Uber',
    price_per_otp: 0.70,
    category: 'transport',
    active: true
  },
  {
    name: 'Airbnb',
    code: 'ab',
    description: 'Recebimento de códigos OTP do Airbnb',
    price_per_otp: 0.80,
    category: 'travel',
    active: true
  },
  {
    name: 'TikTok',
    code: 'tt',
    description: 'Recebimento de códigos OTP do TikTok',
    price_per_otp: 0.65,
    category: 'social',
    active: true
  }
];

/**
 * Função principal de seed
 */
const runSeed = async () => {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Sincroniza o banco de dados
    await syncDatabase(false);

    // Cria usuário administrador padrão
    const adminExists = await User.findOne({ where: { role: 'admin' } });
    
    if (!adminExists) {
      const admin = await User.create({
        username: 'admin',
        email: 'admin@smsbra.com.br',
        password_hash: 'Admin123!', // Será hasheado automaticamente
        role: 'admin',
        credits: 1000.00,
        is_active: true
      });
      console.log('✅ Usuário administrador criado:', admin.email);
    } else {
      console.log('ℹ️  Usuário administrador já existe');
    }

    // Cria usuário de teste
    const testUserExists = await User.findOne({ where: { email: 'teste@smsbra.com.br' } });
    
    if (!testUserExists) {
      const testUser = await User.create({
        username: 'usuario_teste',
        email: 'teste@smsbra.com.br',
        password_hash: 'Teste123!', // Será hasheado automaticamente
        role: 'client',
        credits: 50.00,
        is_active: true
      });
      console.log('✅ Usuário de teste criado:', testUser.email);
    } else {
      console.log('ℹ️  Usuário de teste já existe');
    }

    // Cria serviços SMS iniciais
    for (const serviceData of initialServices) {
      const existingService = await SmsService.findOne({ 
        where: { code: serviceData.code } 
      });

      if (!existingService) {
        const service = await SmsService.create(serviceData);
        console.log(`✅ Serviço criado: ${service.name} (${service.code})`);
      } else {
        console.log(`ℹ️  Serviço já existe: ${serviceData.name} (${serviceData.code})`);
      }
    }

    console.log('🎉 Seed concluído com sucesso!');
    console.log('');
    console.log('📋 Credenciais de acesso:');
    console.log('👤 Admin: admin@smsbra.com.br / Admin123!');
    console.log('👤 Teste: teste@smsbra.com.br / Teste123!');
    console.log('');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  }
};

// Executa o seed se este arquivo for chamado diretamente
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('✅ Processo de seed finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro no processo de seed:', error);
      process.exit(1);
    });
}

module.exports = { runSeed, initialServices };


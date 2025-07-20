/**
 * Aplicação Principal - Express Server
 * 
 * Arquivo principal que configura e inicializa o servidor Express
 * com todos os middlewares, rotas e configurações necessárias
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas

// Importações locais
const routes = require('./src/Routes');
// Certifique-se de que o caminho para 'models' está correto (assumindo que está em 'src/models/index.js')
const { testConnection, syncDatabase } = require('./src/models'); 

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Middlewares de segurança
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      // Adicione o domínio do seu frontend aqui se ele estiver em um domínio diferente para CSP
      // connectSrc: ["'self'", "https://jackbear-sms.r954jc.easypanel.host"],
    },
  },
  crossOriginEmbedderPolicy: false // Necessário para alguns embeds de terceiros, como widgets de pagamento
}));

/**
 * Middlewares gerais
 */
// ✅ CORS liberado para todas as origens e rotas (você pode restringir isso em produção)
app.use(cors()); 
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Middleware de log de requisições (apenas em desenvolvimento)
 */
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    next();
  });
}

/**
 * Middleware de health check básico
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

/**
 * Rotas principais da API
 */
app.use('/api', routes); // Assumindo que 'routes' é o seu Router principal

/**
 * Middleware para rotas não encontradas
 */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

/**
 * Middleware global de tratamento de erros
 */
app.use((error, req, res, next) => {
  console.error('❌ Erro não tratado:', error);
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erro interno do servidor',
    ...(isDevelopment && { 
      error: error.message,
      stack: error.stack 
    })
  });
});

/**
 * Função para inicializar o servidor
 */
const startServer = async () => {
  try {
    console.log('🔌 Testando conexão com banco de dados...');
    await testConnection();

    console.log('🧨 Sincronizando banco de dados com force: true...');
    await syncDatabase(false); // <-- aqui força a recriação das tabelas

    console.log('🚀 Iniciando servidor...');
    app.listen(PORT, () => {
      console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
      console.log(`🩺 Health Check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
};

/**
 * Tratamento de sinais do sistema (importante para encerramento limpo)
 */
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido. Encerrando servidor...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  // Não encerre o processo imediatamente em desenvolvimento para depuração
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Não encerre o processo imediatamente em desenvolvimento para depuração
  if (process.env.NODE_ENV !== 'development') {
    process.exit(1);
  }
});

// Inicia o servidor apenas se este arquivo for executado diretamente
if (require.main === module) {
  startServer();
}

module.exports = app;
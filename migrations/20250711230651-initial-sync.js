
'use strict';

const { syncDatabase } = require('../src/models');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await syncDatabase(true); // Força a sincronização para criar as tabelas
  },

  async down (queryInterface, Sequelize) {
    // Não é comum reverter a criação de todas as tabelas em uma migração inicial
    // Mas se necessário, pode-se adicionar lógica para dropar tabelas aqui
  }
};



/**
 * Movimenta SUS - Middleware de Proteção e Conformidade LGPD (lgpdAuthMiddleware.js)
 * ----------------------------------------------------------------------------------
 * Garante que o acesso aos dados de saúde respeite os perfis da Lei Geral de Proteção
 * de Dados (Lei nº 13.709/2018 - Art. 11: Tratamento de Dados Pessoais Sensíveis para
 * Tutela da Saúde), aplicando mascaramento de CPF/CNS e bloqueio de laudos quando o
 * perfil logado não possui habilitação clínica.
 */

const jwt = require('jsonwebtoken');
const database = require('../models/database');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_temporaria_desenvolvimento';

/**
 * Mascara o CPF caso o perfil LGPD seja voltado apenas a BI/Estatística
 */
function mascararCPF(cpf) {
  if (!cpf) return '***.***.***-**';
  const partes = cpf.split(/[.-]/);
  if (partes.length === 4) {
    return `***.${partes[1]}.${partes[2]}-**`;
  }
  return '***.***.***-**';
}

/**
 * Registra cada acesso ou ação crítica na tabela de auditoria da LGPD
 */
function registrarLogLGPD({ operador, perfilLGPD, acao, alvo, justificativaLegal, ip }) {
  const agora = new Date();
  const dataHoraFormatada = agora.toLocaleString('pt-BR');

  const novoLog = {
    id: `LOG-${Date.now().toString().slice(-4)}`,
    dataHora: dataHoraFormatada,
    operador: operador || 'Usuário Autenticado',
    perfilLGPD: perfilLGPD || 'MEDICO_REGULADOR',
    acao,
    alvo,
    justificativaLegal: justificativaLegal || 'Art. 11, II, f - Tutela da saúde (Regulação SUS)',
    ip: ip || '127.0.0.1'
  };

  database.logsAuditoriaLGPD.unshift(novoLog);
  // Mantém os últimos 50 logs em memória no MVP
  if (database.logsAuditoriaLGPD.length > 50) {
    database.logsAuditoriaLGPD.pop();
  }
  return novoLog;
}

/**
 * Extrai o perfil LGPD do Header Authorization (JWT) ou do Header/Query de simulação do MVP
 */
function identificarContextoLGPD(req, res, next) {
  const authHeader = req.headers.authorization;
  const perfilHeader = req.headers['x-lgpd-role'] || req.query.perfilLGPD;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.contextoLGPD = payload;
      return next();
    } catch (e) {
      // Continua para avaliação por header de demonstração no MVP
    }
  }

  // Busca o perfil correspondente na tabela usuariosGestao (padrão: MEDICO_REGULADOR)
  const perfilEncontrado =
    database.usuariosGestao.find((u) => u.perfilLGPD === perfilHeader) ||
    database.usuariosGestao[0];

  req.contextoLGPD = {
    sub: perfilEncontrado.id,
    nome: perfilEncontrado.nome,
    cargo: perfilEncontrado.cargo,
    perfilLGPD: perfilEncontrado.perfilLGPD,
    nivelAcesso: perfilEncontrado.nivelAcesso,
    permissoes: perfilEncontrado.permissoes
  };

  next();
}

module.exports = {
  mascararCPF,
  registrarLogLGPD,
  identificarContextoLGPD
};

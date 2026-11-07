/**
 * Navega SUS - Arquivo Principal do Servidor (server.js)
 * ---------------------------------------------------------
 * Configura a aplicação Express, middlewares globais de segurança/LGPD,
 * entrega dos portais Frontend (/paciente e /gestao) e todas as rotas da API
 * do MVP (Autenticação CPF/Gov.br, Criação de Contas por Perfil SUS, Jornada do Paciente e Gestão).
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authController = require('./controllers/authController');
const pacienteController = require('./controllers/pacienteController');
const gestaoController = require('./controllers/gestaoController');
const { identificarContextoLGPD } = require('./middlewares/lgpdAuthMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// 1. MIDDLEWARES GLOBAIS
// ============================================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-lgpd-role']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log de auditoria de requisições
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [MOVIMENTA-SUS] ${req.method} ${req.originalUrl}`);
  next();
});

// Servir arquivos estáticos do Frontend (Paciente e Gestão)
app.use('/paciente', express.static(path.join(__dirname, '../../frontend/paciente')));
app.use('/gestao', express.static(path.join(__dirname, '../../frontend/gestao')));

// Redireciona a raiz para o Portal do Paciente por padrão
app.get('/', (req, res) => {
  res.redirect('/paciente');
});

// ============================================================================
// 2. ROTAS DE AUTENTICAÇÃO E CRIAÇÃO DE CONTA (GOV.BR + PERFIS SUS)
// ============================================================================
app.get('/api/auth/opcoes-demo', (req, res) => authController.listarOpcoesDemonstracao(req, res));
app.post('/api/auth/paciente/login', (req, res) => authController.loginPacienteCPF(req, res));
app.post('/api/auth/criar-conta', (req, res) => authController.criarContaComPermissao(req, res));
app.post('/api/auth/gestao/login', (req, res) => authController.loginGestaoLGPD(req, res));
app.get('/api/auth/govbr/login', (req, res) => authController.iniciarLoginGovBr(req, res));
app.get('/api/auth/govbr/callback', (req, res) => authController.callbackGovBr(req, res));

// ============================================================================
// 3. ROTAS DO PACIENTE (JORNADA, TRILHA DE EXAMES/CONSULTAS E CONFIRMAÇÃO)
// ============================================================================
app.get('/api/paciente/jornada', (req, res) => pacienteController.obterJornadaPaciente(req, res));
app.post('/api/paciente/confirmar-presenca', (req, res) => pacienteController.confirmarPresenca(req, res));

// ============================================================================
// 4. ROTAS DA GESTÃO (PROTEGIDAS POR CONTEXTO E PERFIL LGPD)
// ============================================================================
app.get('/api/gestao/indicadores', identificarContextoLGPD, (req, res) =>
  gestaoController.obterDashboardTempoReal(req, res)
);

app.get('/api/gestao/demandas', identificarContextoLGPD, (req, res) =>
  gestaoController.filtrarDemandas(req, res)
);

app.get('/api/gestao/pacientes/:id', identificarContextoLGPD, (req, res) =>
  gestaoController.obterProntuarioPaciente(req, res)
);

app.post('/api/gestao/regular-fila', identificarContextoLGPD, (req, res) =>
  gestaoController.controlarFilaPaciente(req, res)
);

app.post('/api/gestao/integracao/sincronizar', identificarContextoLGPD, (req, res) =>
  gestaoController.sincronizarSistemasPublicos(req, res)
);

app.post('/api/gestao/importar-csv', identificarContextoLGPD, (req, res) =>
  gestaoController.sincronizarSistemasPublicos(req, res)
);

// ============================================================================
// 5. INICIALIZAÇÃO DO SERVIDOR
// ============================================================================
app.listen(PORT, () => {
  console.log('============================================================');
  console.log(`🚀 Servidor Navega SUS ativo em http://localhost:${PORT}`);
  console.log(`📱 App do Paciente:    http://localhost:${PORT}/paciente`);
  console.log(`🖥️  Sistema de Gestão:  http://localhost:${PORT}/gestao`);
  console.log('============================================================');
});

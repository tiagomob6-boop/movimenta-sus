/**
 * Navega SUS - Controller de Autenticação e Criação de Contas (controllers/authController.js)
 * ----------------------------------------------------------------------------------------------
 * Gerencia:
 * 1. Login do Paciente com CPF e Gov.br (OpenID Connect);
 * 2. Criação de Conta (Cadastro) com definição automática de permissões para:
 *    - PACIENTE (Cidadão via Gov.br)
 *    - ESUS_APS (Atenção Primária / UBS)
 *    - SISREG_III (Central de Regulação de Filas)
 *    - RNDS (Rede Nacional de Dados em Saúde / Exames e Laudos)
 *    - CADSUS (Gestão Cadastral CNS & Auditoria BI)
 */

const jwt = require('jsonwebtoken');
const database = require('../models/database');
const govbrService = require('../services/govbrService');
const jornadaService = require('../services/jornadaService');
const { registrarLogLGPD, mascararCPF } = require('../middlewares/lgpdAuthMiddleware');

const JWT_SECRET = process.env.JWT_SECRET || 'chave_temporaria_desenvolvimento';

class AuthController {
  /**
   * 1. Login do Paciente com CPF ou Conta Gov.br
   */
  async loginPacienteCPF(req, res) {
    try {
      const { cpf, metodo = 'GOVBR_OIDC' } = req.body;

      const paciente = jornadaService.buscarPacientePorCPF(cpf);
      if (!paciente) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'CPF não localizado. Você pode criar uma conta gratuita na aba "Criar Conta" ou usar um CPF demonstrativo.'
        });
      }

      const catalogoPaciente = database.perfisPermissoesCatalogo.PACIENTE;

      const token = jwt.sign(
        {
          sub: paciente.cpf,
          pacienteId: paciente.id,
          nome: paciente.nome,
          cns: paciente.cns,
          nivelGovBr: paciente.nivelGovBr,
          perfil: 'PACIENTE',
          permissoes: catalogoPaciente.permissoes
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      registrarLogLGPD({
        operador: `${paciente.nome} (Titular via gov.br)`,
        perfilLGPD: 'PACIENTE',
        acao: `LOGIN_PACIENTE_${metodo}`,
        alvo: `Prontuário Próprio (${mascararCPF(paciente.cpf)})`,
        justificativaLegal: catalogoPaciente.baseLegalLGPD,
        ip: req.ip
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: `Autenticação realizada com sucesso via ${metodo}.`,
        token,
        perfilPermissoes: catalogoPaciente,
        paciente
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao autenticar paciente.',
        detalhe: error.message
      });
    }
  }

  /**
   * 2. CRIAÇÃO DE CONTA COM PERMISSÕES ESPECÍFICAS:
   * Suporta criar conta para: PACIENTE, ESUS_APS, SISREG_III, RNDS e CADSUS
   */
  async criarContaComPermissao(req, res) {
    try {
      const {
        tipoConta = 'PACIENTE', // PACIENTE | ESUS_APS | SISREG_III | RNDS | CADSUS
        nome,
        cpf,
        cnsOuMatricula,
        unidadeOuUbs,
        telefone,
        nivelGovBr = 'Prata'
      } = req.body;

      if (!nome || !cpf) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Nome completo e CPF (validado pelo gov.br) são obrigatórios para criar a conta.'
        });
      }

      const regraPerfil =
        database.perfisPermissoesCatalogo[tipoConta] ||
        database.perfisPermissoesCatalogo.PACIENTE;

      // CASO A: Criação de Conta de PACIENTE (Cidadão)
      if (tipoConta === 'PACIENTE') {
        let pacienteExistente = jornadaService.buscarPacientePorCPF(cpf);

        if (!pacienteExistente || pacienteExistente.cpf !== cpf) {
          const novoId = `PAC-00${database.pacientes.length + 1}`;
          const cnsGerado =
            cnsOuMatricula ||
            `709.${Math.floor(1000 + Math.random() * 8999)}.${Math.floor(1000 + Math.random() * 8999)}.0012`;

          pacienteExistente = {
            id: novoId,
            cpf,
            cns: cnsGerado,
            nome,
            dataNascimento: '1985-06-15',
            idade: 41,
            sexo: 'N/I',
            telefone: telefone || '(11) 99999-0000',
            ubsReferencia: unidadeOuUbs || 'UBS Jardim Esperança',
            equipeESF: 'Equipe 01 - Vínculo Gov.br',
            nivelGovBr,
            classificacaoGeral: 'VERDE',
            maiorTempoEsperaDias: 5,
            possuiExameParado: false,
            metricasPaciente: {
              aderenciaConsultas: 100,
              examesConcluidos: 1,
              examesPendentes: 1,
              economiaTempoEstimadaDias: 4
            },
            trilha: [
              {
                id: `TR-${Date.now()}-1`,
                protocolo: `ESUS-2026-${Math.floor(10000 + Math.random() * 89999)}`,
                tipo: 'CONSULTA',
                titulo: 'Consulta de Acolhimento Inicial (Atenção Primária)',
                especialidade: 'Clínica Médica (e-SUS APS)',
                dataSolicitacao: '2026-11-02',
                dataAgendada: '2026-11-14',
                horario: '09:00',
                local: unidadeOuUbs || 'UBS Jardim Esperança',
                profissional: 'Equipe Saúde da Família (e-SUS)',
                classificacaoRisco: 'VERDE',
                diasEspera: 5,
                diasSemAndamento: 0,
                posicaoFila: 2,
                status: 'AGENDADO',
                confirmadoPaciente: false,
                observacao: 'Conta criada via Gov.br e vinculada automaticamente ao prontuário e-SUS APS.',
                resultadoExame: null
              },
              {
                id: `TR-${Date.now()}-2`,
                protocolo: `RNDS-2026-${Math.floor(10000 + Math.random() * 89999)}`,
                tipo: 'EXAME',
                titulo: 'Check-up Laboratorial Preventivo (Hemograma + Glicemia)',
                especialidade: 'Patologia Clínica (RNDS)',
                dataSolicitacao: '2026-11-02',
                dataAgendada: '2026-11-05',
                horario: '07:30',
                local: 'Laboratório Municipal SUS',
                profissional: 'Rede Nacional de Dados em Saúde (RNDS)',
                classificacaoRisco: 'VERDE',
                diasEspera: 3,
                diasSemAndamento: 0,
                posicaoFila: null,
                status: 'CONCLUIDO',
                observacao: 'Exame preventivo sincronizado automaticamente via RNDS.',
                resultadoExame: {
                  codigoLaudo: `LAUDO-RNDS-${Math.floor(1000 + Math.random() * 8999)}`,
                  dataLiberacao: new Date().toLocaleString('pt-BR'),
                  statusClinico: 'NORMAL',
                  resumo: 'Hemoglobina: 14.2 g/dL | Leucócitos: 6.400 /mm³ | Glicemia de Jejum: 88 mg/dL.',
                  conclusaoMedica: 'Parâmetros laboratoriais dentro dos limites de normalidade.',
                  assinaturaDigital: 'ICP-Brasil • Barramento RNDS / ConecteSUS'
                }
              }
            ],
            notificacoes: [
              {
                id: Date.now(),
                titulo: 'Conta Criada e Vinculada ao gov.br!',
                mensagem: `Bem-vindo(a), ${nome}! Seu CPF e Cartão SUS (${cnsGerado}) já estão sincronizados com o e-SUS, SISREG e RNDS.`,
                tempoAtras: 'Agora mesmo',
                lida: false,
                tipo: 'sucesso'
              }
            ]
          };

          database.pacientes.unshift(pacienteExistente);
        }

        const token = jwt.sign(
          {
            sub: pacienteExistente.cpf,
            pacienteId: pacienteExistente.id,
            nome: pacienteExistente.nome,
            perfil: 'PACIENTE',
            permissoes: regraPerfil.permissoes
          },
          JWT_SECRET,
          { expiresIn: '8h' }
        );

        registrarLogLGPD({
          operador: `${nome} (Novo Cadastro gov.br)`,
          perfilLGPD: 'PACIENTE',
          acao: 'CRIACAO_CONTA_PACIENTE_GOVBR',
          alvo: `CPF: ${mascararCPF(cpf)} • CNS: ${pacienteExistente.cns}`,
          justificativaLegal: regraPerfil.baseLegalLGPD,
          ip: req.ip
        });

        return res.status(201).json({
          sucesso: true,
          mensagem: `Conta de Paciente criada com sucesso via gov.br (${nivelGovBr})!`,
          tipoConta: 'PACIENTE',
          destino: 'PORTAL_PACIENTE',
          token,
          regraPerfil,
          contaCriada: pacienteExistente
        });
      }

      // CASO B: Criação de Conta para Operadores/Sistemas Públicos (ESUS_APS, SISREG_III, RNDS, CADSUS)
      const novaContaGestao = {
        id: `GEST-${tipoConta}-${Date.now().toString().slice(-3)}`,
        usuario: `${tipoConta.toLowerCase()}.${nome.split(' ')[0].toLowerCase()}`,
        cpf,
        cnsOuMatricula: cnsOuMatricula || `MAT-${tipoConta}-2026`,
        nome,
        cargo: `${regraPerfil.titulo}`,
        unidade: unidadeOuUbs || regraPerfil.sistemaOrigem,
        perfilLGPD: tipoConta,
        nivelGovBr,
        nivelAcesso: regraPerfil.nivelAcesso,
        permissoes: regraPerfil.permissoes
      };

      // Atualiza ou insere na lista de operadores da gestão
      const idxExistente = database.usuariosGestao.findIndex((u) => u.perfilLGPD === tipoConta);
      if (idxExistente >= 0) {
        database.usuariosGestao[idxExistente] = novaContaGestao;
      } else {
        database.usuariosGestao.push(novaContaGestao);
      }

      const token = jwt.sign(
        {
          sub: novaContaGestao.id,
          nome: novaContaGestao.nome,
          cargo: novaContaGestao.cargo,
          perfilLGPD: novaContaGestao.perfilLGPD,
          nivelAcesso: novaContaGestao.nivelAcesso,
          permissoes: novaContaGestao.permissoes
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      registrarLogLGPD({
        operador: `${novaContaGestao.nome} (${tipoConta})`,
        perfilLGPD: tipoConta,
        acao: `CRIACAO_CONTA_OPERADOR_${tipoConta}`,
        alvo: `Unidade: ${novaContaGestao.unidade} • Permissões: ${regraPerfil.permissoes.join(', ')}`,
        justificativaLegal: regraPerfil.baseLegalLGPD,
        ip: req.ip
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: `Conta institucional [${regraPerfil.titulo}] criada com sucesso com permissões LGPD ativas!`,
        tipoConta,
        destino: 'PAINEL_GESTAO',
        token,
        regraPerfil,
        contaCriada: novaContaGestao
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao criar conta.',
        detalhe: error.message
      });
    }
  }

  /**
   * 3. Login de Gestores com Diferentes Perfis (e-SUS APS, SISREG III, RNDS, CADSUS)
   */
  async loginGestaoLGPD(req, res) {
    try {
      const { perfilLGPD = 'SISREG_III' } = req.body;

      const usuarioGestor =
        database.usuariosGestao.find((u) => u.perfilLGPD === perfilLGPD) ||
        database.usuariosGestao[0];

      const regraPerfil =
        database.perfisPermissoesCatalogo[usuarioGestor.perfilLGPD] ||
        database.perfisPermissoesCatalogo.SISREG_III;

      const token = jwt.sign(
        {
          sub: usuarioGestor.id,
          nome: usuarioGestor.nome,
          cargo: usuarioGestor.cargo,
          perfilLGPD: usuarioGestor.perfilLGPD,
          nivelAcesso: usuarioGestor.nivelAcesso,
          permissoes: usuarioGestor.permissoes
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      registrarLogLGPD({
        operador: usuarioGestor.nome,
        perfilLGPD: usuarioGestor.perfilLGPD,
        acao: 'LOGIN_SISTEMA_GESTAO',
        alvo: `Sessão Iniciada - Nível: ${usuarioGestor.nivelAcesso}`,
        justificativaLegal: regraPerfil.baseLegalLGPD,
        ip: req.ip
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: `Sessão iniciada como ${usuarioGestor.nome} (${usuarioGestor.perfilLGPD}).`,
        token,
        gestor: usuarioGestor,
        regraPerfil
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao realizar login na gestão.',
        detalhe: error.message
      });
    }
  }

  /**
   * 4. Lista o catálogo completo de perfis (e-SUS APS, SISREG III, RNDS, CADSUS e PACIENTE)
   * e suas respectivas permissões para exibição na tela de Criação de Conta
   */
  listarOpcoesDemonstracao(req, res) {
    const pacientesDemo = database.pacientes.map((p) => ({
      id: p.id,
      nome: p.nome,
      cpf: p.cpf,
      cns: p.cns,
      classificacaoGeral: p.classificacaoGeral,
      ubsReferencia: p.ubsReferencia
    }));

    return res.status(200).json({
      sucesso: true,
      catalogoPerfis: database.perfisPermissoesCatalogo,
      pacientesDemo,
      perfisGestaoLGPD: database.usuariosGestao
    });
  }

  async iniciarLoginGovBr(req, res) {
    try {
      const dadosUrl = await govbrService.gerarUrlLogin();
      return res.status(200).json({
        sucesso: true,
        ...dadosUrl
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao gerar URL do Gov.br.'
      });
    }
  }

  async callbackGovBr(req, res) {
    try {
      const { code = 'simulacao_govbr', state, cpf } = req.query;
      const dadosCidadao = await govbrService.processarCallback(code, state);
      const paciente =
        jornadaService.buscarPacientePorCPF(cpf || dadosCidadao.cpf) || database.pacientes[0];

      const token = jwt.sign(
        {
          sub: paciente.cpf,
          pacienteId: paciente.id,
          nome: paciente.nome,
          nivelConfiabilidade: dadosCidadao.nivelConfiabilidade,
          perfil: 'PACIENTE'
        },
        JWT_SECRET,
        { expiresIn: '4h' }
      );

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Autenticação via Gov.br concluída com sucesso.',
        token,
        usuarioGovBr: dadosCidadao,
        paciente
      });
    } catch (error) {
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Falha ao validar callback Gov.br.',
        detalhe: error.message
      });
    }
  }
}

module.exports = new AuthController();

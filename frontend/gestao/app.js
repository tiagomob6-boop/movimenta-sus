/**
 * Navega SUS - Script Corporativo do Sistema de Gestão (frontend/gestao/app.js)
 * ---------------------------------------------------------------------------------
 * - BLOQUEIO PRÉ-AUTENTICAÇÃO OBRIGATÓRIO:
 *   Antes de entrar no sistema, é obrigatório passar pelas telas de Login (gov.br / Credencial SUS)
 *   ou Criação de Conta (e-SUS APS, SISREG III, RNDS, CADSUS e Paciente).
 *   Enquanto não autenticar, `body` permanece sem a classe `.authenticated` e o sistema fica oculto.
 * - CADA PARTE DO SISTEMA EM UMA ABA SEPARADA (8 Abas).
 */

const API_BASE = 'http://localhost:3000/api';

const CATALOGO_PERFIS_GESTAO = {
  SISREG_III: {
    codigo: 'SISREG_III',
    titulo: 'SISREG III (Central de Regulação Médica)',
    cor: '#0B4C8C',
    verCpfCompleto: true,
    verLaudoExame: true,
    controlarFila: true,
    liberarLaudoRNDS: false,
    resumoBanner:
      '🛡️ <strong>Conta Ativa: SISREG III (Central de Regulação)</strong> — Permissão Total (Art. 11, II, f LGPD): Visualiza CPF, trilha, exames e controla/agenda vagas nas filas.',
    permissoesLista: [
      '✓ Controlar filas de espera por especialidade e destravar vagas',
      '✓ Reclassificar prioridade clínica (Vermelho, Laranja, Amarelo, Verde)',
      '✓ Visualizar CPF completo, trilha e laudos de exames dos pacientes'
    ],
    restricoesLista: [
      '🔒 Emissão técnica de laudo laboratorial cabe ao perfil RNDS',
      '🔒 Todos os acessos são registrados na Trilha de Auditoria LGPD'
    ]
  },
  RNDS: {
    codigo: 'RNDS',
    titulo: 'RNDS (Rede Nacional de Dados em Saúde / Exames)',
    cor: '#7C4DFF',
    verCpfCompleto: true,
    verLaudoExame: true,
    controlarFila: true,
    liberarLaudoRNDS: true,
    resumoBanner:
      '🔬 <strong>Conta Ativa: RNDS (Rede Nacional de Dados / Diagnóstico)</strong> — Permissão Diagnóstica (Art. 11, II, f LGPD): Acesso total aos exames e emissão/liberação de laudos ICP-Brasil.',
    permissoesLista: [
      '✓ Acesso total aos exames e histórico diagnóstico dos pacientes',
      '✓ Emitir e liberar laudos de exames assinados digitalmente na RNDS',
      '✓ Resolver alertas de exames retidos/sem andamento'
    ],
    restricoesLista: [
      '🔒 Escopo voltado a exames diagnósticos e interoperabilidade HL7 FHIR'
    ]
  },
  ESUS_APS: {
    codigo: 'ESUS_APS',
    titulo: 'e-SUS APS (Atenção Primária / PEC UBS)',
    cor: '#00A4E4',
    verCpfCompleto: true,
    verLaudoExame: false,
    controlarFila: false,
    liberarLaudoRNDS: false,
    resumoBanner:
      '🏥 <strong>Conta Ativa: e-SUS APS (Atenção Primária / UBS)</strong> — Permissão de Triagem UBS: Visualiza CPF e acompanha a trilha, mas NÃO altera cotas do SISREG III nem acessa laudos sigilosos da RNDS.',
    permissoesLista: [
      '✓ Visualizar CPF/CNS e acompanhar a trilha dos pacientes da UBS',
      '✓ Sincronizar fichas do Prontuário Eletrônico do Cidadão (PEC)',
      '✓ Orientar o paciente sobre datas e horários agendados'
    ],
    restricoesLista: [
      '🔒 Bloqueado: Não pode destravar/agendar vagas de alta complexidade (Exclusivo SISREG III)',
      '🔒 Bloqueado: Não visualiza nem emite laudos sigilosos de exames (Exclusivo RNDS / Médico Regulador)'
    ]
  },
  CADSUS: {
    codigo: 'CADSUS',
    titulo: 'CADSUS (Gestão Cadastral CNS & Auditoria BI)',
    cor: '#D97706',
    verCpfCompleto: false,
    verLaudoExame: false,
    controlarFila: false,
    liberarLaudoRNDS: false,
    resumoBanner:
      '🔒 <strong>Conta Ativa: CADSUS (Cadastro CNS & Auditoria BI)</strong> — Permissão Estatística (Art. 11, II, c LGPD): CPFs pseudonimizados (`***.XXX.XXX-**`), laudos ocultados e foco em indicadores/CNS.',
    permissoesLista: [
      '✓ Validar e sincronizar Cartão Nacional de Saúde (CNS) e vínculo gov.br',
      '✓ Auditar o Painel de Indicadores em Tempo Real e Logs da LGPD'
    ],
    restricoesLista: [
      '🔒 CPFs mascarados automaticamente nas listagens (***.XXX.XXX-**)',
      '🔒 Bloqueado acesso aos laudos de exames e alteração de fila clínica'
    ]
  },
  PACIENTE: {
    codigo: 'PACIENTE',
    titulo: 'Paciente / Cidadão (Conta gov.br)',
    cor: '#4BB543',
    verCpfCompleto: false,
    verLaudoExame: false,
    controlarFila: false,
    liberarLaudoRNDS: false,
    resumoBanner: '📱 Redirecionando para o App do Paciente...',
    permissoesLista: [
      '✓ Visualizar exclusivamente sua própria trilha de consultas, exames e fila',
      '✓ Abrir seus próprios laudos de exames e confirmar presença em consultas'
    ],
    restricoesLista: [
      '🔒 Sem acesso ao Painel Corporativo da Gestão (redirecionado ao Portal do Cidadão)'
    ]
  }
};

let estadoGestao = {
  autenticado: false,
  abaAtiva: 'tabPainelTempoReal',
  perfilLGPD: 'SISREG_III',
  dashboard: null,
  demandasFiltradas: [],
  pacienteSelecionadoId: 'PAC-001'
};

// Base local de contingência
const FALLBACK_DB = {
  pacientes: [
    {
      id: 'PAC-001',
      cpf: '123.456.789-00',
      cns: '700.4589.1234.8901',
      nome: 'Maria Aparecida Silva',
      idade: 58,
      ubsReferencia: 'UBS Jardim Esperança',
      classificacaoGeral: 'AMARELO',
      maiorTempoEsperaDias: 47,
      trilha: [
        {
          id: 'TR-101',
          protocolo: 'SISREG-2026-88120',
          tipo: 'CONSULTA',
          titulo: 'Acolhimento e Clínico Geral',
          especialidade: 'Clínica Médica (APS)',
          dataSolicitacao: '2026-09-10',
          dataAgendada: '2026-09-14',
          horario: '08:00',
          local: 'UBS Jardim Esperança',
          profissional: 'Dr. Roberto Almeida',
          classificacaoRisco: 'VERDE',
          diasEspera: 4,
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'Solicitado ECG, Hemograma e encaminhamento para Cardiologia.',
          resultadoExame: null
        },
        {
          id: 'TR-102',
          protocolo: 'EXM-2026-88401',
          tipo: 'EXAME',
          titulo: 'Hemograma Completo + Perfil Lipídico',
          especialidade: 'Patologia Clínica / Laboratório',
          dataSolicitacao: '2026-09-14',
          dataAgendada: '2026-09-22',
          horario: '07:15',
          local: 'Laboratório Central Municipal',
          profissional: 'Dra. Helena Castro',
          classificacaoRisco: 'VERDE',
          diasEspera: 8,
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'Resultado integrado via RNDS.',
          resultadoExame: {
            codigoLaudo: 'LAUDO-HEM-9921',
            dataLiberacao: '25/09/2026 14:20',
            statusClinico: 'ALTERADO_LEVE',
            resumo: 'Hemoglobina: 13.4 g/dL | Colesterol Total: 238 mg/dL | LDL: 154 mg/dL | Glicemia: 96 mg/dL.',
            conclusaoMedica: 'Dislipidemia mista leve. Correlacionar na consulta cardiológica.',
            assinaturaDigital: 'ICP-Brasil • Dra. Helena Castro'
          }
        },
        {
          id: 'TR-103',
          protocolo: 'EXM-2026-89114',
          tipo: 'EXAME',
          titulo: 'Ecocardiograma Transtorácico com Doppler',
          especialidade: 'Cardiologia Diagnóstica',
          dataSolicitacao: '2026-09-21',
          dataAgendada: null,
          horario: 'A definir',
          local: 'AME Centro de Especialidades',
          profissional: 'Fila de Regulação',
          classificacaoRisco: 'AMARELO',
          diasEspera: 47,
          diasSemAndamento: 26,
          posicaoFila: 9,
          status: 'PARADO_SEM_ANDAMENTO',
          observacao: 'Aguardando liberação de agenda do prestador há 26 dias sem movimentação.',
          resultadoExame: null
        },
        {
          id: 'TR-104',
          protocolo: 'CON-2026-90452',
          tipo: 'CONSULTA',
          titulo: 'Consulta Especializada em Cardiologia',
          especialidade: 'Cardiologia',
          dataSolicitacao: '2026-10-05',
          dataAgendada: '2026-11-12',
          horario: '08:30',
          local: 'Policlínica Municipal - Sala 14',
          profissional: 'Dra. Patrícia Fontes',
          classificacaoRisco: 'AMARELO',
          diasEspera: 33,
          diasSemAndamento: 2,
          posicaoFila: 1,
          status: 'AGENDADO',
          observacao: 'Vaga liberada pela regulação.',
          resultadoExame: null
        }
      ]
    },
    {
      id: 'PAC-002',
      cpf: '987.654.321-11',
      cns: '702.9912.4410.3312',
      nome: 'João Batista Oliveira',
      idade: 72,
      ubsReferencia: 'UBS Vila Nova',
      classificacaoGeral: 'VERMELHO',
      maiorTempoEsperaDias: 94,
      trilha: [
        {
          id: 'TR-201',
          protocolo: 'EXM-2026-61022',
          tipo: 'EXAME',
          titulo: 'PSA Total e Livre + USG de Próstata',
          especialidade: 'Urologia / Diagnóstico',
          dataSolicitacao: '2026-07-10',
          dataAgendada: '2026-07-18',
          horario: '09:00',
          local: 'Centro Diagnóstico Municipal',
          profissional: 'Dr. Marcelo Tavares',
          classificacaoRisco: 'LARANJA',
          diasEspera: 8,
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'PSA elevado (11.8 ng/mL).',
          resultadoExame: {
            codigoLaudo: 'LAUDO-URO-4410',
            dataLiberacao: '21/07/2026 10:15',
            statusClinico: 'CRITICO',
            resumo: 'PSA Total: 11.8 ng/mL (Ref < 4.0) | Relação Livre/Total: 9% | Próstata 68g heterogênea.',
            conclusaoMedica: 'Suspeita oncológica. Indicação de Ressonância Multiparamétrica e Biópsia prioritária (Lei dos 30/60 dias).',
            assinaturaDigital: 'ICP-Brasil • Dr. Marcelo Tavares'
          }
        },
        {
          id: 'TR-202',
          protocolo: 'EXM-2026-70119',
          tipo: 'EXAME',
          titulo: 'Ressonância Magnética Multiparamétrica da Pelve',
          especialidade: 'Urologia / Radiologia',
          dataSolicitacao: '2026-08-05',
          dataAgendada: null,
          horario: 'Pendente Regulação Alta Complexidade',
          local: 'Hospital Regional de Referência',
          profissional: 'Regulação CROSS/SISREG',
          classificacaoRisco: 'VERMELHO',
          diasEspera: 94,
          diasSemAndamento: 38,
          posicaoFila: 2,
          status: 'ATRASADO',
          observacao: 'CRÍTICO: Paciente idoso (72a) aguardando há 94 dias (38 dias sem andamento).',
          resultadoExame: null
        }
      ]
    },
    {
      id: 'PAC-003',
      cpf: '456.789.123-22',
      cns: '704.1120.8841.0029',
      nome: 'Francisca Santos Souza',
      idade: 47,
      ubsReferencia: 'UBS Parque das Árvores',
      classificacaoGeral: 'LARANJA',
      maiorTempoEsperaDias: 68,
      trilha: [
        {
          id: 'TR-301',
          protocolo: 'EXM-2026-79012',
          tipo: 'EXAME',
          titulo: 'Ressonância Magnética de Coluna Lombar',
          especialidade: 'Ortopedia / Neurocirurgia',
          dataSolicitacao: '2026-08-31',
          dataAgendada: null,
          horario: 'Aguardando vaga',
          local: 'Centro de Imagem Conveniado',
          profissional: 'Fila de Alta Complexidade',
          classificacaoRisco: 'LARANJA',
          diasEspera: 68,
          diasSemAndamento: 31,
          posicaoFila: 5,
          status: 'PARADO_SEM_ANDAMENTO',
          observacao: 'Hérnia discal extrusa com radiculopatia aguda. Sem movimentação há 31 dias.',
          resultadoExame: null
        }
      ]
    },
    {
      id: 'PAC-004',
      cpf: '321.654.987-33',
      cns: '706.5541.9980.1123',
      nome: 'Pedro Henrique Costa',
      idade: 65,
      ubsReferencia: 'UBS Centro Histórico',
      classificacaoGeral: 'LARANJA',
      maiorTempoEsperaDias: 52,
      trilha: [
        {
          id: 'TR-401',
          protocolo: 'EXM-2026-84500',
          tipo: 'EXAME',
          titulo: 'Mapeamento de Retina + Tonometria Bilateral',
          especialidade: 'Oftalmologia',
          dataSolicitacao: '2026-09-16',
          dataAgendada: '2026-10-08',
          horario: '10:30',
          local: 'Instituto Municipal da Visão',
          profissional: 'Dra. Camila Nogueira',
          classificacaoRisco: 'LARANJA',
          diasEspera: 22,
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'Catarata nuclear bilateral diagnosticada.',
          resultadoExame: {
            codigoLaudo: 'LAUDO-OFT-7712',
            dataLiberacao: '09/10/2026 16:40',
            statusClinico: 'INDICACAO_CIRURGICA',
            resumo: 'Acuidade Visual OD 20/80 | OE 20/60. Opacificação cristaliniana +3/+4 em OD.',
            conclusaoMedica: 'Indicada Facoemulsificação com implante de LIO.',
            assinaturaDigital: 'ICP-Brasil • Dra. Camila Nogueira'
          }
        },
        {
          id: 'TR-402',
          protocolo: 'PROC-2026-85900',
          tipo: 'PROCEDIMENTO',
          titulo: 'Cirurgia de Catarata (Facoemulsificação com LIO)',
          especialidade: 'Oftalmologia',
          dataSolicitacao: '2026-09-16',
          dataAgendada: '2026-11-21',
          horario: '07:00',
          local: 'Hospital Dia SUS',
          profissional: 'Equipe Cirúrgica Oftalmológica',
          classificacaoRisco: 'LARANJA',
          diasEspera: 52,
          diasSemAndamento: 0,
          posicaoFila: 3,
          status: 'AGENDADO',
          observacao: 'Agendado no Mutirão Municipal.',
          resultadoExame: null
        }
      ]
    }
  ],
  filasPorEspecialidade: [
    {
      id: 'FILA-CARD',
      especialidade: 'Cardiologia',
      cor: '#0B4C8C',
      percentualDemanda: 35,
      totalPacientesFila: 5187,
      capacidadeMensalVagas: 1850,
      tempoMedioEsperaDias: 28,
      examesSemAndamento: 142,
      taxaSucessoExames: 89.4,
      nivelCriticidade: 'CRITICO',
      medicoResponsavel: 'Dr. Carlos Eduardo Mendes'
    },
    {
      id: 'FILA-ORTO',
      especialidade: 'Ortopedia e Traumatologia',
      cor: '#00A4E4',
      percentualDemanda: 25,
      totalPacientesFila: 3705,
      capacidadeMensalVagas: 1500,
      tempoMedioEsperaDias: 24,
      examesSemAndamento: 98,
      taxaSucessoExames: 91.2,
      nivelCriticidade: 'ATENCAO',
      medicoResponsavel: 'Dr. Marcos Vinícius Antunes'
    },
    {
      id: 'FILA-OFTA',
      especialidade: 'Oftalmologia',
      cor: '#4BB543',
      percentualDemanda: 22,
      totalPacientesFila: 3260,
      capacidadeMensalVagas: 2400,
      tempoMedioEsperaDias: 14,
      examesSemAndamento: 31,
      taxaSucessoExames: 96.8,
      nivelCriticidade: 'NORMAL',
      medicoResponsavel: 'Dra. Camila Nogueira'
    },
    {
      id: 'FILA-URO',
      especialidade: 'Urologia / Oncologia',
      cor: '#E11D48',
      percentualDemanda: 10,
      totalPacientesFila: 1480,
      capacidadeMensalVagas: 620,
      tempoMedioEsperaDias: 31,
      examesSemAndamento: 64,
      taxaSucessoExames: 87.5,
      nivelCriticidade: 'CRITICO',
      medicoResponsavel: 'Dr. Henrique Paiva'
    },
    {
      id: 'FILA-DERM',
      especialidade: 'Dermatologia',
      cor: '#7C4DFF',
      percentualDemanda: 8,
      totalPacientesFila: 1188,
      capacidadeMensalVagas: 950,
      tempoMedioEsperaDias: 11,
      examesSemAndamento: 19,
      taxaSucessoExames: 95.1,
      nivelCriticidade: 'NORMAL',
      medicoResponsavel: 'Dra. Sofia Alencar'
    }
  ],
  integracoesPublicas: [
    {
      id: 'INT-ESUS',
      sigla: 'e-SUS APS (PEC)',
      nome: 'Prontuário Eletrônico do Cidadão - Atenção Primária',
      protocolo: 'HL7 FHIR R4 / Thrift',
      status: 'CONECTADO',
      ultimaSincronizacao: 'Há 2 minutos',
      registrosSincronizadosHoje: 4820,
      latenciaMs: 118
    },
    {
      id: 'INT-SISREG',
      sigla: 'SISREG III / DATASUS',
      nome: 'Sistema Nacional de Regulação (Filas e Cotas)',
      protocolo: 'REST API / Carga CSV Automatizada',
      status: 'CONECTADO',
      ultimaSincronizacao: 'Há 5 minutos',
      registrosSincronizadosHoje: 1940,
      latenciaMs: 210
    },
    {
      id: 'INT-RNDS',
      sigla: 'RNDS / ConecteSUS',
      nome: 'Rede Nacional de Dados em Saúde (Laudos e Exames)',
      protocolo: 'HL7 FHIR Certificado ICP-Brasil',
      status: 'CONECTADO',
      ultimaSincronizacao: 'Em tempo real',
      registrosSincronizadosHoje: 3150,
      latenciaMs: 94
    },
    {
      id: 'INT-CADSUS',
      sigla: 'CADSUS Web / Gov.br',
      nome: 'Base Nacional de Cartão Nacional de Saúde e CPF',
      protocolo: 'SOAP / OIDC Gov.br',
      status: 'CONECTADO',
      ultimaSincronizacao: 'Em tempo real',
      registrosSincronizadosHoje: 8910,
      latenciaMs: 85
    }
  ],
  logsAuditoriaLGPD: [
    {
      id: 'LOG-9001',
      dataHora: '07/11/2026 13:05:12',
      operador: 'Dr. Carlos Eduardo Mendes',
      perfilLGPD: 'SISREG_III',
      acao: 'ACESSO_REGULACAO_FILA',
      alvo: 'João Batista Oliveira (CPF: ***.654.321-**)'
    },
    {
      id: 'LOG-9002',
      dataHora: '07/11/2026 13:10:04',
      operador: 'Dra. Helena Castro',
      perfilLGPD: 'RNDS',
      acao: 'EMISSAO_LAUDO_EXAME_RNDS',
      alvo: 'Maria Aparecida Silva (CPF: ***.456.789-**)'
    }
  ]
};

// ============================================================================
// INICIALIZAÇÃO E BLOQUEIO OBRIGATÓRIO ANTES DO LOGIN
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  iniciarRelogioTempoReal();
  configurarEventosGateAutenticacao();
  configurarEventosGestao();
  renderizarPreviewPermissoesBox('gatePermPreviewBox', 'gateInputTipoConta', 'ESUS_APS');
  renderizarPreviewPermissoesBox('gestaoPermPreviewBox', 'gestaoInputTipoConta', 'SISREG_III');

  // Verifica se o operador acabou de criar conta institucional lá na tela de login do Paciente (?auth=1)
  const params = new URLSearchParams(window.location.search);
  const perfilUrl = params.get('perfil');
  const authRedirect = params.get('auth') === '1';

  if (authRedirect && perfilUrl && CATALOGO_PERFIS_GESTAO[perfilUrl] && perfilUrl !== 'PACIENTE') {
    liberarSistemaGestao(perfilUrl, `Operador ${perfilUrl} (Autenticado via gov.br)`);
  } else {
    // Regra estrita: antes de entrar no sistema precisa ir nas telas de login e criação de conta
    bloquearSistemaGestao();
  }
});

/**
 * Bloqueia completamente a visão do sistema da gestão e exibe apenas o Gate de Login / Criar Conta.
 */
function bloquearSistemaGestao() {
  estadoGestao.autenticado = false;
  sessionStorage.removeItem('movimenta_sus_gestao_autenticado');
  document.body.classList.remove('authenticated');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Libera o sistema da gestão SOMENTE após concluir o Login ou a Criação de Conta.
 */
function liberarSistemaGestao(codigoPerfil, nomeOperador) {
  if (codigoPerfil === 'PACIENTE') {
    window.location.href = '../paciente/index.html';
    return;
  }

  estadoGestao.autenticado = true;
  estadoGestao.perfilLGPD = CATALOGO_PERFIS_GESTAO[codigoPerfil] ? codigoPerfil : 'SISREG_III';
  sessionStorage.setItem('movimenta_sus_gestao_autenticado', 'true');
  localStorage.setItem('movimenta_sus_perfil_ativo_gestao', estadoGestao.perfilLGPD);

  const select = document.getElementById('selectPerfilLGPD');
  if (select) {
    // Se foi informado um operador específico, garante opção selecionada
    const jaExiste = Array.from(select.options).some((opt) => opt.value === estadoGestao.perfilLGPD);
    if (!jaExiste && nomeOperador) {
      const novaOpt = document.createElement('option');
      novaOpt.value = estadoGestao.perfilLGPD;
      novaOpt.textContent = `${estadoGestao.perfilLGPD} • ${nomeOperador}`;
      select.prepend(novaOpt);
    }
    select.value = estadoGestao.perfilLGPD;
  }

  FALLBACK_DB.logsAuditoriaLGPD.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    dataHora: new Date().toLocaleString('pt-BR'),
    operador: nomeOperador || `Operador (${estadoGestao.perfilLGPD})`,
    perfilLGPD: estadoGestao.perfilLGPD,
    acao: 'LOGIN_AUTENTICADO_GOVBR',
    alvo: 'Acesso Liberado ao Painel de Gestão'
  });

  document.body.classList.add('authenticated');
  carregarTudoGestao();
  exibirToast(`🔓 Login confirmado! Sistema liberado com permissão [${estadoGestao.perfilLGPD}].`);
}

/**
 * Configura todos os eventos da tela inicial de Login e Criação de Conta (#gestaoAuthGate)
 */
function configurarEventosGateAutenticacao() {
  const btnTabLogin = document.getElementById('btnGateTabLogin');
  const btnTabCriar = document.getElementById('btnGateTabCriar');
  const paneLogin = document.getElementById('paneGateLogin');
  const paneCriar = document.getElementById('paneGateCriarConta');

  btnTabLogin.addEventListener('click', () => {
    btnTabLogin.classList.add('active');
    btnTabCriar.classList.remove('active');
    paneLogin.style.display = 'block';
    paneCriar.style.display = 'none';
  });

  btnTabCriar.addEventListener('click', () => {
    btnTabCriar.classList.add('active');
    btnTabLogin.classList.remove('active');
    paneCriar.style.display = 'block';
    paneLogin.style.display = 'none';
  });

  // Seletor dos 5 tipos de conta na aba Criar Conta do Gate
  document.querySelectorAll('.gate-role-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gate-role-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderizarPreviewPermissoesBox('gatePermPreviewBox', 'gateInputTipoConta', btn.dataset.gateRole);
    });
  });

  // Máscara de CPF nos campos do Gate
  ['gateLoginCpf', 'gateCpfConta', 'gestaoCpfConta'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      e.target.value = v;
    });
  });

  // Botões rápidos de demonstração (Homologação 1 clique)
  document.querySelectorAll('[data-quick-login]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const perfil = btn.getAttribute('data-quick-login');
      const nome = btn.getAttribute('data-quick-nome');
      liberarSistemaGestao(perfil, nome);
    });
  });

  // Submit do Login no Gate
  document.getElementById('formGateLoginGestao').addEventListener('submit', (e) => {
    e.preventDefault();
    const perfil = document.getElementById('gateLoginPerfil').value;
    const cpf = document.getElementById('gateLoginCpf').value.trim();
    liberarSistemaGestao(perfil, `Operador CPF ${cpf} (gov.br)`);
  });

  // Submit de Criar Conta no Gate
  document.getElementById('formGateCriarConta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipoConta = document.getElementById('gateInputTipoConta').value;
    const nome = document.getElementById('gateNomeConta').value.trim();
    const cpf = document.getElementById('gateCpfConta').value.trim();
    const cnsOuMatricula = document.getElementById('gateCnsConta').value.trim();
    const unidadeOuUbs = document.getElementById('gateUnidadeConta').value.trim();
    const nivelGovBr = document.getElementById('gateNivelGov').value;

    await processarCriacaoDeContaUnificada({
      tipoConta,
      nome,
      cpf,
      cnsOuMatricula,
      unidadeOuUbs,
      nivelGovBr
    });
  });

  // Botão Sair / Bloquear Sistema no Topo
  const btnSair = document.getElementById('btnSairGestao');
  if (btnSair) {
    btnSair.addEventListener('click', () => {
      bloquearSistemaGestao();
      exibirToast('🔒 Sessão encerrada. Faça login ou crie uma conta para acessar o sistema.');
    });
  }
}

/**
 * Cria conta no backend/localStorage e libera o sistema com a permissão escolhida
 */
async function processarCriacaoDeContaUnificada({
  tipoConta,
  nome,
  cpf,
  cnsOuMatricula,
  unidadeOuUbs,
  nivelGovBr
}) {
  try {
    await fetch(`${API_BASE}/auth/criar-conta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipoConta, nome, cpf, cnsOuMatricula, unidadeOuUbs, nivelGovBr })
    });
  } catch (err) {}

  if (tipoConta === 'PACIENTE') {
    const novoPac = {
      id: `PAC-${Date.now().toString().slice(-3)}`,
      nome,
      cpf,
      cns: cnsOuMatricula || '709.4412.8890.0012',
      unidadeReferencia: unidadeOuUbs || 'UBS Jardim Esperança',
      equipeESF: 'Equipe 01 - gov.br',
      nivelGovBr,
      classificacaoGeral: 'VERDE',
      trilha: [
        {
          id: 'TR-N1',
          protocolo: 'ESUS-2026-99102',
          tipo: 'CONSULTA',
          titulo: 'Consulta de Acolhimento Inicial (e-SUS APS)',
          especialidade: 'Clínica Médica',
          dataSolicitacao: '2026-11-07',
          dataAgendada: '2026-11-14',
          horario: '09:00',
          local: unidadeOuUbs || 'UBS Jardim Esperança',
          profissional: 'Equipe Saúde da Família',
          classificacaoRisco: 'VERDE',
          diasEspera: 5,
          posicaoFila: 2,
          status: 'AGENDADO',
          confirmadoPaciente: false,
          observacao: 'Conta criada via gov.br.',
          resultadoExame: null
        }
      ],
      notificacoes: [
        {
          id: Date.now(),
          titulo: 'Conta gov.br Criada!',
          mensagem: `Bem-vindo(a), ${nome}!`,
          tempoAtras: 'Agora mesmo',
          lida: false,
          tipo: 'sucesso'
        }
      ]
    };
    const salvos = JSON.parse(localStorage.getItem('movimenta_sus_pacientes_criados') || '{}');
    salvos[cpf] = novoPac;
    localStorage.setItem('movimenta_sus_pacientes_criados', JSON.stringify(salvos));
    window.location.href = '../paciente/index.html';
    return;
  }

  // Adiciona a nova conta institucional ao seletor do topo
  const select = document.getElementById('selectPerfilLGPD');
  if (select) {
    const opt = document.createElement('option');
    opt.value = tipoConta;
    opt.textContent = `${tipoConta} • ${nome} (Conta Criada gov.br ${nivelGovBr})`;
    select.prepend(opt);
    select.value = tipoConta;
  }

  FALLBACK_DB.logsAuditoriaLGPD.unshift({
    id: `LOG-${Date.now().toString().slice(-4)}`,
    dataHora: new Date().toLocaleString('pt-BR'),
    operador: `${nome} (gov.br ${nivelGovBr})`,
    perfilLGPD: tipoConta,
    acao: `CRIACAO_CONTA_${tipoConta}`,
    alvo: `Unidade: ${unidadeOuUbs}`
  });

  liberarSistemaGestao(tipoConta, `${nome} (gov.br ${nivelGovBr})`);
  ativarAba('tabPainelTempoReal');
}

window.ativarAba = function (tabId) {
  estadoGestao.abaAtiva = tabId;

  document.querySelectorAll('.erp-tab').forEach((btn) => {
    const isTarget = btn.dataset.tabTarget === tabId;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  });

  document.querySelectorAll('.erp-tab-pane').forEach((pane) => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.trocarPerfilRapido = function (codigoPerfil) {
  estadoGestao.perfilLGPD = codigoPerfil;
  document.getElementById('selectPerfilLGPD').value = codigoPerfil;
  localStorage.setItem('movimenta_sus_perfil_ativo_gestao', codigoPerfil);
  exibirToast(`🔒 Conta alterada para [${codigoPerfil}] com permissões aplicadas!`);
  carregarTudoGestao();
};

function renderizarPreviewPermissoesBox(boxId, hiddenInputId, roleCode) {
  const info = CATALOGO_PERFIS_GESTAO[roleCode] || CATALOGO_PERFIS_GESTAO.SISREG_III;
  const input = document.getElementById(hiddenInputId);
  if (input) input.value = roleCode;

  const box = document.getElementById(boxId);
  if (!box) return;
  box.style.borderLeftColor = info.cor;

  box.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
      <strong style="color:#072A52; font-size:0.84rem;">🛡️ Escopo de Permissões da Conta: ${info.titulo}</strong>
      <span class="panel-tag tag-blue">${info.codigo}</span>
    </div>
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.65rem;">
      <div>
        <strong style="color:#166534; font-size:0.7rem; text-transform:uppercase;">Permissões Liberadas</strong>
        <ul style="list-style:none; margin-top:0.2rem; color:#15803D; font-weight:600;">
          ${info.permissoesLista.map((p) => `<li>${p}</li>`).join('')}
        </ul>
      </div>
      <div>
        <strong style="color:#991B1B; font-size:0.7rem; text-transform:uppercase;">Restrições LGPD</strong>
        <ul style="list-style:none; margin-top:0.2rem; color:#B91C1C;">
          ${info.restricoesLista.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

function iniciarRelogioTempoReal() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const tick = () => {
    const agora = new Date();
    el.textContent = agora.toLocaleTimeString('pt-BR');
  };
  tick();
  setInterval(tick, 1000);
}

function exibirToast(mensagem) {
  const toast = document.getElementById('erpToast');
  if (!toast) return;
  toast.textContent = mensagem;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3600);
}

function getRegrasAtuais() {
  return CATALOGO_PERFIS_GESTAO[estadoGestao.perfilLGPD] || CATALOGO_PERFIS_GESTAO.SISREG_III;
}

function formatarCpfLGPD(cpf) {
  const regras = getRegrasAtuais();
  if (!regras.verCpfCompleto) {
    const p = cpf.split(/[.-]/);
    return p.length === 4 ? `***.${p[1]}.${p[2]}-**` : '***.***.***-**';
  }
  return cpf;
}

function atualizarBannerLGPD() {
  const banner = document.getElementById('lgpdBannerInfo');
  if (!banner) return;
  const regras = getRegrasAtuais();
  banner.innerHTML = regras.resumoBanner;
}

// ============================================================================
// CARREGAMENTO DE DADOS (API COM FALLBACK AUTOMÁTICO)
// ============================================================================
async function carregarTudoGestao() {
  atualizarBannerLGPD();

  try {
    const headers = { 'x-lgpd-role': estadoGestao.perfilLGPD };
    const [resDash, resDemandas] = await Promise.all([
      fetch(`${API_BASE}/gestao/indicadores`, { headers }),
      fetch(`${API_BASE}/gestao/demandas?${montarQueryFiltros()}`, { headers })
    ]);

    const jsonDash = await resDash.json();
    const jsonDemandas = await resDemandas.json();

    if (jsonDash.sucesso && jsonDemandas.sucesso) {
      estadoGestao.dashboard = jsonDash.dados;
      estadoGestao.demandasFiltradas = jsonDemandas.itens;
      renderizarTodasAsAbas();
      await carregarProntuarioAba3(estadoGestao.pacienteSelecionadoId, false);
      return;
    }
  } catch (err) {}

  processarDadosLocalmenteFallback();
  renderizarTodasAsAbas();
  carregarProntuarioAba3(estadoGestao.pacienteSelecionadoId, false);
}

function montarQueryFiltros() {
  const params = new URLSearchParams({
    tipo: document.getElementById('filtroTipo').value,
    classificacao: document.getElementById('filtroClassificacao').value,
    tempoMinimoEspera: document.getElementById('filtroTempoEspera').value,
    especialidade: document.getElementById('filtroEspecialidade').value,
    apenasParados: document.getElementById('filtroApenasParados').checked,
    busca: document.getElementById('filtroBusca').value
  });
  return params.toString();
}

function processarDadosLocalmenteFallback() {
  const alertas = [];
  FALLBACK_DB.pacientes.forEach((pac) => {
    pac.trilha.forEach((item) => {
      if (item.status === 'PARADO_SEM_ANDAMENTO' || (item.status !== 'CONCLUIDO' && item.diasSemAndamento >= 15)) {
        alertas.push({
          idEtapa: item.id,
          protocolo: item.protocolo,
          pacienteId: pac.id,
          pacienteNome: pac.nome,
          cpfExibicao: formatarCpfLGPD(pac.cpf),
          exameOuConsulta: item.titulo,
          especialidade: item.especialidade,
          localDestino: item.local,
          classificacaoRisco: item.classificacaoRisco,
          diasSemAndamento: item.diasSemAndamento,
          diasEsperaTotal: item.diasEspera
        });
      }
    });
  });

  const atrasados = FALLBACK_DB.pacientes
    .map((pac) => {
      const pendentes = pac.trilha.filter((t) => t.status !== 'CONCLUIDO');
      const critico = pendentes.sort((a, b) => b.diasEspera - a.diasEspera)[0] || pac.trilha[0];
      return {
        pacienteId: pac.id,
        nome: pac.nome,
        idade: pac.idade,
        cpfExibicao: formatarCpfLGPD(pac.cpf),
        ubsReferencia: pac.ubsReferencia,
        classificacaoGeral: pac.classificacaoGeral,
        maiorTempoEsperaDias: critico.diasEspera,
        demandaCritica: critico.titulo,
        especialidadeCritica: critico.especialidade,
        protocoloCritico: critico.protocolo
      };
    })
    .sort((a, b) => b.maiorTempoEsperaDias - a.maiorTempoEsperaDias);

  estadoGestao.dashboard = {
    kpisDesempenho: {
      filaTotalRegulacao: 14820,
      tempoMedioEsperaDias: 21,
      taxaSucessoExamesPercentual: 92.0,
      totalExamesSemAndamento: alertas.length,
      pacientesAcima60Dias: atrasados.filter((p) => p.maiorTempoEsperaDias >= 60).length
    },
    filasPorEspecialidade: FALLBACK_DB.filasPorEspecialidade,
    alertasExamesSemAndamento: alertas,
    pacientesMaiorAtraso: atrasados,
    integracoesPublicas: FALLBACK_DB.integracoesPublicas,
    logsAuditoriaLGPD: FALLBACK_DB.logsAuditoriaLGPD
  };

  const tipo = document.getElementById('filtroTipo').value;
  const classificacao = document.getElementById('filtroClassificacao').value;
  const minDias = Number(document.getElementById('filtroTempoEspera').value) || 0;
  const especialidade = document.getElementById('filtroEspecialidade').value;
  const apenasParados = document.getElementById('filtroApenasParados').checked;
  const busca = document.getElementById('filtroBusca').value.trim().toLowerCase();

  const lista = [];
  FALLBACK_DB.pacientes.forEach((pac) => {
    pac.trilha.forEach((etapa) => {
      const okTipo = tipo === 'TODOS' || etapa.tipo === tipo;
      const okRisco = classificacao === 'TODOS' || etapa.classificacaoRisco === classificacao;
      const okTempo = etapa.diasEspera >= minDias;
      const okEsp =
        especialidade === 'TODAS' ||
        etapa.especialidade.toLowerCase().includes(especialidade.toLowerCase());
      const okParado = !apenasParados || etapa.diasSemAndamento >= 15 || etapa.status === 'PARADO_SEM_ANDAMENTO';
      const okBusca =
        !busca ||
        pac.nome.toLowerCase().includes(busca) ||
        pac.cpf.includes(busca) ||
        etapa.titulo.toLowerCase().includes(busca) ||
        etapa.protocolo.toLowerCase().includes(busca);

      if (okTipo && okRisco && okTempo && okEsp && okParado && okBusca) {
        lista.push({
          pacienteId: pac.id,
          pacienteNome: pac.nome,
          pacienteIdade: pac.idade,
          cpfExibicao: formatarCpfLGPD(pac.cpf),
          ubsReferencia: pac.ubsReferencia,
          etapa
        });
      }
    });
  });

  estadoGestao.demandasFiltradas = lista;
}

// ============================================================================
// RENDERIZAÇÃO DE CADA ABA
// ============================================================================
function renderizarTodasAsAbas() {
  const d = estadoGestao.dashboard;
  if (!d) return;

  document.getElementById('tabBadgeDemandas').textContent = estadoGestao.demandasFiltradas.length;
  document.getElementById('tabBadgeParados').textContent = d.alertasExamesSemAndamento.length;
  document.getElementById('tabBadgeAtrasos').textContent = d.kpisDesempenho.pacientesAcima60Dias;

  document.getElementById('gestaoKpiFilaTotal').textContent =
    d.kpisDesempenho.filaTotalRegulacao.toLocaleString('pt-BR');
  document.getElementById('gestaoKpiTempoMedio').textContent = d.kpisDesempenho.tempoMedioEsperaDias;
  document.getElementById('gestaoKpiSucessoExames').textContent =
    `${String(d.kpisDesempenho.taxaSucessoExamesPercentual).replace('.', ',')}%`;
  document.getElementById('gestaoKpiExamesParados').textContent =
    d.kpisDesempenho.totalExamesSemAndamento;
  document.getElementById('gestaoKpiMaiorAtraso').textContent =
    d.kpisDesempenho.pacientesAcima60Dias;

  document.getElementById('chartDesempenhoEspera').innerHTML = d.filasPorEspecialidade
    .map((f) => {
      const pct = Math.min(100, Math.round((f.tempoMedioEsperaDias / 35) * 100));
      const cor = f.tempoMedioEsperaDias > 20 ? '#DC2626' : '#166534';
      return `
        <div class="perf-bar-item">
          <div class="perf-bar-top">
            <span>${f.especialidade}</span>
            <span style="color:${cor}">${f.tempoMedioEsperaDias} dias (Meta: 15d)</span>
          </div>
          <div class="queue-bar-track">
            <div class="queue-bar-fill" style="width:${pct}%; background:${cor};"></div>
          </div>
        </div>
      `;
    })
    .join('');

  document.getElementById('chartDesempenhoSucessoExames').innerHTML = d.filasPorEspecialidade
    .map((f) => {
      return `
        <div class="perf-bar-item">
          <div class="perf-bar-top">
            <span>${f.especialidade}</span>
            <span style="color:#0B4C8C">${f.taxaSucessoExames}% concluídos c/ laudo</span>
          </div>
          <div class="queue-bar-track">
            <div class="queue-bar-fill" style="width:${f.taxaSucessoExames}%; background:${f.cor};"></div>
          </div>
        </div>
      `;
    })
    .join('');

  renderizarTabelaMesaRegulacao();
  renderizarListaSeletoraPacientes(d.pacientesMaiorAtraso);

  const gridFilas = document.getElementById('gridFilasEspecialidade');
  gridFilas.innerHTML = d.filasPorEspecialidade
    .map((f) => {
      const lotacaoPct = Math.min(100, Math.round((f.capacidadeMensalVagas / f.totalPacientesFila) * 100));
      return `
        <article class="queue-spec-card">
          <div class="queue-spec-top">
            <h3>${f.especialidade}</h3>
            <span class="risk-badge ${f.nivelCriticidade === 'CRITICO' ? 'risk-VERMELHO' : f.nivelCriticidade === 'ATENCAO' ? 'risk-AMARELO' : 'risk-VERDE'}">
              ${f.nivelCriticidade}
            </span>
          </div>

          <div class="queue-metrics-grid">
            <div class="queue-metric-item">
              <span>Pacientes na Fila</span>
              <strong>${f.totalPacientesFila.toLocaleString('pt-BR')}</strong>
            </div>
            <div class="queue-metric-item">
              <span>Oferta Mensal Vagas</span>
              <strong>${f.capacidadeMensalVagas.toLocaleString('pt-BR')}</strong>
            </div>
            <div class="queue-metric-item">
              <span>Espera Média (SLA)</span>
              <strong style="color:${f.tempoMedioEsperaDias > 20 ? '#DC2626' : '#166534'}">${f.tempoMedioEsperaDias} dias</strong>
            </div>
            <div class="queue-metric-item">
              <span>Sucesso de Exames</span>
              <strong style="color:#0B4C8C">${f.taxaSucessoExames}%</strong>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.71rem; margin-bottom:0.25rem;">
              <span>Exames sem andamento: <strong>${f.examesSemAndamento}</strong></span>
              <span>Vazão Mensal: ${lotacaoPct}%</span>
            </div>
            <div class="queue-bar-track">
              <div class="queue-bar-fill" style="width:${lotacaoPct}%; background:${f.cor};"></div>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:#475569;">
            <span>Regulador: ${f.medicoResponsavel}</span>
            <button type="button" class="btn-table-action btn-action-amber" onclick="filtrarPorEspecialidadeRapido('${f.especialidade.split(' ')[0]}')">
              Abrir na Aba Filtros →
            </button>
          </div>
        </article>
      `;
    })
    .join('');

  const tbodyAlertas = document.getElementById('tbodyExamesSemAndamento');
  document.getElementById('countAlertasParados').textContent =
    `${d.alertasExamesSemAndamento.length} exames retidos`;

  tbodyAlertas.innerHTML = d.alertasExamesSemAndamento
    .map(
      (a) => `
      <tr>
        <td>
          <span class="mono-code">${a.protocolo}</span><br/>
          <strong>${a.exameOuConsulta}</strong>
        </td>
        <td>
          <strong>${a.pacienteNome}</strong><br/>
          <span style="color:#64748B; font-family:monospace;">CPF: ${a.cpfExibicao}</span>
        </td>
        <td>
          <strong>${a.especialidade}</strong><br/>
          <small>${a.localDestino || 'Rede Credenciada SUS'}</small>
        </td>
        <td><span class="risk-badge risk-${a.classificacaoRisco}">${a.classificacaoRisco}</span></td>
        <td>
          <strong class="text-danger" style="font-size:0.9rem;">${a.diasSemAndamento} dias sem andamento</strong><br/>
          <small>Espera acumulada: ${a.diasEsperaTotal} dias</small>
        </td>
        <td>
          <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
            <button type="button" class="btn-table-action btn-action-green" onclick="executarAcaoFila('${a.pacienteId}', '${a.idEtapa}', 'DESTRAVAR_AGENDAR')">
              ⚡ Destravar &amp; Agendar
            </button>
            <button type="button" class="btn-table-action btn-action-primary" onclick="irParaAbaPaciente('${a.pacienteId}')">
              📊 Ver Trilha &amp; Exames
            </button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  const tbodyAtraso = document.getElementById('tbodyPacientesMaiorAtraso');
  tbodyAtraso.innerHTML = d.pacientesMaiorAtraso
    .map(
      (p, idx) => `
      <tr>
        <td>
          <span class="mono-code">#${idx + 1} CRÍTICO</span>
        </td>
        <td>
          <strong>${p.nome} (${p.idade} anos)</strong><br/>
          <span style="color:#64748B;">${p.ubsReferencia} • CPF: ${p.cpfExibicao}</span>
        </td>
        <td>
          <strong>${p.demandaCritica}</strong><br/>
          <span class="mono-code">${p.protocoloCritico} • ${p.especialidadeCritica}</span>
        </td>
        <td><span class="risk-badge risk-${p.classificacaoGeral}">${p.classificacaoGeral}</span></td>
        <td>
          <strong style="font-size:0.95rem; color:${p.maiorTempoEsperaDias >= 60 ? '#DC2626' : '#D97706'};">
            ${p.maiorTempoEsperaDias} dias de espera
          </strong>
        </td>
        <td>
          <button type="button" class="btn-table-action btn-action-primary" onclick="irParaAbaPaciente('${p.pacienteId}')">
            📊 Abrir Aba de Trilha &amp; Exames →
          </button>
        </td>
      </tr>
    `
    )
    .join('');

  const containerInt = document.getElementById('listaIntegracoesPublicas');
  containerInt.innerHTML = d.integracoesPublicas
    .map(
      (i) => `
      <div class="integration-row">
        <div class="integration-info">
          <strong>${i.sigla} — ${i.nome}</strong>
          <span>Protocolo: ${i.protocolo} • Última sinc.: ${i.ultimaSincronizacao}</span>
        </div>
        <div class="integration-stats">
          <span class="risk-badge risk-VERDE">● ${i.status} (${i.latenciaMs}ms)</span>
          <div style="margin-top:0.2rem; color:#334155;">
            Hoje: <strong>${i.registrosSincronizadosHoje.toLocaleString('pt-BR')}</strong> eventos
          </div>
        </div>
      </div>
    `
    )
    .join('');

  const tbodyLogs = document.getElementById('tbodyLogsLGPD');
  tbodyLogs.innerHTML = d.logsAuditoriaLGPD
    .map(
      (l) => `
      <tr>
        <td class="mono-code">${l.dataHora}</td>
        <td>
          <strong>${l.operador}</strong><br/>
          <span class="panel-tag tag-blue">${l.perfilLGPD}</span>
        </td>
        <td><span class="mono-code">${l.acao}</span></td>
        <td>${l.alvo}</td>
      </tr>
    `
    )
    .join('');
}

function renderizarTabelaMesaRegulacao() {
  const tbody = document.getElementById('tbodyMesaRegulacao');
  const itens = estadoGestao.demandasFiltradas;
  document.getElementById('countResultadosFiltro').textContent = `${itens.length} demandas encontradas`;

  if (itens.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding:1.5rem; color:#64748B;">
          Nenhum exame ou consulta corresponde aos filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = itens
    .map((item) => {
      const e = item.etapa;
      const temLaudo = Boolean(e.resultadoExame);

      return `
        <tr>
          <td class="mono-code">${e.protocolo}</td>
          <td>
            <strong>${item.pacienteNome} (${item.pacienteIdade}a)</strong><br/>
            <span style="font-family:monospace; color:#475569;">CPF: ${item.cpfExibicao}</span>
          </td>
          <td><span class="panel-tag tag-blue">${e.tipo}</span></td>
          <td>
            <strong>${e.titulo}</strong><br/>
            <span style="color:#475569;">${e.especialidade} • ${e.local}</span>
          </td>
          <td><span class="risk-badge risk-${e.classificacaoRisco}">${e.classificacaoRisco}</span></td>
          <td>
            <strong>${e.diasEspera} dias total</strong><br/>
            ${
              e.diasSemAndamento > 0
                ? `<span style="color:#DC2626; font-weight:700;">⚠️ ${e.diasSemAndamento}d sem andamento</span>`
                : `<span style="color:#166534;">Fluxo normal</span>`
            }
          </td>
          <td>
            <strong>${e.status}</strong><br/>
            <small>${e.posicaoFila ? `Posição #${e.posicaoFila} na fila` : `Data: ${e.dataAgendada || 'Concluído'}`}</small>
          </td>
          <td>
            ${
              temLaudo
                ? `<button type="button" class="btn-table-action btn-action-amber" onclick="irParaAbaPaciente('${item.pacienteId}')">
                    🔬 Abrir Laudo Exame
                  </button>`
                : `<span style="color:#64748B; font-size:0.72rem;">Aguardando execução</span>`
            }
          </td>
          <td>
            <div style="display:flex; gap:0.35rem; flex-wrap:wrap;">
              <button type="button" class="btn-table-action btn-action-primary" onclick="irParaAbaPaciente('${item.pacienteId}')">
                📊 Trilha &amp; Exames
              </button>
              ${
                e.status !== 'CONCLUIDO'
                  ? `<button type="button" class="btn-table-action btn-action-green" onclick="executarAcaoFila('${item.pacienteId}', '${e.id}', 'DESTRAVAR_AGENDAR')">
                      Agendar Vaga
                    </button>`
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

// ============================================================================
// ABA 3: TRILHAS, GRÁFICOS E EXAMES DE CADA PACIENTE
// ============================================================================
function renderizarListaSeletoraPacientes(listaPacientes) {
  const container = document.getElementById('listaSeletoraPacientes');
  if (!container || !listaPacientes) return;

  container.innerHTML = listaPacientes
    .map((p) => {
      const ativo = p.pacienteId === estadoGestao.pacienteSelecionadoId;
      return `
        <button type="button" class="patient-select-item ${ativo ? 'active' : ''}" onclick="selecionarPacienteNaAba3('${p.pacienteId}')">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${p.nome} (${p.idade}a)</strong>
            <span class="risk-badge risk-${p.classificacaoGeral}">${p.classificacaoGeral}</span>
          </div>
          <span>CPF: ${p.cpfExibicao} • Máx: ${p.maiorTempoEsperaDias}d</span>
          <span style="color:#0B4C8C;">${p.ubsReferencia}</span>
        </button>
      `;
    })
    .join('');
}

window.irParaAbaPaciente = function (pacienteId) {
  estadoGestao.pacienteSelecionadoId = pacienteId;
  ativarAba('tabTrilhasExamesPaciente');
  carregarProntuarioAba3(pacienteId, true);
};

window.selecionarPacienteNaAba3 = function (pacienteId) {
  estadoGestao.pacienteSelecionadoId = pacienteId;
  if (estadoGestao.dashboard) {
    renderizarListaSeletoraPacientes(estadoGestao.dashboard.pacientesMaiorAtraso);
  }
  carregarProntuarioAba3(pacienteId, true);
};

async function carregarProntuarioAba3(pacienteId, notificarAuditoria = false) {
  const regras = getRegrasAtuais();
  let paciente = null;

  try {
    const res = await fetch(`${API_BASE}/gestao/pacientes/${encodeURIComponent(pacienteId)}`, {
      headers: { 'x-lgpd-role': estadoGestao.perfilLGPD }
    });
    const json = await res.json();
    if (json.sucesso) {
      paciente = json.paciente;
    }
  } catch (err) {}

  if (!paciente) {
    const pacLocal = FALLBACK_DB.pacientes.find((p) => p.id === pacienteId) || FALLBACK_DB.pacientes[0];
    paciente = JSON.parse(JSON.stringify(pacLocal));
    paciente.cpfExibicao = formatarCpfLGPD(paciente.cpf);
    if (!regras.verLaudoExame) {
      paciente.trilha.forEach((t) => {
        if (t.resultadoExame) {
          t.resultadoExame = {
            ...t.resultadoExame,
            resumo: `🔒 Conteúdo clínico bloqueado para o perfil [${estadoGestao.perfilLGPD}] conforme Art. 11 da LGPD.`,
            conclusaoMedica: 'Exclusivo para contas com permissão SISREG III ou RNDS (ou o próprio Paciente via gov.br).',
            bloqueadoLGPD: true
          };
        }
      });
    }
  }

  if (notificarAuditoria) {
    exibirToast(`🛡️ Prontuário de ${paciente.nome} inspecionado pelo perfil [${estadoGestao.perfilLGPD}].`);
  }

  renderizarConteudoAba3(paciente);
}

function renderizarConteudoAba3(pac) {
  document.getElementById('abaPacienteProtocolo').textContent =
    `PRONTUÁRIO INTEGRADO • CONTA ATIVA: ${estadoGestao.perfilLGPD} • RISCO: ${pac.classificacaoGeral}`;
  document.getElementById('abaPacienteNome').textContent = `${pac.nome} (${pac.idade} anos)`;
  document.getElementById('abaPacienteMeta').textContent =
    `CPF (LGPD): ${pac.cpfExibicao || pac.cpf} • CNS: ${pac.cns} • Origem: ${pac.ubsReferencia}`;

  const totalEtapas = pac.trilha.length;
  const concluidas = pac.trilha.filter((t) => t.status === 'CONCLUIDO').length;
  const pctConcluido = Math.round((concluidas / totalEtapas) * 100);
  const examesList = pac.trilha.filter((t) => t.tipo === 'EXAME');

  const body = document.getElementById('abaPacienteContent');

  body.innerHTML = `
    <div class="drawer-charts-grid">
      <div class="drawer-chart-box">
        <h4>📊 Gráfico 1: Progresso da Trilha do Paciente</h4>
        <div class="bar-chart-row">
          <div class="bar-chart-label">
            <span>Etapas Concluídas (${concluidas}/${totalEtapas})</span>
            <strong>${pctConcluido}%</strong>
          </div>
          <div class="queue-bar-track">
            <div class="queue-bar-fill" style="width:${pctConcluido}%; background:#4BB543;"></div>
          </div>
        </div>
        <div class="bar-chart-row" style="margin-top:0.75rem;">
          <div class="bar-chart-label">
            <span>Consultas vs. Exames na Jornada</span>
            <strong>${pac.trilha.filter((t) => t.tipo === 'CONSULTA').length} Cons. / ${examesList.length} Exames</strong>
          </div>
          <div class="queue-bar-track">
            <div class="queue-bar-fill" style="width:${Math.round((examesList.length / totalEtapas) * 100)}%; background:#00A4E4;"></div>
          </div>
        </div>
      </div>

      <div class="drawer-chart-box">
        <h4>⏱️ Gráfico 2: Tempo de Espera por Etapa (vs. Meta 15d)</h4>
        ${pac.trilha
          .map((t) => {
            const largura = Math.min(100, Math.round((t.diasEspera / 95) * 100));
            const cor = t.diasEspera >= 60 ? '#DC2626' : t.diasEspera >= 20 ? '#D97706' : '#0B4C8C';
            return `
              <div class="bar-chart-row">
                <div class="bar-chart-label">
                  <span>${t.titulo.slice(0, 32)}</span>
                  <strong style="color:${cor}">${t.diasEspera}d</strong>
                </div>
                <div class="queue-bar-track">
                  <div class="queue-bar-fill" style="width:${largura}%; background:${cor};"></div>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>

    <div>
      <h3 style="font-family:'Sora',sans-serif; color:#072A52; margin-bottom:0.6rem;">
        🔬 Acesso Total aos Exames do Paciente (${examesList.length} registrados na RNDS/SISREG)
      </h3>
      ${examesList
        .map((ex) => {
          const laudo = ex.resultadoExame;
          const bloqueado = laudo && laudo.bloqueadoLGPD;
          return `
            <div class="exam-record-card ${bloqueado ? 'lgpd-locked' : ''}">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.45rem;">
                <div>
                  <span class="mono-code">${ex.protocolo}</span> •
                  <strong>${ex.titulo}</strong> (${ex.especialidade})
                </div>
                <span class="risk-badge risk-${ex.classificacaoRisco}">
                  ${ex.status} • Espera: ${ex.diasEspera}d
                </span>
              </div>
              ${
                laudo
                  ? `
                    <p style="margin-bottom:0.35rem;"><strong>Resultado / Achados:</strong> ${laudo.resumo}</p>
                    <p style="margin-bottom:0.35rem;"><strong>Conclusão Médica:</strong> ${laudo.conclusaoMedica}</p>
                    <small style="color:#475569; font-family:monospace;">
                      Código: ${laudo.codigoLaudo} • Liberação: ${laudo.dataLiberacao || 'Pendente'} • ${laudo.assinaturaDigital}
                    </small>
                  `
                  : `
                    <p style="color:#92400E; margin-bottom:0.5rem;">
                      ⚠️ Exame aguardando execução/laudo (${ex.diasSemAndamento} dias sem andamento). ${ex.observacao}
                    </p>
                    <div style="display:flex; gap:0.45rem;">
                      <button type="button" class="btn-table-action btn-action-green" onclick="executarAcaoFila('${pac.id}', '${ex.id}', 'DESTRAVAR_AGENDAR')">
                        ⚡ Agendar Exame (SISREG III)
                      </button>
                      <button type="button" class="btn-table-action btn-action-primary" style="background:#7C4DFF;" onclick="executarAcaoFila('${pac.id}', '${ex.id}', 'LIBERAR_LAUDO_EXAME')">
                        📄 Emitir Laudo Exame (RNDS)
                      </button>
                    </div>
                  `
              }
            </div>
          `;
        })
        .join('')}
    </div>

    <div>
      <h3 style="font-family:'Sora',sans-serif; color:#072A52; margin-bottom:0.6rem;">
        🛣️ Trilha Completa do Paciente (Consultas, Exames e Procedimentos)
      </h3>
      <div class="erp-table-wrap">
        <table class="erp-table">
          <thead>
            <tr>
              <th>Protocolo / Tipo</th>
              <th>Descrição / Local</th>
              <th>Data / Horário</th>
              <th>Espera / Fila</th>
              <th>Status</th>
              <th>Controle de Fila</th>
            </tr>
          </thead>
          <tbody>
            ${pac.trilha
              .map(
                (t) => `
                <tr>
                  <td>
                    <span class="mono-code">${t.protocolo}</span><br/>
                    <span class="panel-tag tag-blue">${t.tipo}</span>
                  </td>
                  <td>
                    <strong>${t.titulo}</strong><br/>
                    <small>${t.local} • ${t.profissional}</small>
                  </td>
                  <td>
                    <strong>${t.dataAgendada || 'A definir'}</strong><br/>
                    <small>${t.horario}</small>
                  </td>
                  <td>
                    <strong>${t.diasEspera} dias</strong><br/>
                    <small>${t.posicaoFila ? `Posição #${t.posicaoFila}` : 'Finalizado'}</small>
                  </td>
                  <td><span class="risk-badge risk-${t.classificacaoRisco}">${t.status}</span></td>
                  <td>
                    ${
                      t.status !== 'CONCLUIDO'
                        ? `<button type="button" class="btn-table-action btn-action-green" onclick="executarAcaoFila('${pac.id}', '${t.id}', 'DESTRAVAR_AGENDAR')">
                            Liberar Vaga
                          </button>`
                        : `<span style="color:#166534; font-weight:700;">✓ Concluído</span>`
                    }
                  </td>
                </tr>
              `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// VALIDAÇÃO DE PERMISSÕES NAS AÇÕES DE FILA E LAUDOS
// ============================================================================
window.executarAcaoFila = async function (pacienteId, etapaId, acao) {
  const regras = getRegrasAtuais();

  if (acao === 'LIBERAR_LAUDO_EXAME' && !regras.liberarLaudoRNDS && estadoGestao.perfilLGPD !== 'SISREG_III') {
    exibirToast(`🚫 Permissão Negada: A conta [${estadoGestao.perfilLGPD}] não pode emitir laudos na RNDS.`);
    return;
  }

  if (!regras.controlarFila) {
    exibirToast(
      `🚫 Bloqueio de Permissão LGPD: A conta [${estadoGestao.perfilLGPD}] não possui permissão para alterar filas ou cotas de regulação (Exclusivo SISREG III / RNDS).`
    );
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/gestao/regular-fila`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-lgpd-role': estadoGestao.perfilLGPD
      },
      body: JSON.stringify({
        pacienteId,
        etapaId,
        acao,
        novaData: '2026-11-16',
        novoHorario: '09:30'
      })
    });
    const json = await res.json();
    if (json.sucesso) {
      exibirToast(`✅ ${json.mensagem}`);
      await carregarTudoGestao();
      return;
    }
  } catch (err) {}

  const pac = FALLBACK_DB.pacientes.find((p) => p.id === pacienteId);
  if (pac) {
    const etapa = pac.trilha.find((t) => t.id === etapaId);
    if (etapa) {
      if (acao === 'LIBERAR_LAUDO_EXAME') {
        etapa.status = 'CONCLUIDO';
        etapa.diasSemAndamento = 0;
        etapa.resultadoExame = {
          codigoLaudo: 'LAUDO-RNDS-NOVO',
          dataLiberacao: new Date().toLocaleString('pt-BR'),
          statusClinico: 'LIBERADO',
          resumo: 'Exame processado e validado via barramento RNDS.',
          conclusaoMedica: 'Laudo disponível para paciente e médico regulador.',
          assinaturaDigital: `ICP-Brasil • Emitido por ${estadoGestao.perfilLGPD}`
        };
      } else {
        etapa.status = 'AGENDADO';
        etapa.diasSemAndamento = 0;
        etapa.dataAgendada = '2026-11-16';
        etapa.horario = '09:30';
      }

      FALLBACK_DB.logsAuditoriaLGPD.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        dataHora: new Date().toLocaleString('pt-BR'),
        operador: `Operador Autenticado (${estadoGestao.perfilLGPD})`,
        perfilLGPD: estadoGestao.perfilLGPD,
        acao,
        alvo: `${pac.nome} (${etapa.protocolo})`
      });

      exibirToast(`✅ Ação [${acao}] executada pela conta [${estadoGestao.perfilLGPD}]!`);
      carregarTudoGestao();
    }
  }
};

window.filtrarPorEspecialidadeRapido = function (especialidade) {
  document.getElementById('filtroEspecialidade').value = especialidade;
  ativarAba('tabFiltrosRegulacao');
  carregarTudoGestao();
};

function configurarEventosGestao() {
  document.querySelectorAll('.erp-tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      ativarAba(tabBtn.dataset.tabTarget);
    });
  });

  // Seletor de Conta/Permissão no Topo
  document.getElementById('selectPerfilLGPD').addEventListener('change', (e) => {
    estadoGestao.perfilLGPD = e.target.value;
    localStorage.setItem('movimenta_sus_perfil_ativo_gestao', estadoGestao.perfilLGPD);
    exibirToast(`🔒 Conta alterada para: ${estadoGestao.perfilLGPD}`);
    carregarTudoGestao();
  });

  // Seleção de Perfil na Aba 8 interna
  document.querySelectorAll('[data-gestao-role]').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('[data-gestao-role]').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      renderizarPreviewPermissoesBox('gestaoPermPreviewBox', 'gestaoInputTipoConta', card.dataset.gestaoRole);
    });
  });

  // Submit do Formulário de Criação de Conta na Aba 8 interna
  document.getElementById('formCriarContaGestao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipoConta = document.getElementById('gestaoInputTipoConta').value;
    const nome = document.getElementById('gestaoNomeConta').value.trim();
    const cpf = document.getElementById('gestaoCpfConta').value.trim();
    const cnsOuMatricula = document.getElementById('gestaoCnsConta').value.trim();
    const unidadeOuUbs = document.getElementById('gestaoUnidadeConta').value.trim();
    const nivelGovBr = document.getElementById('gestaoNivelGov').value;

    await processarCriacaoDeContaUnificada({
      tipoConta,
      nome,
      cpf,
      cnsOuMatricula,
      unidadeOuUbs,
      nivelGovBr
    });
  });

  ['filtroTipo', 'filtroClassificacao', 'filtroTempoEspera', 'filtroEspecialidade', 'filtroApenasParados'].forEach(
    (id) => {
      document.getElementById(id).addEventListener('change', () => carregarTudoGestao());
    }
  );

  document.getElementById('filtroBusca').addEventListener('input', () => carregarTudoGestao());

  document.getElementById('btnLimparFiltros').addEventListener('click', () => {
    document.getElementById('filtroTipo').value = 'TODOS';
    document.getElementById('filtroClassificacao').value = 'TODOS';
    document.getElementById('filtroTempoEspera').value = '0';
    document.getElementById('filtroEspecialidade').value = 'TODAS';
    document.getElementById('filtroApenasParados').checked = false;
    document.getElementById('filtroBusca').value = '';
    carregarTudoGestao();
  });

  document.getElementById('btnSyncEsusTopo').addEventListener('click', async () => {
    exibirToast(`🔄 Barramento sincronizado pela conta [${estadoGestao.perfilLGPD}]!`);
  });

  document.getElementById('btnImportarCsvSisreg').addEventListener('click', async () => {
    exibirToast(`📥 Carga CSV processada e auditada pela conta [${estadoGestao.perfilLGPD}]!`);
  });

  document.getElementById('btnSimularMutirao').addEventListener('click', () => {
    if (!getRegrasAtuais().controlarFila) {
      exibirToast(`🚫 Permissão Negada: Apenas contas SISREG III podem liberar mutirão de vagas.`);
      return;
    }
    exibirToast('⚡ Lote de vagas extras liberado nas filas de Cardiologia e Ortopedia!');
  });
}

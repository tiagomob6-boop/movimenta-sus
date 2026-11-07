/**
 * Navega SUS - Script Dinâmico do Portal do Paciente (frontend/paciente/app.js)
 * --------------------------------------------------------------------------------
 * REGRA DE SEGURANÇA LGPD:
 * O sistema inicia bloqueado e oculto (`body:not(.authenticated)`).
 * O usuário DEVE passar pela tela de Login (gov.br / CPF) ou Criação de Conta
 * (Paciente, e-SUS APS, SISREG III, RNDS ou CADSUS) antes de ver qualquer tela do sistema.
 */

const API_BASE = 'http://localhost:3000/api';

const CATALOGO_PERFIS_CONTA = {
  PACIENTE: {
    codigo: 'PACIENTE',
    titulo: 'Paciente / Cidadão (Conta gov.br)',
    sistemaOrigem: 'Portal Meu SUS Digital / Gov.br',
    cor: '#4BB543',
    nivelAcesso: 'TITULAR_DADOS_PESSOAIS',
    baseLegalLGPD: 'Art. 18 da LGPD (Acesso do próprio titular aos seus dados de saúde)',
    labelIdentificador: 'Cartão Nacional de Saúde (CNS)',
    placeholderIdentificador: 'Ex: 700.4589.1234.8901',
    labelUnidade: 'UBS de Referência do Paciente',
    placeholderUnidade: 'Ex: UBS Jardim Esperança',
    permissoes: [
      '✓ Visualizar sua própria trilha (consultas, exames e horários)',
      '✓ Consultar sua posição exata na fila de espera do SUS',
      '✓ Abrir seus próprios laudos e resultados de exames (RNDS)',
      '✓ Confirmar presença em consultas agendadas'
    ],
    restricoes: [
      '🔒 Bloqueado acesso a dados de terceiros',
      '🔒 Bloqueado acesso às telas de regulação da Gestão'
    ]
  },
  ESUS_APS: {
    codigo: 'ESUS_APS',
    titulo: 'e-SUS APS (Atenção Primária / UBS)',
    sistemaOrigem: 'Prontuário Eletrônico do Cidadão (PEC / UBS)',
    cor: '#00A4E4',
    nivelAcesso: 'ATENCAO_PRIMARIA_UBS',
    baseLegalLGPD: 'Art. 11, II, f da LGPD (Tutela da saúde na Atenção Primária)',
    labelIdentificador: 'CNS do Profissional / COREN / CRM (e-SUS)',
    placeholderIdentificador: 'Ex: CNS-PROF 700.1122',
    labelUnidade: 'UBS / Unidade Básica de Saúde Vinculada',
    placeholderUnidade: 'Ex: UBS Jardim Esperança (Equipe ESF)',
    permissoes: [
      '✓ Visualizar CPF/CNS e trilha de pacientes da sua UBS',
      '✓ Registrar acolhimento e encaminhamentos da Atenção Básica',
      '✓ Sincronizar fichas de atendimento com o barramento e-SUS PEC'
    ],
    restricoes: [
      '🔒 Não altera cotas nem destrava vagas de alta complexidade (Exclusivo SISREG III)',
      '🔒 Não libera laudos laboratoriais sigilosos (Exclusivo RNDS)'
    ]
  },
  SISREG_III: {
    codigo: 'SISREG_III',
    titulo: 'SISREG III (Central de Regulação Médica)',
    sistemaOrigem: 'Sistema Nacional de Regulação (DATASUS)',
    cor: '#0B4C8C',
    nivelAcesso: 'REGULACAO_TOTAL_FILAS',
    baseLegalLGPD: 'Art. 11, II, f da LGPD (Regulação médica de filas e prioridades)',
    labelIdentificador: 'CRM / Matrícula de Regulador SISREG III',
    placeholderIdentificador: 'Ex: CRM-SP 114520 / SISREG',
    labelUnidade: 'Central de Regulação / NIR Hospitalar',
    placeholderUnidade: 'Ex: Central Municipal de Regulação (NIR)',
    permissoes: [
      '✓ Controle total das filas de espera por especialidade',
      '✓ Destravar e agendar vagas para exames sem andamento',
      '✓ Reclassificar risco clínico (Vermelho, Laranja, Amarelo, Verde)',
      '✓ Acesso completo à trilha, gráficos e exames dos pacientes'
    ],
    restricoes: [
      '🔒 Todo acesso a prontuário fica gravado no Log Imutável da LGPD'
    ]
  },
  RNDS: {
    codigo: 'RNDS',
    titulo: 'RNDS (Rede Nacional de Dados em Saúde / Exames)',
    sistemaOrigem: 'Barramento Nacional HL7 FHIR (Exames e Laudos)',
    cor: '#7C4DFF',
    nivelAcesso: 'DIAGNOSTICO_E_LAUDOS',
    baseLegalLGPD: 'Art. 11, II, f da LGPD (Serviços diagnósticos e interoperabilidade)',
    labelIdentificador: 'CRF / CRM / Certificado Digital ICP-Brasil (RNDS)',
    placeholderIdentificador: 'Ex: CRF-SP 88412 / ICP-Brasil',
    labelUnidade: 'Laboratório Central / Centro de Imagem Conveniado',
    placeholderUnidade: 'Ex: Laboratório Central Municipal',
    permissoes: [
      '✓ Acesso total aos exames e histórico diagnóstico dos pacientes',
      '✓ Emitir e liberar laudos de exames assinados digitalmente na RNDS',
      '✓ Monitorar e resolver alertas de exames sem andamento'
    ],
    restricoes: [
      '🔒 Atuação restrita a exames e diagnóstico; consultas cabem ao SISREG III'
    ]
  },
  CADSUS: {
    codigo: 'CADSUS',
    titulo: 'CADSUS (Gestão Cadastral CNS & Auditoria BI)',
    sistemaOrigem: 'Base Nacional do Cartão SUS / DPO LGPD',
    cor: '#D97706',
    nivelAcesso: 'CADASTRAL_E_ESTATISTICO_PSEUDONIMIZADO',
    baseLegalLGPD: 'Art. 11, II, c da LGPD (Políticas públicas com anonimização)',
    labelIdentificador: 'Matrícula de Gestor CADSUS / Auditor LGPD',
    placeholderIdentificador: 'Ex: MAT-CADSUS 99201',
    labelUnidade: 'Secretaria Municipal de Saúde (Setor CADSUS / BI)',
    placeholderUnidade: 'Ex: Diretoria de Informações e DPO',
    permissoes: [
      '✓ Validar e unificar cadastros de CPF e Cartão SUS (CNS)',
      '✓ Acessar o Painel de Indicadores em Tempo Real e estatísticas de fila',
      '✓ Auditar a Trilha de Logs de Acesso da LGPD'
    ],
    restricoes: [
      '🔒 CPFs exibidos de forma pseudonimizada (***.XXX.XXX-**) nas tabelas',
      '🔒 Bloqueado acesso ao conteúdo médico sigiloso dos laudos de exames'
    ]
  }
};

const FALLBACK_PACIENTES = {
  '123.456.789-00': {
    id: 'PAC-001',
    nome: 'Maria Aparecida Silva',
    cpf: '123.456.789-00',
    cns: '700.4589.1234.8901',
    unidadeReferencia: 'UBS Jardim Esperança',
    equipeESF: 'Equipe 04 - Verde',
    nivelGovBr: 'Prata',
    classificacaoGeral: 'AMARELO',
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
        local: 'UBS Jardim Esperança - Consultório 02',
        profissional: 'Dr. Roberto Almeida (CRM 114520)',
        classificacaoRisco: 'VERDE',
        diasEspera: 4,
        posicaoFila: null,
        status: 'CONCLUIDO',
        observacao: 'Consulta realizada. Solicitado Hemograma, Ecocardiograma e encaminhamento para Cardiologia.',
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
        profissional: 'Dra. Helena Castro (Bioquímica)',
        classificacaoRisco: 'VERDE',
        diasEspera: 8,
        posicaoFila: null,
        status: 'CONCLUIDO',
        observacao: 'Resultado liberado e integrado via RNDS / ConecteSUS.',
        resultadoExame: {
          codigoLaudo: 'LAUDO-HEM-9921',
          dataLiberacao: '25/09/2026 às 14:20',
          statusClinico: 'ALTERADO LEVE',
          resumo: 'Hemoglobina: 13.4 g/dL (Normal) | Colesterol Total: 238 mg/dL | LDL: 154 mg/dL | Glicemia: 96 mg/dL.',
          conclusaoMedica: 'Dislipidemia mista leve. Apresentar na consulta de Cardiologia.',
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
        horario: 'Aguardando liberação de vaga',
        local: 'AME Centro de Especialidades',
        profissional: 'Central de Regulação Municipal',
        classificacaoRisco: 'AMARELO',
        diasEspera: 47,
        posicaoFila: 9,
        status: 'PARADO_SEM_ANDAMENTO',
        observacao: 'Sua solicitação está na posição #9 da fila prioritária. A gestão já recebeu alerta automático de prioridade.',
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
        local: 'Policlínica Municipal - Bloco B, Sala 14',
        profissional: 'Dra. Patrícia Fontes (CRM 98412)',
        classificacaoRisco: 'AMARELO',
        diasEspera: 33,
        posicaoFila: 1,
        status: 'AGENDADO',
        confirmadoPaciente: false,
        observacao: 'Consulta agendada! Confirme sua presença abaixo para garantir seu atendimento.',
        resultadoExame: null
      },
      {
        id: 'TR-105',
        protocolo: 'EXM-2026-91880',
        tipo: 'EXAME',
        titulo: 'Holter 24 Horas (3 Canais)',
        especialidade: 'Cardiologia Diagnóstica',
        dataSolicitacao: '2026-10-18',
        dataAgendada: null,
        horario: 'Em fila de regulação',
        local: 'Hospital Geral Municipal',
        profissional: 'Central de Regulação',
        classificacaoRisco: 'AMARELO',
        diasEspera: 20,
        posicaoFila: 14,
        status: 'EM_FILA',
        observacao: 'Posição #14 na fila de Cardiologia Diagnóstica. Previsão média: 12 dias.',
        resultadoExame: null
      }
    ],
    notificacoes: [
      {
        id: 1,
        titulo: 'Exame de Sangue Disponível',
        mensagem: 'O laudo do seu Hemograma Completo + Perfil Lipídico já pode ser aberto na sua trilha.',
        tempoAtras: 'Há 1h',
        lida: false,
        tipo: 'sucesso'
      },
      {
        id: 2,
        titulo: 'Confirme sua Consulta (12/11 às 08:30)',
        mensagem: 'Sua consulta em Cardiologia na Policlínica Municipal está agendada. Confirme sua presença.',
        tempoAtras: 'Há 3h',
        lida: false,
        tipo: 'alerta'
      },
      {
        id: 3,
        titulo: 'Movimentação na Fila do SUS',
        mensagem: 'Seu pedido de Holter 24h avançou 6 posições após atualização do e-SUS.',
        tempoAtras: 'Ontem',
        lida: true,
        tipo: 'info'
      }
    ]
  },
  '987.654.321-11': {
    id: 'PAC-002',
    nome: 'João Batista Oliveira',
    cpf: '987.654.321-11',
    cns: '702.9912.4410.3312',
    unidadeReferencia: 'UBS Vila Nova',
    equipeESF: 'Equipe 01 - Azul',
    nivelGovBr: 'Ouro',
    classificacaoGeral: 'VERMELHO',
    trilha: [
      {
        id: 'TR-201',
        protocolo: 'EXM-2026-61022',
        tipo: 'EXAME',
        titulo: 'PSA Total e Livre + Ultrassonografia de Próstata',
        especialidade: 'Urologia / Diagnóstico',
        dataSolicitacao: '2026-07-10',
        dataAgendada: '2026-07-18',
        horario: '09:00',
        local: 'Centro Diagnóstico Municipal',
        profissional: 'Dr. Marcelo Tavares',
        classificacaoRisco: 'LARANJA',
        diasEspera: 8,
        posicaoFila: null,
        status: 'CONCLUIDO',
        observacao: 'Exame concluído com prioridade encaminhada à Urologia.',
        resultadoExame: {
          codigoLaudo: 'LAUDO-URO-4410',
          dataLiberacao: '21/07/2026 às 10:15',
          statusClinico: 'PRIORIDADE CLÍNICA',
          resumo: 'PSA Total: 11.8 ng/mL | Relação PSA Livre/Total: 9% | Próstata 68g.',
          conclusaoMedica: 'Encaminhamento prioritário para Ressonância Multiparamétrica e Urologia.',
          assinaturaDigital: 'ICP-Brasil • Dr. Marcelo Tavares'
        }
      },
      {
        id: 'TR-202',
        protocolo: 'EXM-2026-70119',
        tipo: 'EXAME',
        titulo: 'Ressonância Magnética Multiparamétrica da Pelve',
        especialidade: 'Radiologia / Alta Complexidade',
        dataSolicitacao: '2026-08-05',
        dataAgendada: null,
        horario: 'Prioridade Máxima na Regulação',
        local: 'Hospital Regional de Referência',
        profissional: 'Regulação Alta Complexidade',
        classificacaoRisco: 'VERMELHO',
        diasEspera: 94,
        posicaoFila: 2,
        status: 'ATRASADO',
        observacao: 'Posição #2 na fila de Alta Complexidade. Sinalizado com prioridade Vermelha.',
        resultadoExame: null
      },
      {
        id: 'TR-203',
        protocolo: 'CON-2026-75001',
        tipo: 'CONSULTA',
        titulo: 'Consulta em Urologia Oncológica',
        especialidade: 'Urologia',
        dataSolicitacao: '2026-09-01',
        dataAgendada: '2026-11-10',
        horario: '14:00',
        local: 'Ambulatório de Especialidades - Sala 04',
        profissional: 'Dr. Henrique Paiva (CRM 77210)',
        classificacaoRisco: 'VERMELHO',
        diasEspera: 67,
        posicaoFila: 1,
        status: 'AGENDADO',
        confirmadoPaciente: true,
        observacao: 'Presença já confirmada.',
        resultadoExame: null
      }
    ],
    notificacoes: [
      {
        id: 10,
        titulo: 'Prioridade Máxima Ativada',
        mensagem: 'Seu pedido de Ressonância Magnética está na posição #2 com prioridade Vermelha.',
        tempoAtras: 'Há 30min',
        lida: false,
        tipo: 'alerta'
      }
    ]
  },
  '456.789.123-22': {
    id: 'PAC-003',
    nome: 'Francisca Santos Souza',
    cpf: '456.789.123-22',
    cns: '704.1120.8841.0029',
    unidadeReferencia: 'UBS Parque das Árvores',
    equipeESF: 'Equipe 02 - Amarela',
    nivelGovBr: 'Prata',
    classificacaoGeral: 'LARANJA',
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
        posicaoFila: 5,
        status: 'PARADO_SEM_ANDAMENTO',
        observacao: 'Posição #5 na fila prioritária de Ortopedia.',
        resultadoExame: null
      }
    ],
    notificacoes: []
  },
  '321.654.987-33': {
    id: 'PAC-004',
    nome: 'Pedro Henrique Costa',
    cpf: '321.654.987-33',
    cns: '706.5541.9980.1123',
    unidadeReferencia: 'UBS Centro Histórico',
    equipeESF: 'Equipe 01 - Centro',
    nivelGovBr: 'Bronze',
    classificacaoGeral: 'LARANJA',
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
        posicaoFila: null,
        status: 'CONCLUIDO',
        observacao: 'Exame concluído.',
        resultadoExame: {
          codigoLaudo: 'LAUDO-OFT-7712',
          dataLiberacao: '09/10/2026 16:40',
          statusClinico: 'INDICACAO CIRÚRGICA',
          resumo: 'Acuidade Visual OD 20/80 | OE 20/60. Opacificação cristaliniana +3/+4 em OD.',
          conclusaoMedica: 'Indicada Cirurgia de Catarata (Facoemulsificação com LIO).',
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
        local: 'Mutirão Oftalmológico - Hospital Dia SUS',
        profissional: 'Equipe Cirúrgica Oftalmológica',
        classificacaoRisco: 'LARANJA',
        diasEspera: 52,
        posicaoFila: 3,
        status: 'AGENDADO',
        confirmadoPaciente: true,
        observacao: 'Incluído no Mutirão Municipal de Cirurgias Eletivas.',
        resultadoExame: null
      }
    ],
    notificacoes: []
  }
};

let estadoAtual = {
  autenticado: false,
  cpfAtivo: '123.456.789-00',
  filtroTrilha: 'TODOS',
  perfilCriarSelecionado: 'PACIENTE',
  dadosPaciente: null
};

// ============================================================================
// INICIALIZAÇÃO: SEMPRE EXIBE TELA DE LOGIN/CRIAR CONTA ANTES DO SISTEMA
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  restaurarContasCriadasLocalmente();
  configurarEventosUI();
  renderizarPreviewPermissoes('PACIENTE');
  // Garantir que inicia bloqueado na tela de Login/Criar Conta
  bloquearSistemaEExibirLogin('paneLoginGov');
});

function bloquearSistemaEExibirLogin(abaInicial = 'paneLoginGov') {
  estadoAtual.autenticado = false;
  document.body.classList.remove('authenticated');
  alternarAbaModalAuth(abaInicial);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function liberarAcessoAoSistemaPaciente() {
  estadoAtual.autenticado = true;
  document.body.classList.add('authenticated');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restaurarContasCriadasLocalmente() {
  try {
    const pacientesSalvos = JSON.parse(localStorage.getItem('movimenta_sus_pacientes_criados') || '{}');
    Object.keys(pacientesSalvos).forEach((cpf) => {
      FALLBACK_PACIENTES[cpf] = pacientesSalvos[cpf];
    });
  } catch (e) {}
}

// ============================================================================
// RENDERIZAÇÃO DO QUADRO DE PERMISSÕES NA ABA "CRIAR CONTA"
// ============================================================================
function renderizarPreviewPermissoes(roleCode) {
  estadoAtual.perfilCriarSelecionado = roleCode;
  const info = CATALOGO_PERFIS_CONTA[roleCode] || CATALOGO_PERFIS_CONTA.PACIENTE;

  document.getElementById('inputTipoContaCriar').value = roleCode;
  document.getElementById('labelCnsOuMatricula').textContent = info.labelIdentificador;
  document.getElementById('inputCnsCriar').placeholder = info.placeholderIdentificador;
  document.getElementById('labelUnidadeVinc').textContent = info.labelUnidade;
  document.getElementById('inputUnidadeCriar').placeholder = info.placeholderUnidade;
  document.getElementById('txtBtnSubmitCriar').innerHTML =
    `Vincular <strong>gov.br</strong>, Criar Conta [${info.codigo}] e Entrar`;

  const box = document.getElementById('permissionsPreviewBox');
  box.style.borderLeftColor = info.cor;

  box.innerHTML = `
    <div class="perm-box-header">
      <strong>🛡️ Matriz de Permissões: ${info.titulo}</strong>
      <span class="perm-tag-level">${info.nivelAcesso}</span>
    </div>
    <div style="color:#475569; font-size:0.75rem; margin-bottom:0.35rem;">
      <strong>Sistema:</strong> ${info.sistemaOrigem} • <strong>Base Legal:</strong> ${info.baseLegalLGPD}
    </div>
    <div class="perm-list-cols">
      <div class="perm-col">
        <h5 style="color:#166534;">Permissões Concedidas</h5>
        <ul>
          ${info.permissoes.map((p) => `<li style="color:#15803D; font-weight:600;">${p}</li>`).join('')}
        </ul>
      </div>
      <div class="perm-col">
        <h5 style="color:#991B1B;">Restrições de Segurança (LGPD)</h5>
        <ul>
          ${info.restricoes.map((r) => `<li style="color:#B91C1C;">${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
}

// ============================================================================
// CARREGAMENTO E RENDERIZAÇÃO DA JORNADA DO PACIENTE
// ============================================================================
async function autenticarELiberarPaciente(cpf) {
  estadoAtual.cpfAtivo = cpf;

  if (FALLBACK_PACIENTES[cpf]) {
    estadoAtual.dadosPaciente = JSON.parse(JSON.stringify(FALLBACK_PACIENTES[cpf]));
  }

  try {
    const res = await fetch(`${API_BASE}/paciente/jornada?cpf=${encodeURIComponent(cpf)}`);
    const json = await res.json();
    if (json.sucesso) {
      estadoAtual.dadosPaciente = {
        ...json.dados.paciente,
        trilha: json.dados.trilha,
        notificacoes: json.dados.notificacoes
      };
      renderizarTelaPaciente();
      liberarAcessoAoSistemaPaciente();
      return;
    }
  } catch (err) {}

  const pacFallback = FALLBACK_PACIENTES[cpf] || FALLBACK_PACIENTES['123.456.789-00'];
  estadoAtual.dadosPaciente = JSON.parse(JSON.stringify(pacFallback));
  renderizarTelaPaciente();
  liberarAcessoAoSistemaPaciente();
}

function renderizarTelaPaciente() {
  const pac = estadoAtual.dadosPaciente;
  if (!pac) return;

  const iniciais = pac.nome
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  document.getElementById('sidebarAvatar').textContent = iniciais;
  document.getElementById('sidebarUserName').textContent = pac.nome;
  document.getElementById('sidebarUserCpf').textContent = `CPF: ${pac.cpf}`;
  document.getElementById('sidebarGovBadge').textContent = `Conta Gov.br ${pac.nivelGovBr || 'Prata'}`;

  document.getElementById('bannerGovBadge').textContent = `✓ Autenticado via gov.br (${pac.nivelGovBr || 'Prata'})`;
  document.getElementById('bannerCns').textContent = `CNS: ${pac.cns}`;
  document.getElementById('bannerWelcomeTitle').textContent = `Bem-vindo(a) ao NavegaSUS, ${pac.nome.split(' ')[0]}!`;
  document.getElementById('bannerUbs').textContent = `📍 ${pac.unidadeReferencia || pac.ubsReferencia} (${pac.equipeESF || 'Atenção Primária'})`;
  document.getElementById('bannerRisco').textContent = `Classificação Atual: ${pac.classificacaoGeral}`;

  const total = pac.trilha.length;
  const consultas = pac.trilha.filter((t) => t.tipo === 'CONSULTA').length;
  const exames = pac.trilha.filter((t) => t.tipo === 'EXAME').length;
  const procedimentos = pac.trilha.filter((t) => t.tipo === 'PROCEDIMENTO').length;

  document.getElementById('navPillTotal').textContent = total;
  document.getElementById('shortcutTotalCount').textContent = `${total} etapas na trilha`;
  document.getElementById('shortcutConsultasCount').textContent = `${consultas} consulta(s)`;
  document.getElementById('shortcutExamesCount').textContent = `${exames} exame(s)`;
  document.getElementById('shortcutProcCount').textContent = `${procedimentos} procedimento(s)`;

  const concluidos = pac.trilha.filter((t) => t.status === 'CONCLUIDO').length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;
  document.getElementById('progressTextResumo').textContent = `${concluidos} de ${total} etapas concluídas na sua trilha`;
  document.getElementById('progressPercentText').textContent = `${pct}% concluído`;
  document.getElementById('journeyProgressFill').style.width = `${pct}%`;

  renderizarTimelineTrilha(pac.trilha);
  renderizarNotificacoes(pac.notificacoes || []);
}

function formatarDataBR(dataISO) {
  if (!dataISO) return 'A definir pela Regulação';
  const partes = dataISO.split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return dataISO;
}

function traduzirStatus(status) {
  const mapa = {
    CONCLUIDO: '✓ Concluído / Realizado',
    AGENDADO: '📅 Agendado (Vaga Liberada)',
    EM_FILA: '⏳ Em Fila de Regulação',
    PARADO_SEM_ANDAMENTO: '⚠️ Em Regulação Prioritária',
    ATRASADO: '🚨 Prioridade Máxima Ativa'
  };
  return mapa[status] || status;
}

function renderizarTimelineTrilha(trilha) {
  const container = document.getElementById('patientTimelineContainer');
  const filtro = estadoAtual.filtroTrilha;

  const itensFiltrados = trilha.filter((item) => {
    if (filtro === 'TODOS') return true;
    if (filtro === 'FILA') return item.status !== 'CONCLUIDO';
    return item.tipo === filtro;
  });

  if (itensFiltrados.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: #64748B;">
        Nenhuma etapa encontrada para este filtro. Clique em "Todas as Etapas".
      </div>
    `;
    return;
  }

  container.innerHTML = itensFiltrados
    .map((etapa) => {
      const temLaudo = etapa.resultadoExame && etapa.status === 'CONCLUIDO';
      const podeConfirmar = etapa.status === 'AGENDADO';

      return `
        <article class="timeline-step-card status-${etapa.status}">
          <div class="step-top-bar">
            <div class="step-badges">
              <span class="badge-tipo ${etapa.tipo}">${etapa.tipo}</span>
              <span class="badge-protocolo">Protocolo: ${etapa.protocolo}</span>
            </div>
            <span class="badge-status-pill status-pill-${etapa.status}">
              ${traduzirStatus(etapa.status)}
            </span>
          </div>

          <div class="step-main-info">
            <h4>${etapa.titulo}</h4>
            <span class="step-especialidade">${etapa.especialidade} • Profissional/Setor: ${etapa.profissional}</span>
          </div>

          <div class="step-details-grid">
            <div class="step-detail-item">
              <span class="step-detail-label">📅 Data Agendada / Prevista</span>
              <span class="step-detail-val">${formatarDataBR(etapa.dataAgendada)}</span>
            </div>
            <div class="step-detail-item">
              <span class="step-detail-label">⏰ Horário</span>
              <span class="step-detail-val">${etapa.horario}</span>
            </div>
            <div class="step-detail-item">
              <span class="step-detail-label">🏥 Local de Atendimento</span>
              <span class="step-detail-val">${etapa.local}</span>
            </div>
            <div class="step-detail-item">
              <span class="step-detail-label">📊 Posição na Fila / Espera</span>
              <span class="step-detail-val">
                ${etapa.posicaoFila ? `${etapa.posicaoFila}º na fila (${etapa.diasEspera} dias)` : `Realizado em ${etapa.diasEspera} dias`}
              </span>
            </div>
          </div>

          <div class="step-footer-actions">
            <p class="step-obs">ℹ️ ${etapa.observacao}</p>
            <div class="step-buttons">
              ${
                temLaudo
                  ? `<button type="button" class="btn-step-action btn-ver-laudo" onclick="abrirModalLaudo('${etapa.id}')">
                      📄 Ver Resultado / Laudo do Exame
                    </button>`
                  : ''
              }
              ${
                podeConfirmar
                  ? etapa.confirmadoPaciente
                    ? `<span class="btn-step-action btn-presenca-ok">✓ Presença Confirmada</span>`
                    : `<button type="button" class="btn-step-action btn-confirmar-presenca" onclick="confirmarPresencaEtapa('${etapa.id}')">
                        ✅ Confirmar Minha Presença
                      </button>`
                  : ''
              }
            </div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderizarNotificacoes(notificacoes) {
  const container = document.getElementById('listaNotificacoes');
  const badge = document.getElementById('badgeNotifCount');

  badge.textContent = `${notificacoes.length} aviso(s)`;

  if (notificacoes.length === 0) {
    container.innerHTML = `<p style="color:#64748B; font-size:0.85rem;">Nenhuma notificação pendente.</p>`;
    return;
  }

  container.innerHTML = notificacoes
    .map((n) => {
      const icone = n.tipo === 'sucesso' ? '✓' : n.tipo === 'alerta' ? '!' : '↑';
      return `
        <article class="notification-item ${n.lida ? '' : 'unread'}">
          <div class="notif-icon notif-${n.tipo || 'info'}">${icone}</div>
          <div class="notif-body">
            <div class="notif-title-row">
              <h4>${n.titulo}</h4>
              <time class="notif-time">${n.tempoAtras}</time>
            </div>
            <p>${n.mensagem}</p>
          </div>
        </article>
      `;
    })
    .join('');
}

// ============================================================================
// AÇÕES DO PACIENTE & PROCESSAMENTO DE LOGIN E CRIAÇÃO DE CONTA
// ============================================================================
window.abrirModalLaudo = function (etapaId) {
  const pac = estadoAtual.dadosPaciente;
  if (!pac) return;
  const etapa = pac.trilha.find((t) => t.id === etapaId);
  if (!etapa || !etapa.resultadoExame) return;

  const laudo = etapa.resultadoExame;
  document.getElementById('laudoCodigo').textContent = `${laudo.codigoLaudo} • RNDS/SUS`;
  document.getElementById('laudoModalTitle').textContent = etapa.titulo;

  document.getElementById('laudoBodyContent').innerHTML = `
    <div class="laudo-box">
      <h4>Paciente &amp; Liberação</h4>
      <p>${pac.nome} (CPF: ${pac.cpf}) • Liberado em: ${laudo.dataLiberacao}</p>
    </div>
    <div class="laudo-box">
      <h4>Valores e Achados Laboratoriais / Imagem</h4>
      <p>${laudo.resumo}</p>
    </div>
    <div class="laudo-box">
      <h4>Conclusão Médica</h4>
      <p>${laudo.conclusaoMedica}</p>
    </div>
    <div class="laudo-box" style="background:#EDF5FF; border-color:#BAE6FD;">
      <h4>Assinatura Digital e Conformidade</h4>
      <p>🔒 ${laudo.assinaturaDigital}</p>
    </div>
  `;

  document.getElementById('laudoModal').classList.add('open');
};

window.confirmarPresencaEtapa = async function (etapaId) {
  const pac = estadoAtual.dadosPaciente;
  if (!pac) return;

  try {
    const res = await fetch(`${API_BASE}/paciente/confirmar-presenca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf: pac.cpf, etapaId })
    });
    const json = await res.json();
    if (json.sucesso) {
      await autenticarELiberarPaciente(pac.cpf);
      return;
    }
  } catch (err) {}

  const etapa = pac.trilha.find((t) => t.id === etapaId);
  if (etapa) {
    etapa.confirmadoPaciente = true;
    etapa.observacao = 'Presença confirmada pelo cidadão via App Navega SUS!';
    pac.notificacoes.unshift({
      id: Date.now(),
      titulo: 'Presença Confirmada!',
      mensagem: `Sua presença em "${etapa.titulo}" foi registrada com sucesso.`,
      tempoAtras: 'Agora mesmo',
      lida: false,
      tipo: 'sucesso'
    });
    renderizarTelaPaciente();
  }
};

function alternarAbaModalAuth(paneId) {
  document.querySelectorAll('.auth-tab-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.authTab === paneId);
  });
  document.querySelectorAll('.auth-tab-pane').forEach((p) => {
    p.classList.toggle('active', p.id === paneId);
  });
}

function executarLoginConformePerfilSelecionado() {
  const perfilEscolhido = document.getElementById('selectPerfilLoginDireto').value;
  const cpfDigitado = document.getElementById('inputCpfLogin').value.trim() || '123.456.789-00';

  if (perfilEscolhido === 'PACIENTE') {
    autenticarELiberarPaciente(cpfDigitado);
  } else {
    // Se escolheu SISREG_III, RNDS, ESUS_APS ou CADSUS, salva sessão autenticada e abre o sistema da Gestão
    sessionStorage.setItem('movimenta_sus_gestao_autenticado', 'true');
    localStorage.setItem('movimenta_sus_perfil_ativo_gestao', perfilEscolhido);
    window.location.href = `../gestao/index.html?perfil=${encodeURIComponent(perfilEscolhido)}&auth=1`;
  }
}

function configurarEventosUI() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const openBtn = document.getElementById('openSidebarBtn');
  const closeBtn = document.getElementById('closeSidebarBtn');

  const toggleMenu = (open) => {
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('active', open);
  };

  openBtn.addEventListener('click', () => toggleMenu(true));
  closeBtn.addEventListener('click', () => toggleMenu(false));
  overlay.addEventListener('click', () => toggleMenu(false));

  // Botões de Sair / Voltar para Tela de Login (bloqueando o sistema novamente)
  document.getElementById('btnLogoutTopo').addEventListener('click', () => {
    bloquearSistemaEExibirLogin('paneLoginGov');
  });
  document.getElementById('btnLogoutSidebar').addEventListener('click', () => {
    toggleMenu(false);
    bloquearSistemaEExibirLogin('paneLoginGov');
  });

  // Botões de Criar Nova Conta (bloqueia o sistema e abre na Aba Criar Conta)
  document.getElementById('btnAbrirCriarContaTopo').addEventListener('click', () => {
    bloquearSistemaEExibirLogin('paneCriarConta');
  });
  document.getElementById('btnAbrirCriarContaSidebar').addEventListener('click', () => {
    toggleMenu(false);
    bloquearSistemaEExibirLogin('paneCriarConta');
  });

  // Alternar entre Aba Login e Aba Criar Conta
  document.querySelectorAll('.auth-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => alternarAbaModalAuth(btn.dataset.authTab));
  });

  // Seleção dos 5 Perfis na Aba Criar Conta
  document.querySelectorAll('.role-option-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.role-option-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      renderizarPreviewPermissoes(card.dataset.role);
    });
  });

  // Botão Oficial Entrar com gov.br (com simulação do fluxo OIDC)
  document.getElementById('btnEntrarGovBr').addEventListener('click', () => {
    const feedback = document.getElementById('govbrOauthFeedback');
    const txt = document.getElementById('govbrOauthText');

    feedback.style.display = 'flex';
    txt.textContent = 'Autenticando credencial única em sso.acesso.gov.br (PKCE S256)...';

    setTimeout(() => {
      txt.textContent = '✓ Token OIDC gov.br validado! Liberando acesso ao sistema...';
      setTimeout(() => {
        feedback.style.display = 'none';
        executarLoginConformePerfilSelecionado();
      }, 400);
    }, 550);
  });

  // Submit Login por CPF
  document.getElementById('formLoginCPF').addEventListener('submit', (e) => {
    e.preventDefault();
    executarLoginConformePerfilSelecionado();
  });

  // Submit Criar Conta (Paciente, e-SUS APS, SISREG III, RNDS, CADSUS)
  document.getElementById('formCriarConta').addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipoConta = document.getElementById('inputTipoContaCriar').value;
    const nome = document.getElementById('inputNomeCriar').value.trim();
    const cpf = document.getElementById('inputCpfCriar').value.trim();
    const cnsOuMatricula = document.getElementById('inputCnsCriar').value.trim();
    const unidadeOuUbs = document.getElementById('inputUnidadeCriar').value.trim();
    const nivelGovBr = document.getElementById('selectNivelGovCriar').value;
    const telefone = document.getElementById('inputTelCriar').value.trim();

    try {
      const res = await fetch(`${API_BASE}/auth/criar-conta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoConta,
          nome,
          cpf,
          cnsOuMatricula,
          unidadeOuUbs,
          nivelGovBr,
          telefone
        })
      });
      const json = await res.json();
      if (json.sucesso && tipoConta === 'PACIENTE') {
        FALLBACK_PACIENTES[cpf] = json.contaCriada;
        await autenticarELiberarPaciente(cpf);
        return;
      } else if (json.sucesso && tipoConta !== 'PACIENTE') {
        sessionStorage.setItem('movimenta_sus_gestao_autenticado', 'true');
        localStorage.setItem('movimenta_sus_perfil_ativo_gestao', tipoConta);
        localStorage.setItem('movimenta_sus_operador_custom', JSON.stringify(json.contaCriada));
        window.location.href = `../gestao/index.html?perfil=${encodeURIComponent(tipoConta)}&auth=1`;
        return;
      }
    } catch (err) {}

    if (tipoConta === 'PACIENTE') {
      const cnsGerado = cnsOuMatricula || '709.4412.8890.0012';
      const novoPac = {
        id: `PAC-NOVO-${Date.now().toString().slice(-3)}`,
        nome,
        cpf,
        cns: cnsGerado,
        unidadeReferencia: unidadeOuUbs || 'UBS Jardim Esperança',
        equipeESF: 'Equipe 01 - Vínculo gov.br',
        nivelGovBr,
        classificacaoGeral: 'VERDE',
        trilha: [
          {
            id: `TR-N1`,
            protocolo: `ESUS-2026-${Math.floor(10000 + Math.random() * 89999)}`,
            tipo: 'CONSULTA',
            titulo: 'Consulta de Acolhimento Inicial (Atenção Primária)',
            especialidade: 'Clínica Médica (e-SUS APS)',
            dataSolicitacao: '2026-11-07',
            dataAgendada: '2026-11-14',
            horario: '09:00',
            local: unidadeOuUbs || 'UBS Jardim Esperança',
            profissional: 'Equipe Saúde da Família (e-SUS)',
            classificacaoRisco: 'VERDE',
            diasEspera: 5,
            posicaoFila: 2,
            status: 'AGENDADO',
            confirmadoPaciente: false,
            observacao: 'Conta criada via gov.br e vinculada automaticamente ao prontuário e-SUS APS.',
            resultadoExame: null
          },
          {
            id: `TR-N2`,
            protocolo: `RNDS-2026-${Math.floor(10000 + Math.random() * 89999)}`,
            tipo: 'EXAME',
            titulo: 'Check-up Laboratorial Preventivo (Hemograma + Glicemia)',
            especialidade: 'Patologia Clínica (RNDS)',
            dataSolicitacao: '2026-11-05',
            dataAgendada: '2026-11-06',
            horario: '07:30',
            local: 'Laboratório Municipal SUS',
            profissional: 'Rede Nacional de Dados em Saúde (RNDS)',
            classificacaoRisco: 'VERDE',
            diasEspera: 2,
            posicaoFila: null,
            status: 'CONCLUIDO',
            observacao: 'Exame preventivo sincronizado automaticamente via RNDS.',
            resultadoExame: {
              codigoLaudo: 'LAUDO-RNDS-8841',
              dataLiberacao: '07/11/2026 às 11:00',
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
            mensagem: `Bem-vindo(a), ${nome}! Seu CPF (${cpf}) e Cartão SUS (${cnsGerado}) foram integrados ao e-SUS, SISREG e RNDS.`,
            tempoAtras: 'Agora mesmo',
            lida: false,
            tipo: 'sucesso'
          }
        ]
      };

      FALLBACK_PACIENTES[cpf] = novoPac;
      const salvos = JSON.parse(localStorage.getItem('movimenta_sus_pacientes_criados') || '{}');
      salvos[cpf] = novoPac;
      localStorage.setItem('movimenta_sus_pacientes_criados', JSON.stringify(salvos));

      await autenticarELiberarPaciente(cpf);
    } else {
      const contaInstitucional = {
        nome,
        cpf,
        cnsOuMatricula: cnsOuMatricula || `MAT-${tipoConta}`,
        unidade: unidadeOuUbs || CATALOGO_PERFIS_CONTA[tipoConta].sistemaOrigem,
        perfilLGPD: tipoConta,
        nivelGovBr
      };
      sessionStorage.setItem('movimenta_sus_gestao_autenticado', 'true');
      localStorage.setItem('movimenta_sus_perfil_ativo_gestao', tipoConta);
      localStorage.setItem('movimenta_sus_operador_custom', JSON.stringify(contaInstitucional));
      window.location.href = `../gestao/index.html?perfil=${encodeURIComponent(tipoConta)}&auth=1`;
    }
  });

  document.getElementById('closeLaudoModalBtn').addEventListener('click', () => {
    document.getElementById('laudoModal').classList.remove('open');
  });

  document.querySelectorAll('.cpf-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cpf-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('inputCpfLogin').value = chip.dataset.cpf;
      document.getElementById('selectPerfilLoginDireto').value = 'PACIENTE';
    });
  });

  document.querySelectorAll('.trail-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.trail-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      estadoAtual.filtroTrilha = pill.dataset.type;
      if (estadoAtual.dadosPaciente) {
        renderizarTimelineTrilha(estadoAtual.dadosPaciente.trilha);
      }
    });
  });

  document.querySelectorAll('[data-shortcut-filter], .sidebar-nav .nav-item').forEach((el) => {
    el.addEventListener('click', () => {
      const filtro = el.dataset.shortcutFilter || el.dataset.filter;
      if (!filtro) return;
      estadoAtual.filtroTrilha = filtro;
      document.querySelectorAll('.trail-pill').forEach((p) => {
        p.classList.toggle('active', p.dataset.type === filtro);
      });
      if (estadoAtual.dadosPaciente) {
        renderizarTimelineTrilha(estadoAtual.dadosPaciente.trilha);
      }
      toggleMenu(false);
    });
  });
}

/**
 * Movimenta SUS - Base de Dados Estruturada do MVP (models/database.js)
 * ---------------------------------------------------------------------
 * Contém:
 * 1. Matriz Oficial de Perfis e Permissões LGPD (e-SUS APS, SISREG III, RNDS, CADSUS e PACIENTE);
 * 2. Contas cadastradas e Pacientes com suas Trilhas de Cuidado (Consultas, Exames, Procedimentos);
 * 3. Filas de Regulação por Especialidade, Integrações e Logs de Auditoria LGPD.
 */

const database = {
  // ==========================================================================
  // 1. MATRIZ DE PERFIS DE CONTA E PERMISSÕES (LGPD & INTEROPERABILIDADE SUS)
  // ==========================================================================
  perfisPermissoesCatalogo: {
    PACIENTE: {
      codigo: 'PACIENTE',
      titulo: 'Paciente / Cidadão (Conta gov.br)',
      sistemaOrigem: 'Portal Meu SUS Digital / Gov.br',
      cor: '#4BB543',
      nivelAcesso: 'TITULAR_DADOS_PESSOAIS',
      baseLegalLGPD: 'Art. 18 da LGPD (Acesso facilitado do titular aos seus próprios dados de saúde)',
      resumoPermissoes: 'Acesso exclusivo à própria trilha de consultas, exames, posição na fila e confirmação de presença.',
      permissoes: [
        'VER_PROPRIA_TRILHA',
        'VER_PROPRIO_LAUDO_EXAME',
        'CONFIRMAR_PRESENCA_CONSULTA'
      ],
      restricoes: [
        'Bloqueado acesso a dados de outros pacientes',
        'Bloqueado acesso ao Painel de Regulação da Gestão'
      ]
    },
    ESUS_APS: {
      codigo: 'ESUS_APS',
      titulo: 'e-SUS APS (Atenção Primária / UBS)',
      sistemaOrigem: 'Prontuário Eletrônico do Cidadão (PEC / UBS)',
      cor: '#00A4E4',
      nivelAcesso: 'ATENCAO_PRIMARIA_UBS',
      baseLegalLGPD: 'Art. 11, II, f da LGPD (Tutela da saúde na Atenção Primária e encaminhamento inicial)',
      resumoPermissoes: 'Visualiza CPF/CNS, acompanha a trilha dos pacientes da sua UBS e solicita encaminhamentos, sem alterar cotas regulatórias nem liberar laudos da RNDS.',
      permissoes: [
        'VER_CPF_COMPLETO',
        'VER_TRILHA_PACIENTE',
        'SINCRONIZAR_ESUS',
        'SOLICITAR_ENCAMINHAMENTO_APS'
      ],
      restricoes: [
        'Não pode destravar/agendar cotas de alta complexidade (Exclusivo SISREG III)',
        'Não pode emitir/liberar laudos laboratoriais sigilosos (Exclusivo RNDS)'
      ]
    },
    SISREG_III: {
      codigo: 'SISREG_III',
      titulo: 'SISREG III (Central de Regulação Médica)',
      sistemaOrigem: 'Sistema Nacional de Regulação (DATASUS)',
      cor: '#0B4C8C',
      nivelAcesso: 'REGULACAO_TOTAL_FILAS',
      baseLegalLGPD: 'Art. 11, II, f da LGPD (Tutela da saúde para regulação médica de filas e prioridades)',
      resumoPermissoes: 'Controle total das filas de espera por especialidade, classificação de risco, destrave de exames parados, agendamento de vagas e visualização clínica completa.',
      permissoes: [
        'VER_CPF_COMPLETO',
        'VER_TRILHA_PACIENTE',
        'VER_LAUDO_EXAME',
        'CONTROLAR_FILA',
        'RECLASSIFICAR_RISCO',
        'INTEGRAR_ESUS'
      ],
      restricoes: [
        'Todo acesso a prontuário é gravado de forma imutável no Log de Auditoria LGPD'
      ]
    },
    RNDS: {
      codigo: 'RNDS',
      titulo: 'RNDS (Rede Nacional de Dados em Saúde / Exames)',
      sistemaOrigem: 'Barramento Nacional de Exames e Laudos (HL7 FHIR)',
      cor: '#7C4DFF',
      nivelAcesso: 'DIAGNOSTICO_E_LAUDOS',
      baseLegalLGPD: 'Art. 11, II, f da LGPD (Serviços diagnósticos, laboratoriais e interoperabilidade clínica)',
      resumoPermissoes: 'Acesso total aos exames dos pacientes, emissão/liberação de laudos assinados via ICP-Brasil e gestão de alertas de exames sem andamento.',
      permissoes: [
        'VER_CPF_COMPLETO',
        'VER_TRILHA_PACIENTE',
        'VER_LAUDO_EXAME',
        'LIBERAR_LAUDO_RNDS',
        'INTEGRAR_ESUS'
      ],
      restricoes: [
        'Focado em exames diagnósticos e laudos; reagendamento de consultas médicas cabe ao SISREG III'
      ]
    },
    CADSUS: {
      codigo: 'CADSUS',
      titulo: 'CADSUS (Gestão Cadastral CNS & Auditoria BI)',
      sistemaOrigem: 'Base Nacional do Cartão SUS / Auditoria LGPD',
      cor: '#D97706',
      nivelAcesso: 'CADASTRAL_E_ESTATISTICO_PSEUDONIMIZADO',
      baseLegalLGPD: 'Art. 11, II, c da LGPD (Gestão cadastral e indicadores públicos com pseudonimização)',
      resumoPermissoes: 'Valida cadastro CNS/Gov.br, monitora indicadores de desempenho em tempo real e audita filas com CPF mascarado e laudos clínicos ocultados.',
      permissoes: [
        'VER_TRILHA_PACIENTE',
        'VALIDAR_CNS_CADSUS',
        'AUDITAR_INDICADORES_BI',
        'INTEGRAR_ESUS'
      ],
      restricoes: [
        'CPF exibido de forma mascarada (***.XXX.XXX-**) nas listagens gerais',
        'Bloqueado acesso ao conteúdo médico sigiloso dos laudos de exames (Art. 11 LGPD)'
      ]
    }
  },

  // ==========================================================================
  // 2. CONTAS DE GESTÃO PRÉ-CONFIGURADAS PARA CADA SISTEMA PÚBLICO
  // ==========================================================================
  usuariosGestao: [
    {
      id: 'GEST-SISREG',
      usuario: 'regulador.sisreg',
      cpf: '111.222.333-44',
      cnsOuMatricula: 'CRM-SP 114520 / SISREG',
      nome: 'Dr. Carlos Eduardo Mendes',
      cargo: 'Médico Regulador Chefe (SISREG III)',
      unidade: 'Central Municipal de Regulação (NIR)',
      perfilLGPD: 'SISREG_III',
      nivelGovBr: 'Ouro',
      nivelAcesso: 'REGULACAO_TOTAL_FILAS',
      permissoes: [
        'VER_CPF_COMPLETO',
        'VER_TRILHA_PACIENTE',
        'VER_LAUDO_EXAME',
        'CONTROLAR_FILA',
        'RECLASSIFICAR_RISCO',
        'INTEGRAR_ESUS'
      ]
    },
    {
      id: 'GEST-RNDS',
      usuario: 'especialista.rnds',
      cpf: '222.333.444-55',
      cnsOuMatricula: 'CRF-SP 88412 / RNDS',
      nome: 'Dra. Helena Castro',
      cargo: 'Coord. de Diagnóstico e Laudos (RNDS)',
      unidade: 'Laboratório Central & Centro de Imagem',
      perfilLGPD: 'RNDS',
      nivelGovBr: 'Ouro',
      nivelAcesso: 'DIAGNOSTICO_E_LAUDOS',
      permissoes: [
        'VER_CPF_COMPLETO',
        'VER_TRILHA_PACIENTE',
        'VER_LAUDO_EXAME',
        'LIBERAR_LAUDO_RNDS',
        'CONTROLAR_FILA',
        'INTEGRAR_ESUS'
      ]
    },
    {
      id: 'GEST-ESUS',
      usuario: 'operador.esus',
      cpf: '333.444.555-66',
      cnsOuMatricula: 'CNS-PROF 700.1122 / e-SUS APS',
      nome: 'Enf. Marcos Vinícius Rocha',
      cargo: 'Coordenador de Atenção Primária (e-SUS APS)',
      unidade: 'UBS Jardim Esperança (PEC)',
      perfilLGPD: 'ESUS_APS',
      nivelGovBr: 'Prata',
      nivelAcesso: 'ATENCAO_PRIMARIA_UBS',
      permissoes: [
        'VER_CPF_COMPLETO',
        'VER_TRILHA_PACIENTE',
        'SINCRONIZAR_ESUS',
        'SOLICITAR_ENCAMINHAMENTO_APS'
      ]
    },
    {
      id: 'GEST-CADSUS',
      usuario: 'auditor.cadsus',
      cpf: '444.555.666-77',
      cnsOuMatricula: 'MAT-SUS 99201 / CADSUS',
      nome: 'Dra. Ana Paula Vasconcelos',
      cargo: 'Gestora Cadastral & Auditora LGPD (CADSUS)',
      unidade: 'Secretaria Municipal de Saúde - DPO/BI',
      perfilLGPD: 'CADSUS',
      nivelGovBr: 'Ouro',
      nivelAcesso: 'CADASTRAL_E_ESTATISTICO_PSEUDONIMIZADO',
      permissoes: [
        'VER_TRILHA_PACIENTE',
        'VALIDAR_CNS_CADSUS',
        'AUDITAR_INDICADORES_BI',
        'INTEGRAR_ESUS'
      ]
    }
  ],

  // ==========================================================================
  // 3. PACIENTES E SUAS TRILHAS COMPLETAS (CONSULTAS, EXAMES E FILAS)
  // ==========================================================================
  pacientes: [
    {
      id: 'PAC-001',
      cpf: '123.456.789-00',
      cns: '700.4589.1234.8901',
      nome: 'Maria Aparecida Silva',
      dataNascimento: '1968-04-12',
      idade: 58,
      sexo: 'F',
      telefone: '(11) 98765-4321',
      ubsReferencia: 'UBS Jardim Esperança',
      equipeESF: 'Equipe 04 - Verde',
      nivelGovBr: 'Prata',
      classificacaoGeral: 'AMARELO',
      maiorTempoEsperaDias: 47,
      possuiExameParado: true,
      metricasPaciente: {
        aderenciaConsultas: 95,
        examesConcluidos: 2,
        examesPendentes: 2,
        economiaTempoEstimadaDias: 9
      },
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
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'Paciente hipertensa com queixa de dispneia aos esforços. Solicitado ECG, Hemograma e encaminhamento para Cardiologia.',
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
          profissional: 'Dra. Helena Castro (CRF/Bioquímica)',
          classificacaoRisco: 'VERDE',
          diasEspera: 8,
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'Resultado liberado e integrado via RNDS / e-SUS.',
          resultadoExame: {
            codigoLaudo: 'LAUDO-HEM-9921',
            dataLiberacao: '2026-09-25 14:20',
            statusClinico: 'ALTERADO_LEVE',
            resumo: 'Hemoglobina: 13.4 g/dL (Normal) | Colesterol Total: 238 mg/dL (Limítrofe Alto) | LDL: 154 mg/dL | Glicemia de Jejum: 96 mg/dL.',
            conclusaoMedica: 'Dislipidemia mista leve. Recomenda-se correlação clínica na consulta cardiológica.',
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
          horario: 'A definir pela Regulação',
          local: 'AME Centro de Especialidades',
          profissional: 'Fila de Regulação Municipal',
          classificacaoRisco: 'AMARELO',
          diasEspera: 47,
          diasSemAndamento: 26,
          posicaoFila: 9,
          status: 'PARADO_SEM_ANDAMENTO',
          observacao: 'Aguardando liberação de agenda do prestador credenciado há 26 dias sem movimentação.',
          resultadoExame: {
            codigoLaudo: 'PENDENTE-EXECUCAO',
            dataLiberacao: null,
            statusClinico: 'AGUARDANDO_EXAME',
            resumo: 'Exame ainda não realizado. Pedido retido na fila de cotas do prestador.',
            conclusaoMedica: 'Priorizar encaixe antes da consulta com Cardiologista.',
            assinaturaDigital: 'Regulação SISREG'
          }
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
          diasSemAndamento: 2,
          posicaoFila: 1,
          status: 'AGENDADO',
          confirmadoPaciente: false,
          observacao: 'Vaga liberada pela regulação. Aguardando confirmação de presença da paciente.',
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
          horario: 'Em fila de espera',
          local: 'Hospital Geral Municipal',
          profissional: 'Central de Regulação',
          classificacaoRisco: 'AMARELO',
          diasEspera: 20,
          diasSemAndamento: 5,
          posicaoFila: 14,
          status: 'EM_FILA',
          observacao: 'Posição #14 na fila de Cardiologia Diagnóstica. Previsão estimada: 12 dias.',
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
          mensagem: 'Sua consulta em Cardiologia na Policlínica Municipal está agendada. Confirme presença com 1 clique.',
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

    {
      id: 'PAC-002',
      cpf: '987.654.321-11',
      cns: '702.9912.4410.3312',
      nome: 'João Batista Oliveira',
      dataNascimento: '1954-08-20',
      idade: 72,
      sexo: 'M',
      telefone: '(11) 99123-8877',
      ubsReferencia: 'UBS Vila Nova',
      equipeESF: 'Equipe 01 - Azul',
      nivelGovBr: 'Ouro',
      classificacaoGeral: 'VERMELHO',
      maiorTempoEsperaDias: 94,
      possuiExameParado: true,
      metricasPaciente: {
        aderenciaConsultas: 100,
        examesConcluidos: 1,
        examesPendentes: 1,
        economiaTempoEstimadaDias: 14
      },
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
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'PSA Total elevado (11.8 ng/mL). Encaminhado em caráter prioritário.',
          resultadoExame: {
            codigoLaudo: 'LAUDO-URO-4410',
            dataLiberacao: '2026-07-21 10:15',
            statusClinico: 'CRITICO',
            resumo: 'PSA Total: 11.8 ng/mL (Ref: < 4.0 ng/mL) | Relação PSA Livre/Total: 9% | Próstata aumentada heterogênea (68g).',
            conclusaoMedica: 'Achado suspeito. Indicação de Biópsia Guiada e avaliação Urológica/Oncológica prioritária (Lei dos 30/60 dias).',
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
          horario: 'Pendente de Regulação Estadual (CROSS/SISREG)',
          local: 'Hospital Regional de Referência',
          profissional: 'Regulação Alta Complexidade',
          classificacaoRisco: 'VERMELHO',
          diasEspera: 94,
          diasSemAndamento: 38,
          posicaoFila: 2,
          status: 'ATRASADO',
          observacao: 'CRÍTICO: Paciente idoso (72a) aguardando há 94 dias. Exame parado sem atualização há 38 dias.',
          resultadoExame: {
            codigoLaudo: 'ALERTA-ATRASO-94D',
            dataLiberacao: null,
            statusClinico: 'EM_ATRASO_CRITICO',
            resumo: 'Solicitação aguarda autorização de cota de Ressonância com sedação leve.',
            conclusaoMedica: 'Necessária intervenção imediata do Médico Regulador.',
            assinaturaDigital: 'Auditoria Automática Movimenta SUS'
          }
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
          diasSemAndamento: 0,
          posicaoFila: 1,
          status: 'AGENDADO',
          confirmadoPaciente: true,
          observacao: 'Presença já confirmada pelo familiar via portal.',
          resultadoExame: null
        }
      ],
      notificacoes: [
        {
          id: 10,
          titulo: 'Prioridade Máxima Ativada',
          mensagem: 'Seu pedido de Ressonância Magnética foi sinalizado com prioridade Vermelha na Central de Regulação.',
          tempoAtras: 'Há 30min',
          lida: false,
          tipo: 'alerta'
        }
      ]
    },

    {
      id: 'PAC-003',
      cpf: '456.789.123-22',
      cns: '704.1120.8841.0029',
      nome: 'Francisca Santos Souza',
      dataNascimento: '1979-11-03',
      idade: 47,
      sexo: 'F',
      telefone: '(11) 97744-5566',
      ubsReferencia: 'UBS Parque das Árvores',
      equipeESF: 'Equipe 02 - Amarela',
      nivelGovBr: 'Prata',
      classificacaoGeral: 'LARANJA',
      maiorTempoEsperaDias: 68,
      possuiExameParado: true,
      metricasPaciente: {
        aderenciaConsultas: 88,
        examesConcluidos: 1,
        examesPendentes: 2,
        economiaTempoEstimadaDias: 6
      },
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
          observacao: 'Hérnia discal extrusa com radiculopatia aguda. Pedido sem movimentação há 31 dias.',
          resultadoExame: null
        }
      ],
      notificacoes: [
        {
          id: 20,
          titulo: 'Acompanhamento de Exame de Imagem',
          mensagem: 'Sua solicitação de Ressonância de Coluna Lombar está na posição #5 da fila prioritária.',
          tempoAtras: 'Há 2h',
          lida: false,
          tipo: 'info'
        }
      ]
    },

    {
      id: 'PAC-004',
      cpf: '321.654.987-33',
      cns: '706.5541.9980.1123',
      nome: 'Pedro Henrique Costa',
      dataNascimento: '1961-02-19',
      idade: 65,
      sexo: 'M',
      telefone: '(11) 96543-2109',
      ubsReferencia: 'UBS Centro Histórico',
      equipeESF: 'Equipe 01 - Centro',
      nivelGovBr: 'Bronze',
      classificacaoGeral: 'LARANJA',
      maiorTempoEsperaDias: 52,
      possuiExameParado: false,
      metricasPaciente: {
        aderenciaConsultas: 92,
        examesConcluidos: 1,
        examesPendentes: 1,
        economiaTempoEstimadaDias: 11
      },
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
          profissional: 'Dra. Camila Nogueira (CRM 109231)',
          classificacaoRisco: 'LARANJA',
          diasEspera: 22,
          diasSemAndamento: 0,
          posicaoFila: null,
          status: 'CONCLUIDO',
          observacao: 'Retinopatia diabética moderada e catarata nuclear bilateral.',
          resultadoExame: {
            codigoLaudo: 'LAUDO-OFT-7712',
            dataLiberacao: '2026-10-09 16:40',
            statusClinico: 'ALTERADO_MODERADO',
            resumo: 'Acuidade Visual OD 20/80 | OE 20/60. Pressão Intraocular: 16/17 mmHg. Opacificação cristaliniana +3/+4 em OD.',
            conclusaoMedica: 'Indicada Facoemulsificação com implante de Lente Intraocular (Cirurgia de Catarata) em olho direito.',
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
          diasSemAndamento: 0,
          posicaoFila: 3,
          status: 'AGENDADO',
          confirmadoPaciente: true,
          observacao: 'Incluído no Mutirão Municipal de Cirurgias Eletivas.',
          resultadoExame: null
        }
      ],
      notificacoes: []
    }
  ],

  // ==========================================================================
  // 4. CONTROLE DE FILAS POR ESPECIALIDADE
  // ==========================================================================
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

  // ==========================================================================
  // 5. INTEGRAÇÕES COM SISTEMAS PÚBLICOS (e-SUS APS, SISREG III, RNDS, CADSUS)
  // ==========================================================================
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

  // ==========================================================================
  // 6. LOGS DE AUDITORIA LGPD
  // ==========================================================================
  logsAuditoriaLGPD: [
    {
      id: 'LOG-9001',
      dataHora: '07/11/2026 13:05:12',
      operador: 'Dr. Carlos Eduardo Mendes',
      perfilLGPD: 'SISREG_III',
      acao: 'ACESSO_REGULACAO_FILA',
      alvo: 'João Batista Oliveira (CPF: ***.654.321-**)',
      justificativaLegal: 'Art. 11, II, f (Tutela da saúde em regulação médica SISREG III)',
      ip: '10.24.118.42'
    },
    {
      id: 'LOG-9002',
      dataHora: '07/11/2026 13:10:04',
      operador: 'Dra. Helena Castro',
      perfilLGPD: 'RNDS',
      acao: 'EMISSAO_LAUDO_EXAME_RNDS',
      alvo: 'Maria Aparecida Silva (CPF: ***.456.789-**)',
      justificativaLegal: 'Art. 11, II, f (Interoperabilidade diagnóstica RNDS)',
      ip: '10.24.118.19'
    }
  ]
};

module.exports = database;

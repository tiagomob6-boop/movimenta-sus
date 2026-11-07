/**
 * Movimenta SUS - Serviço de Lógica de Negócio e Regulação (services/jornadaService.js)
 * -------------------------------------------------------------------------------------
 * Responsável por:
 * 1. Filtrar pacientes e exames por especialidade, classificação de risco e tempo de espera;
 * 2. Calcular alertas de exames parados (sem andamento) e ranking de pacientes em maior atraso;
 * 3. Controlar as filas de espera (agendar vaga, avançar posição, reclassificar prioridade);
 * 4. Aplicar as regras de visibilidade da LGPD aos prontuários e exames;
 * 5. Simular sincronização ativa com o e-SUS APS, SISREG III e RNDS.
 */

const database = require('../models/database');
const { mascararCPF, registrarLogLGPD } = require('../middlewares/lgpdAuthMiddleware');

class JornadaService {
  /**
   * Busca paciente por CPF (aceita com ou sem pontuação)
   */
  buscarPacientePorCPF(cpfInformado) {
    const limpar = (valor) => String(valor || '').replace(/\D/g, '');
    const cpfLimpo = limpar(cpfInformado);

    if (!cpfLimpo) {
      return database.pacientes[0];
    }

    const encontrado = database.pacientes.find((p) => limpar(p.cpf) === cpfLimpo);
    return encontrado || null;
  }

  /**
   * Aplica máscara de proteção LGPD em um paciente conforme o perfil do gestor logado
   */
  formatarPacienteParaGestao(paciente, contextoLGPD, detalhado = false) {
    const podeVerCPF = contextoLGPD.permissoes.includes('VER_CPF_COMPLETO');
    const podeVerLaudo = contextoLGPD.permissoes.includes('VER_LAUDO_EXAME');

    const trilhaFormatada = paciente.trilha.map((item) => {
      const copiaItem = { ...item };

      // Se o operador não tiver permissão clínica (ex: OPERADOR_UBS ou GESTOR_BI), protege o laudo médico
      if (!podeVerLaudo && copiaItem.resultadoExame) {
        copiaItem.resultadoExame = {
          codigoLaudo: copiaItem.resultadoExame.codigoLaudo,
          dataLiberacao: copiaItem.resultadoExame.dataLiberacao,
          statusClinico: 'PROTEGIDO_LGPD',
          resumo: '🔒 Conteúdo clínico restrito pela LGPD (Art. 11). Exclusivo para perfil Médico Regulador ou próprio Paciente.',
          conclusaoMedica: 'Necessária credencial de Médico Regulador para visualizar o laudo completo.',
          assinaturaDigital: copiaItem.resultadoExame.assinaturaDigital,
          bloqueadoLGPD: true
        };
      }

      return copiaItem;
    });

    // Calcula resumo de consultas e exames do paciente para os gráficos individuais
    const totalConsultas = paciente.trilha.filter((t) => t.tipo === 'CONSULTA').length;
    const totalExames = paciente.trilha.filter((t) => t.tipo === 'EXAME').length;
    const totalProcedimentos = paciente.trilha.filter((t) => t.tipo === 'PROCEDIMENTO').length;
    const concluidos = paciente.trilha.filter((t) => t.status === 'CONCLUIDO').length;

    return {
      ...paciente,
      cpfExibicao: podeVerCPF ? paciente.cpf : mascararCPF(paciente.cpf),
      cpfMascaradoLGPD: !podeVerCPF,
      resumoTrilha: {
        totalItens: paciente.trilha.length,
        totalConsultas,
        totalExames,
        totalProcedimentos,
        concluidos,
        percentualJornadaConcluida: Math.round((concluidos / paciente.trilha.length) * 100)
      },
      trilha: detalhado ? trilhaFormatada : trilhaFormatada
    };
  }

  /**
   * Filtra pacientes e itens da fila conforme os parâmetros do Painel de Gestão:
   * - tipo (TODOS, EXAME, CONSULTA, PROCEDIMENTO)
   * - classificacao (TODOS, VERMELHO, LARANJA, AMARELO, VERDE)
   * - tempoMinimoEspera (em dias, ex: 0, 15, 30, 60)
   * - especialidade
   * - busca (nome, CPF ou protocolo)
   */
  listarPacientesETrilhasFiltrados(filtros = {}, contextoLGPD) {
    const {
      tipo = 'TODOS',
      classificacao = 'TODOS',
      tempoMinimoEspera = 0,
      especialidade = 'TODAS',
      apenasParados = false,
      busca = ''
    } = filtros;

    const termo = busca.trim().toLowerCase();
    const minDias = Number(tempoMinimoEspera) || 0;

    // Extrai todos os itens de trilha vinculados aos respectivos pacientes
    const itensConsolidados = [];

    database.pacientes.forEach((paciente) => {
      const pacFormatado = this.formatarPacienteParaGestao(paciente, contextoLGPD, true);

      pacFormatado.trilha.forEach((etapa) => {
        const bateTipo = tipo === 'TODOS' || etapa.tipo === tipo;
        const bateClassificacao =
          classificacao === 'TODOS' ||
          etapa.classificacaoRisco === classificacao ||
          pacFormatado.classificacaoGeral === classificacao;
        const bateTempo = etapa.diasEspera >= minDias;
        const bateEspecialidade =
          especialidade === 'TODAS' ||
          etapa.especialidade.toLowerCase().includes(especialidade.toLowerCase());
        const bateParado =
          !apenasParados ||
          etapa.status === 'PARADO_SEM_ANDAMENTO' ||
          etapa.diasSemAndamento >= 15;

        const bateBusca =
          !termo ||
          pacFormatado.nome.toLowerCase().includes(termo) ||
          pacFormatado.cpf.includes(termo) ||
          pacFormatado.cns.includes(termo) ||
          etapa.titulo.toLowerCase().includes(termo) ||
          etapa.protocolo.toLowerCase().includes(termo) ||
          etapa.especialidade.toLowerCase().includes(termo);

        if (
          bateTipo &&
          bateClassificacao &&
          bateTempo &&
          bateEspecialidade &&
          bateParado &&
          bateBusca
        ) {
          itensConsolidados.push({
            pacienteId: pacFormatado.id,
            pacienteNome: pacFormatado.nome,
            pacienteIdade: pacFormatado.idade,
            cpfExibicao: pacFormatado.cpfExibicao,
            cns: pacFormatado.cns,
            ubsReferencia: pacFormatado.ubsReferencia,
            resumoTrilha: pacFormatado.resumoTrilha,
            etapa
          });
        }
      });
    });

    // Ordena por maior atraso / prioridade clínica
    const pesoRisco = { VERMELHO: 4, LARANJA: 3, AMARELO: 2, VERDE: 1, AZUL: 0 };
    itensConsolidados.sort((a, b) => {
      const diffRisco =
        (pesoRisco[b.etapa.classificacaoRisco] || 0) -
        (pesoRisco[a.etapa.classificacaoRisco] || 0);
      if (diffRisco !== 0) return diffRisco;
      return b.etapa.diasEspera - a.etapa.diasEspera;
    });

    return itensConsolidados;
  }

  /**
   * 5. Alerta de Exames Sem Andamento (exames parados há >= 15 dias sem movimentação)
   */
  obterAlertasExamesSemAndamento(contextoLGPD) {
    const alertas = [];

    database.pacientes.forEach((pac) => {
      const pacFormatado = this.formatarPacienteParaGestao(pac, contextoLGPD);
      pacFormatado.trilha.forEach((item) => {
        if (
          item.status === 'PARADO_SEM_ANDAMENTO' ||
          (item.status !== 'CONCLUIDO' && item.diasSemAndamento >= 15)
        ) {
          alertas.push({
            idEtapa: item.id,
            protocolo: item.protocolo,
            pacienteId: pac.id,
            pacienteNome: pac.nome,
            cpfExibicao: pacFormatado.cpfExibicao,
            exameOuConsulta: item.titulo,
            especialidade: item.especialidade,
            classificacaoRisco: item.classificacaoRisco,
            diasSemAndamento: item.diasSemAndamento,
            diasEsperaTotal: item.diasEspera,
            localDestino: item.local,
            motivoRetencao: item.observacao
          });
        }
      });
    });

    return alertas.sort((a, b) => b.diasSemAndamento - a.diasSemAndamento);
  }

  /**
   * 6. Pacientes em Maior Atraso (Ranking Crítico de Tempo de Espera)
   */
  obterPacientesMaiorAtraso(contextoLGPD) {
    const lista = database.pacientes.map((pac) => {
      const formatado = this.formatarPacienteParaGestao(pac, contextoLGPD);
      // Encontra a etapa não concluída com maior tempo de espera
      const etapasPendentes = formatado.trilha.filter((t) => t.status !== 'CONCLUIDO');
      const etapaMaisAtrasada = etapasPendentes.sort((a, b) => b.diasEspera - a.diasEspera)[0] || formatado.trilha[0];

      return {
        pacienteId: formatado.id,
        nome: formatado.nome,
        idade: formatado.idade,
        cpfExibicao: formatado.cpfExibicao,
        ubsReferencia: formatado.ubsReferencia,
        classificacaoGeral: formatado.classificacaoGeral,
        maiorTempoEsperaDias: etapaMaisAtrasada ? etapaMaisAtrasada.diasEspera : formatado.maiorTempoEsperaDias,
        demandaCritica: etapaMaisAtrasada ? etapaMaisAtrasada.titulo : 'Sem pendências',
        especialidadeCritica: etapaMaisAtrasada ? etapaMaisAtrasada.especialidade : '-',
        protocoloCritico: etapaMaisAtrasada ? etapaMaisAtrasada.protocolo : '-',
        statusAtual: etapaMaisAtrasada ? etapaMaisAtrasada.status : 'CONCLUIDO',
        resumoTrilha: formatado.resumoTrilha
      };
    });

    return lista.sort((a, b) => b.maiorTempoEsperaDias - a.maiorTempoEsperaDias);
  }

  /**
   * 7 & 9. Indicadores de Desempenho e Painel em Tempo Real
   */
  obterIndicadoresTempoReal(contextoLGPD) {
    const alertasSemAndamento = this.obterAlertasExamesSemAndamento(contextoLGPD);
    const pacientesMaiorAtraso = this.obterPacientesMaiorAtraso(contextoLGPD);

    // Soma métricas das filas por especialidade
    const filaTotal = database.filasPorEspecialidade.reduce(
      (acc, f) => acc + f.totalPacientesFila,
      0
    );
    const mediaEsperaGlobal = Math.round(
      database.filasPorEspecialidade.reduce((acc, f) => acc + f.tempoMedioEsperaDias, 0) /
        database.filasPorEspecialidade.length
    );
    const mediaSucessoExames = Number(
      (
        database.filasPorEspecialidade.reduce((acc, f) => acc + f.taxaSucessoExames, 0) /
        database.filasPorEspecialidade.length
      ).toFixed(1)
    );

    return {
      timestampAtualizacao: new Date().toISOString(),
      contextoLGPDAtivo: contextoLGPD,
      kpisDesempenho: {
        filaTotalRegulacao: filaTotal,
        tempoMedioEsperaDias: mediaEsperaGlobal,
        taxaSucessoExamesPercentual: mediaSucessoExames,
        totalExamesSemAndamento: alertasSemAndamento.length,
        pacientesAcima60Dias: pacientesMaiorAtraso.filter((p) => p.maiorTempoEsperaDias >= 60).length,
        atendimentosRealizadosMes: 42310,
        taxaAbsenteismoPercentual: 11.8
      },
      filasPorEspecialidade: database.filasPorEspecialidade,
      alertasExamesSemAndamento: alertasSemAndamento,
      pacientesMaiorAtraso,
      integracoesPublicas: database.integracoesPublicas,
      logsAuditoriaLGPD: database.logsAuditoriaLGPD.slice(0, 12)
    };
  }

  /**
   * 4. Ação de Controle de Fila: Destravar exame parado, agendar ou priorizar paciente
   */
  executarAcaoRegulacao({ pacienteId, etapaId, acao, novaData, novoHorario, contextoLGPD, ip }) {
    const paciente = database.pacientes.find((p) => p.id === pacienteId);
    if (!paciente) {
      throw new Error('Paciente não localizado na base de regulação.');
    }

    const etapa = paciente.trilha.find((t) => t.id === etapaId);
    if (!etapa) {
      throw new Error('Etapa da trilha não encontrada.');
    }

    let descricaoAcao = '';

    if (acao === 'DESTRAVAR_AGENDAR') {
      etapa.status = 'AGENDADO';
      etapa.diasSemAndamento = 0;
      etapa.posicaoFila = 1;
      etapa.dataAgendada = novaData || '2026-11-16';
      etapa.horario = novoHorario || '09:30';
      etapa.observacao = `Agendamento liberado manualmente pela Regulação (${contextoLGPD.nome}).`;
      descricaoAcao = `AGENDAMENTO_PRIORITARIO (${etapa.protocolo})`;

      // Adiciona notificação em tempo real para o paciente ver no app dele!
      paciente.notificacoes.unshift({
        id: Date.now(),
        titulo: `Vaga Liberada: ${etapa.titulo}`,
        mensagem: `A Central de Regulação agendou seu exame/consulta para ${etapa.dataAgendada.split('-').reverse().join('/')} às ${etapa.horario}.`,
        tempoAtras: 'Agora mesmo',
        lida: false,
        tipo: 'sucesso'
      });
    } else if (acao === 'ELEVAR_PRIORIDADE_VERMELHA') {
      etapa.classificacaoRisco = 'VERMELHO';
      paciente.classificacaoGeral = 'VERMELHO';
      etapa.posicaoFila = 1;
      etapa.diasSemAndamento = 0;
      etapa.observacao = `Prioridade elevada para VERMELHO (Emergência/Risco Clínico) por ${contextoLGPD.nome}.`;
      descricaoAcao = `RECLASSIFICACAO_RISCO_VERMELHO (${etapa.protocolo})`;
    } else if (acao === 'LIBERAR_LAUDO_EXAME') {
      etapa.status = 'CONCLUIDO';
      etapa.diasSemAndamento = 0;
      etapa.posicaoFila = null;
      etapa.resultadoExame = {
        codigoLaudo: `LAUDO-RNDS-${Math.floor(1000 + Math.random() * 9000)}`,
        dataLiberacao: new Date().toLocaleString('pt-BR'),
        statusClinico: 'LAUDO_LIBERADO',
        resumo: 'Exame processado via integração RNDS/Laboratório Municipal. Parâmetros dentro dos limites esperados para o quadro.',
        conclusaoMedica: 'Exame concluído com sucesso. Encaminhado ao prontuário e-SUS da UBS.',
        assinaturaDigital: `ICP-Brasil • Validado por ${contextoLGPD.nome}`
      };
      descricaoAcao = `LIBERACAO_LAUDO_RNDS (${etapa.protocolo})`;
    }

    // Registra na trilha de auditoria LGPD
    registrarLogLGPD({
      operador: contextoLGPD.nome,
      perfilLGPD: contextoLGPD.perfilLGPD,
      acao: descricaoAcao || acao,
      alvo: `${paciente.nome} (${mascararCPF(paciente.cpf)})`,
      justificativaLegal: 'Art. 11, II, f - Regulação Médica e Garantia de Acesso à Saúde',
      ip
    });

    return this.formatarPacienteParaGestao(paciente, contextoLGPD, true);
  }
}

module.exports = new JornadaService();

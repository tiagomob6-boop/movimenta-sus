/**
 * Movimenta SUS - Controller do Paciente (controllers/pacienteController.js)
 * --------------------------------------------------------------------------
 * Alimenta a experiência Mobile-First do cidadão:
 * 1. Trilha completa do paciente (consultas, exames, procedimentos, datas, horários e posição na fila);
 * 2. Painel demonstrativo com "Minha Saúde em Números" e gráfico de filas por especialidade;
 * 3. Confirmação de presença em consultas agendadas (redução de absenteísmo).
 */

const database = require('../models/database');
const jornadaService = require('../services/jornadaService');

class PacienteController {
  /**
   * Retorna os dados consolidados da jornada do paciente (por CPF na query ou paciente padrão)
   */
  obterJornadaPaciente(req, res) {
    const { cpf } = req.query;
    const paciente = jornadaService.buscarPacientePorCPF(cpf) || database.pacientes[0];

    // Contabiliza os cards de atalho para o paciente selecionado
    const totalSolicitacoes = paciente.trilha.length;
    const consultasCount = paciente.trilha.filter((t) => t.tipo === 'CONSULTA').length;
    const examesCount = paciente.trilha.filter((t) => t.tipo === 'EXAME').length;
    const procedimentosCount = paciente.trilha.filter((t) => t.tipo === 'PROCEDIMENTO').length;

    return res.status(200).json({
      sucesso: true,
      dados: {
        paciente: {
          id: paciente.id,
          nome: paciente.nome,
          cpf: paciente.cpf,
          cns: paciente.cns,
          idade: paciente.idade,
          telefone: paciente.telefone,
          unidadeReferencia: paciente.ubsReferencia,
          equipeESF: paciente.equipeESF,
          nivelGovBr: paciente.nivelGovBr,
          classificacaoGeral: paciente.classificacaoGeral
        },
        resumoSolicitacoes: {
          minhasSolicitacoes: totalSolicitacoes,
          consultasAgendadas: consultasCount,
          examesPendentes: examesCount,
          procedimentosFila: procedimentosCount
        },
        saudeEmNumeros: {
          pacientesNaFila: 14820,
          atendimentosRealizados: 42310,
          tempoMedioEsperaDias: 18,
          taxaAbsenteismoPercentual: 11.8
        },
        metricasPessoais: paciente.metricasPaciente,
        filasPorEspecialidade: database.filasPorEspecialidade.map((f) => ({
          especialidade: f.especialidade,
          percentual: f.percentualDemanda,
          cor: f.cor,
          tempoMedioDias: f.tempoMedioEsperaDias,
          totalFila: f.totalPacientesFila
        })),
        trilha: paciente.trilha,
        notificacoes: paciente.notificacoes,
        pacientesDisponiveisDemo: database.pacientes.map((p) => ({
          cpf: p.cpf,
          nome: p.nome,
          classificacaoGeral: p.classificacaoGeral
        }))
      }
    });
  }

  /**
   * Permite que o paciente confirme sua presença em uma consulta ou exame agendado
   */
  confirmarPresenca(req, res) {
    const { cpf, etapaId } = req.body;
    const paciente = jornadaService.buscarPacientePorCPF(cpf) || database.pacientes[0];

    const etapa = paciente.trilha.find((t) => t.id === etapaId);
    if (!etapa) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Item da trilha não encontrado.'
      });
    }

    etapa.confirmadoPaciente = true;
    etapa.observacao = 'Presença confirmada pelo cidadão via App Movimenta SUS.';

    paciente.notificacoes.unshift({
      id: Date.now(),
      titulo: 'Presença Confirmada com Sucesso!',
      mensagem: `Sua presença em "${etapa.titulo}" (${etapa.horario}) foi registrada no e-SUS/SISREG.`,
      tempoAtras: 'Agora mesmo',
      lida: false,
      tipo: 'sucesso'
    });

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Presença confirmada! Obrigado por contribuir para reduzir as filas do SUS.',
      etapaAtualizada: etapa
    });
  }
}

module.exports = new PacienteController();

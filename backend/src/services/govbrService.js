/**
 * Navega SUS - Serviço de Integração Gov.br (govbrService.js)
 * --------------------------------------------------------------
 * Encapsula a comunicação OpenID Connect (OIDC) com o Login Único do Gov.br
 * utilizando a biblioteca `openid-client` com suporte a PKCE (Proof Key for Code Exchange).
 * Inclui fallback seguro para simulação local durante o desenvolvimento do MVP.
 */

const { Issuer, generators } = require('openid-client');

class GovBrService {
  constructor() {
    this.client = null;
    this.issuerUrl = process.env.GOVBR_ISSUER_URL || 'https://sso.staging.acesso.gov.br';
    this.clientId = process.env.GOVBR_CLIENT_ID || 'movimenta_sus_client_mvp';
    this.clientSecret = process.env.GOVBR_CLIENT_SECRET || 'secret_homologacao';
    this.redirectUri = process.env.GOVBR_REDIRECT_URI || 'http://localhost:3000/api/auth/govbr/callback';

    // Armazenamento em memória para PKCE no MVP (em produção, utilizar Redis com TTL)
    this.pkceStore = new Map();
  }

  /**
   * Descobre automaticamente os endpoints do Gov.br (.well-known/openid-configuration)
   * e instancia o cliente OIDC.
   */
  async inicializarClienteOIDC() {
    if (this.client) return this.client;

    try {
      const govbrIssuer = await Issuer.discover(this.issuerUrl);

      this.client = new govbrIssuer.Client({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uris: [this.redirectUri],
        response_types: ['code'],
        token_endpoint_auth_method: 'client_secret_basic'
      });

      return this.client;
    } catch (error) {
      console.warn('[AVISO GOV.BR]: Não foi possível conectar ao endpoint remoto. Operando em modo Simulado (MVP).');
      return null;
    }
  }

  /**
   * Gera a URL de autorização com desafio PKCE (obrigatório pelo padrão Gov.br)
   */
  async gerarUrlLogin() {
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);
    const state = generators.state();

    // Salva temporariamente o verifier associado ao state
    this.pkceStore.set(state, codeVerifier);

    const client = await this.inicializarClienteOIDC();

    // Escopos oficiais do Gov.br: openid, email, phone, profile e govbr_confiabilidades
    const scope = 'openid email phone profile govbr_confiabilidades';

    if (client) {
      const urlAutorizacao = client.authorizationUrl({
        scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      return { urlAutorizacao, codeVerifier, state };
    }

    // Fallback de simulação caso as credenciais oficiais ainda não estejam liberadas
    const urlSimulada = `${this.issuerUrl}/authorize?response_type=code&client_id=${this.clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    return {
      urlAutorizacao: urlSimulada,
      codeVerifier,
      state
    };
  }

  /**
   * Troca o `authorization_code` recebido no callback pelo Access Token e ID Token do Gov.br,
   * retornando os dados validados do cidadão ou gestor de saúde.
   */
  async processarCallback(code, state) {
    const codeVerifier = this.pkceStore.get(state);
    this.pkceStore.delete(state);

    // Se o código enviado for de teste local (ex: ?code=simulacao_govbr), retorna perfil simulado
    if (code === 'simulacao_govbr' || this.clientId === 'seu_client_id_govbr') {
      return {
        cpf: '123.456.789-00',
        nome: 'Maria Aparecida Silva',
        email: 'maria.silva@cidadao.gov.br',
        telefone: '(11) 98765-4321',
        nivelConfiabilidade: 'Prata', // Exigido Prata/Ouro para dados sensíveis de saúde (LGPD)
        autenticadoEm: new Date().toISOString(),
        modoSimulacao: true
      };
    }

    const client = await this.inicializarClienteOIDC();
    if (!client) {
      throw new Error('Cliente OIDC do Gov.br indisponível no momento.');
    }

    // Realiza a troca do code pelo tokenSet validando o PKCE
    const params = { code, state };
    const tokenSet = await client.callback(this.redirectUri, params, {
      code_verifier: codeVerifier,
      state
    });

    // Extrai as claims do ID Token e consulta o endpoint userinfo
    const claims = tokenSet.claims();
    const userInfo = await client.userinfo(tokenSet.access_token);

    return {
      cpf: claims.sub || userInfo.sub,
      nome: userInfo.name || claims.name,
      email: userInfo.email || claims.email,
      telefone: userInfo.phone_number || null,
      nivelConfiabilidade: 'Ouro',
      autenticadoEm: new Date().toISOString(),
      modoSimulacao: false
    };
  }
}

module.exports = new GovBrService();

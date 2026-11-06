type FalhaAuth = { code?: string; status?: number; message?: string; name?: string };

export const ERROS_LOGIN: Record<string, string> = {
  '1': 'E-mail ou senha incorretos. Confira os dados e tente de novo.',
  configuracao: 'Não foi possível conectar sua conta. A configuração de acesso do app precisa ser conferida.',
  confirmar: 'Confirme seu e-mail antes de entrar.',
  limite: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
  conexao: 'Não foi possível conectar ao serviço de acesso. Tente novamente em instantes.',
};

export function codigoErroLogin(error: unknown): string {
  const e = (error ?? {}) as FalhaAuth;
  if (e.message?.toLowerCase().includes('invalid api key')) return 'configuracao';
  if (e.code === 'email_not_confirmed') return 'confirmar';
  if (e.status === 429 || e.code === 'over_request_rate_limit') return 'limite';
  if (e.code === 'invalid_credentials' || e.message === 'Invalid login credentials') return '1';
  return 'conexao';
}

export function registrarFalhaLogin(error: unknown): void {
  const e = (error ?? {}) as FalhaAuth;
  // Apenas categorias conhecidas: nunca registre senha, chave, email ou o objeto completo.
  console.error('XLanguage login:', codigoErroLogin(e), 'status:', typeof e.status === 'number' ? e.status : 'indisponível');
}

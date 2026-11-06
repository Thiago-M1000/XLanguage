// Compatibilidade com a rota antiga, agora usando a validação e o banco do XLanguage.
import type {APIRoute} from 'astro';
import {POST as salvar} from './xlanguage/[acao]';
export const POST:APIRoute=context=>salvar({...context,params:{acao:'palavra'}});

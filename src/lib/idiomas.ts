export const IDIOMAS = [
 {codigo:'en-US',nome:'Inglês',curto:'EN',icone:'🇬🇧'}, {codigo:'es-ES',nome:'Espanhol',curto:'ES',icone:'🇪🇸'},
 {codigo:'fr-FR',nome:'Francês',curto:'FR',icone:'🇫🇷'}, {codigo:'de-DE',nome:'Alemão',curto:'DE',icone:'🇩🇪'},
 {codigo:'it-IT',nome:'Italiano',curto:'IT',icone:'🇮🇹'}, {codigo:'pt-BR',nome:'Português',curto:'PT',icone:'🇧🇷'},
 {codigo:'ja-JP',nome:'Japonês',curto:'JA',icone:'🇯🇵'}, {codigo:'ko-KR',nome:'Coreano',curto:'KO',icone:'🇰🇷'},
 {codigo:'zh-CN',nome:'Mandarim',curto:'ZH',icone:'🇨🇳'},
] as const;
export type CodigoIdioma = typeof IDIOMAS[number]['codigo'];
export function idioma(codigo: string) { return IDIOMAS.find(i=>i.codigo===codigo) ?? IDIOMAS[0]; }
export function idiomaValido(value: unknown): value is CodigoIdioma { return typeof value==='string' && IDIOMAS.some(i=>i.codigo===value); }

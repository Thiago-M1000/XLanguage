export const IDIOMAS = [
 {codigo:'en-US',nome:'Inglês',curto:'EN',icone:'🇬🇧',bandeira:'gb.png'}, {codigo:'es-ES',nome:'Espanhol',curto:'ES',icone:'🇪🇸',bandeira:'es.png'},
 {codigo:'fr-FR',nome:'Francês',curto:'FR',icone:'🇫🇷',bandeira:'fr.png'}, {codigo:'de-DE',nome:'Alemão',curto:'DE',icone:'🇩🇪',bandeira:'de.png'},
 {codigo:'it-IT',nome:'Italiano',curto:'IT',icone:'🇮🇹',bandeira:'it.png'}, {codigo:'pt-BR',nome:'Português',curto:'PT',icone:'🇧🇷',bandeira:'br.png'},
 {codigo:'ja-JP',nome:'Japonês',curto:'JA',icone:'🇯🇵',bandeira:'jp.png'}, {codigo:'ko-KR',nome:'Coreano',curto:'KO',icone:'🇰🇷',bandeira:'kr.png'},
 {codigo:'zh-CN',nome:'Mandarim',curto:'ZH',icone:'🇨🇳',bandeira:'cn.png'},
] as const;
export type CodigoIdioma = typeof IDIOMAS[number]['codigo'];
export function idioma(codigo: string) { return IDIOMAS.find(i=>i.codigo===codigo) ?? IDIOMAS[0]; }
export function idiomaValido(value: unknown): value is CodigoIdioma { return typeof value==='string' && IDIOMAS.some(i=>i.codigo===value); }

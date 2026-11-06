export function falar(texto:string,lang='en-US'){
 if(!('speechSynthesis' in window))return false;
 window.speechSynthesis.cancel();const fala=new SpeechSynthesisUtterance(texto);fala.lang=lang;fala.rate=.9;
 const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())??voices.find(v=>v.lang.split('-')[0]===lang.split('-')[0]);if(voice)fala.voice=voice;
 window.speechSynthesis.speak(fala);return true;
}

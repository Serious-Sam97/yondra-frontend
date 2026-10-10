import { useSyncExternalStore } from "react";

// T-13 · the Vortex UI (settings, rack, panels) in PT-BR and EN. His lines
// stay in English — that's the character's voice. Language follows the
// browser unless you pick one in the rack.

export type Lang = "en" | "pt";
const KEY = "yd:vortex.lang";
const subs = new Set<() => void>();

export function vxLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "pt") return v;
    return navigator.language?.toLowerCase().startsWith("pt") ? "pt" : "en";
  } catch {
    return "en";
  }
}
export function setVxLang(l: Lang) {
  try {
    localStorage.setItem(KEY, l);
  } catch {}
  for (const s of subs) s();
}
export function useVxLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    vxLang,
    () => "en",
  );
}

const D = {
  rack: ["VORTEX · EFFECTS RACK", "VORTEX · RACK DE EFEITOS"],
  rackHint: [
    "Each unit is one group of settings. Everything here stays on this device unless it says otherwise.",
    "Cada unidade é um grupo de ajustes. Tudo fica neste aparelho, a não ser quando dito.",
  ],
  power: ["POWER", "ENERGIA"],
  powerHint: [
    "The real off switch. Lift the cover first.",
    "O interruptor de verdade. Levante a tampa antes.",
  ],
  lift: ["lift cover", "levantar tampa"],
  close: ["close cover", "fechar tampa"],
  on: ["ON", "LIGADO"],
  off: ["OFF", "DESLIGADO"],
  intensity: ["INTENSITY", "INTENSIDADE"],
  polite: ["polite", "educado"],
  mischief: ["mischief", "travesso"],
  unhinged: ["unhinged", "descontrolado"],
  headgames: ["HEAD GAMES", "JOGOS MENTAIS"],
  headgamesHint: [
    "tilting pages, ghost cursors, the lying clock",
    "páginas tortas, cursores fantasmas, o relógio mentiroso",
  ],
  noises: ["TAPE NOISES", "RUÍDOS DE FITA"],
  volume: ["volume", "volume"],
  soundtrack: ["soundtrack", "trilha"],
  dark: ["DARK", "LADO SOMBRIO"],
  scares: ["scares", "sustos"],
  pauseDay: ["pause 1 day", "pausar 1 dia"],
  pauseWeek: ["pause 1 week", "pausar 1 semana"],
  pausedUntil: ["paused until", "pausado até"],
  maxStage: ["max stage", "estágio máximo"],
  sensors: ["SENSORS", "SENSORES"],
  mic: ["mic", "microfone"],
  camera: ["camera", "câmera"],
  motion: ["motion", "movimento"],
  location: ["location", "localização"],
  social: ["SOCIAL", "SOCIAL"],
  visits: ["visits", "visitas"],
  rankings: ["rankings", "rankings"],
  outside: ["OUTSIDE", "FORA DO APP"],
  email: ["email", "e-mail"],
  push: ["push", "notificações"],
  calendar: ["calendar", "calendário"],
  memory: ["MEMORY", "MEMÓRIA"],
  facts: ["facts in his dossier", "fatos no dossiê"],
  forget: ["forget everything", "esquecer tudo"],
  forgetHint: [
    "Deletes his soul, the dossier, the diary, letters, reminders, trades, scores and the economy. Can't be undone.",
    "Apaga a alma, o dossiê, o diário, as cartas, lembretes, trocas, placares e a economia. Não tem volta.",
  ],
  keepAch: ["keep my achievements", "manter minhas conquistas"],
  password: ["your password", "sua senha"],
  confirmForget: ["forget it all", "apagar tudo"],
  cancel: ["cancel", "cancelar"],
  forgotten: [
    "Done. He doesn't know you anymore. He'll pretend he does.",
    "Pronto. Ele não te conhece mais. Vai fingir que conhece.",
  ],
  telemetry: ["share anonymous counts", "compartilhar contagens anônimas"],
  telemetryHint: [
    "Which of his bits you close fast or click. Counted here; sent once a day, with no name, only if this is on.",
    "Quais coisas dele você fecha rápido ou clica. Contado aqui; enviado 1×/dia, sem nome, só se ligado.",
  ],
  calm: ["CALM MODE", "MODO CALMO"],
  calmHint: ["less motion, fewer words", "menos movimento, menos fala"],
  lang: ["language", "idioma"],
} as const;

export type VxKey = keyof typeof D;
export const t = (k: VxKey, l: Lang = vxLang()) => D[k][l === "pt" ? 1 : 0];

/* T-13 · the rest of his interface (panels, drawer, case, ghosts), keyed by
   the English text so components keep their shape: tr("the dossier"). Only
   interface chrome is translated — never what he says. */
const PT: Record<string, string> = {
  // outside the app
  "OUTSIDE THE APP · every channel opt-in": "FORA DO APP · cada canal é opt-in",
  copy: "copiar",
  "take him with you:": "leve ele com você:",
  "share card": "cartão para compartilhar",
  "print the zine": "imprimir o fanzine",
  "cassette j-card for:": "encarte de cassete para:",
  "The Void Report": "The Void Report",
  "Monday morning, by email: your week in his voice. One click unsubscribes. If you vanish for two weeks, one note. Just one.":
    "Segunda de manhã, por e-mail: sua semana na voz dele. Um clique descadastra. Se você sumir por duas semanas, um bilhete. Só um.",
  "Send the Void Report by email": "Enviar o Void Report por e-mail",
  "His calendar": "O calendário dele",
  "Subscribe in any calendar app: your deadlines (with commentary), tape moons, the anniversary of the migration.":
    "Assine em qualquer app de calendário: seus prazos (com comentários), luas de bobina, o aniversário da migração.",
  "Publish the calendar feed": "Publicar o calendário",
  "calendar link": "link do calendário",
  "Slack, weekly": "Slack, toda semana",
  "A Slack incoming-webhook URL. He posts the week there in his Polite voice. Clear it to stop.":
    "Uma URL de webhook do Slack. Ele posta a semana lá na voz Polite. Apague para parar.",
  "Slack webhook URL": "URL do webhook do Slack",
  save: "salvar",
  clear: "limpar",
  Terminal: "Terminal",
  "A read-only key for npx yondra-vortex: he comments on your open cards from the shell. Switch off and the key dies.":
    "Uma chave só-leitura para npx yondra-vortex: ele comenta seus cards abertos pelo terminal. Desligue e a chave morre.",
  "Create a terminal key": "Criar uma chave de terminal",
  "terminal command": "comando do terminal",
  "Browser pages": "Avisos do navegador",
  "He can page you, even with the tab closed. One per day, max.":
    "Ele pode te chamar, mesmo com a aba fechada. No máximo um por dia.",
  "Allow one browser notification a day":
    "Permitir um aviso do navegador por dia",
  "03:13": "03:13",
  'If the tab is open at 3:13 am, a single "you up?". You asked for this.':
    'Se a aba estiver aberta às 3:13, um único "you up?". Você pediu.',
  "Allow the 3:13 page": "Permitir o aviso das 3:13",
  "wallpaper scene": "cena do papel de parede",
  "phone wallpaper": "papel de parede · celular",
  "desktop wallpaper": "papel de parede · desktop",
  "ultrawide wallpaper": "papel de parede · ultrawide",
  "his nest": "o ninho dele",
  "the below": "o Abaixo",
  "dimension 1985": "dimensão 1985",
  // the weird stuff
  "THE WEIRD STUFF · experimental, all opt-in":
    "AS COISAS ESTRANHAS · experimental, tudo opt-in",
  "right now:": "agora:",
  "the studio": "o estúdio",
  demolition: "demolição",
  popcorn: "pipoca",
  speedrun: "speedrun",
  "let him drive": "deixar ele dirigir",
  "fork him": "dividir ele em dois",
  "His own voice": "A voz própria dele",
  "A synthesized tape voice built in your browser, with a preset per mood. Needs Tape noises on.":
    "Uma voz de fita sintetizada no seu navegador, com um ajuste por humor. Precisa dos ruídos de fita ligados.",
  "The screen is round": "A tela é redonda",
  "He leaves through one edge and comes back through the other. Sometimes he knocks from outside.":
    "Ele sai por uma borda e volta pela outra. Às vezes bate no vidro do lado de fora.",
  "He walks between tabs": "Ele anda entre abas",
  "With two Yondra windows side by side, he crosses from one to the other.":
    "Com duas janelas do Yondra lado a lado, ele atravessa de uma para a outra.",
  Microphone: "Microfone",
  "He reacts to loudness and whistles. Only a volume and a pitch number exist; nothing is recorded, transcribed or sent.":
    "Ele reage a barulho e assobio. Só existem um número de volume e um de tom; nada é gravado, transcrito ou enviado.",
  Camera: "Câmera",
  "Face detection on this device: he plays statue when you look away and naps when you leave. Frames never leave. A red eye shows while it's on.":
    "Detecção de rosto neste aparelho: ele brinca de estátua quando você desvia o olhar e cochila quando você sai. As imagens não saem daqui. Um olho vermelho aparece enquanto está ligada.",
  "Tilt & shake (phones)": "Inclinar e sacudir (celular)",
  "Tilt and he rolls, shake and he gets sick, flip the phone and he falls up. Vibrates a little.":
    "Incline e ele rola, sacuda e ele enjoa, vire o celular e ele cai para cima. Vibra um pouco.",
  Battery: "Bateria",
  "He notices when you're about to die. The battery, I mean.":
    "Ele percebe quando você está quase morrendo. A bateria, no caso.",
  "Your weather": "O seu clima",
  "Asks for your approximate location, rounds it to ~10 km and sends only that to open-meteo.com to ask about the sky. Rain, sun, cold, storms.":
    "Pede sua localização aproximada, arredonda para ~10 km e manda só isso para open-meteo.com perguntar do céu. Chuva, sol, frio, tempestade.",
  "His cursor": "O cursor dele",
  "Now and then a second cursor copies your clicks and points at things. It never clicks anything. Needs Head games.":
    "De vez em quando um segundo cursor copia seus cliques e aponta coisas. Ele nunca clica em nada. Precisa dos jogos mentais.",
  "The fork": "O fork",
  "Rarely, he splits in two and the copies argue. You pick which one stays.":
    "Raramente ele se divide em dois e as cópias brigam. Você escolhe qual fica.",
  "Fake maintenance": "Manutenção falsa",
  "At most once a month: a 10-second 'defragmenting' screen with a skip button. Only you see it. Needs Head games.":
    "No máximo uma vez por mês: uma tela de 10 s de 'desfragmentando' com botão de pular. Só você vê. Precisa dos jogos mentais.",
  "Interrupted broadcast": "Transmissão interrompida",
  "At most once a month, Unhinged only: one second of colour bars and a quiet tone, then a bulletin.":
    "No máximo uma vez por mês, só no Descontrolado: um segundo de barras de cor e um tom baixo, depois um boletim.",
  // creator
  "SHAPE HIM · tricks, lines, a costume, his genome":
    "MOLDE ELE · truques, falas, uma fantasia, o genoma",
  tricks: "truques",
  when: "quando",
  do: "fazer",
  teach: "ensinar",
  "a card hits done": "um card chega em done",
  "a card moves": "um card se move",
  "a card opens": "um card abre",
  "a card is archived": "um card é arquivado",
  "a card jams": "um card trava",
  "a card is renamed": "um card é renomeado",
  "you arrive": "você chega",
  "teach him a line": "ensine uma fala a ele",
  "his taste, according to your thumbs": "o gosto dele, segundo seus polegares",
  "a costume of your own": "uma fantasia sua",
  hat: "chapéu",
  extra: "extra",
  colour: "cor",
  detail: "detalhe",
  "sew it & wear it": "costurar e vestir",
  "his genome": "o genoma dele",
  "Traits, tastes, scars and costume. Nothing about you or your work. A teammate can paste it to get a visit.":
    "Traços, gostos, cicatrizes e fantasia. Nada sobre você ou seu trabalho. Um colega pode colar para receber uma visita.",
  "invite a visitor": "convidar um visitante",
  trigger: "gatilho",
  animation: "animação",
  "and say… (optional)": "e dizer… (opcional)",
  "what he says": "o que ele diz",
  "forget this trick": "esquecer este truque",
  "something he'd say. or should.": "algo que ele diria. ou deveria.",
  "a line for him": "uma fala para ele",
  "make him forget this line": "fazer ele esquecer esta fala",
  "genome code": "código do genoma",
  "paste a VX1… genome": "cole um genoma VX1…",
  "a genome to invite": "um genoma para convidar",
  // drawer
  "his drawer": "a gaveta dele",
  "things he keeps. don't tell him you looked.":
    "coisas que ele guarda. não conte que você olhou.",
  "▤ open his case": "▤ abrir a maleta dele",
  "vital signs": "sinais vitais",
  "the dossier": "o dossiê",
  letters: "cartas",
  "his diary": "o diário dele",
  "the file": "o arquivo",
  videotapes: "fitas de vídeo",
  "the shelf": "a estante",
  "the ghosts": "os fantasmas",
  "Vortex's drawer": "A gaveta do Vortex",
  "tuning in…": "sintonizando…",
  CONTEMPT: "DESPREZO",
  RESPECT: "RESPEITO",
  age: "idade",
  "tape left (all of us)": "fita restante (de todos nós)",
  deaths: "mortes",
  traits: "traços",
  scars: "cicatrizes",
  corruption: "corrupção",
  condition: "estado",
  "mould. stay a while, move some cards, talk to him.":
    "mofo. fique um pouco, mova uns cards, converse com ele.",
  "opening…": "abrindo…",
  "a small notebook, padlocked. it says DO NOT on the cover. just “do not”.":
    "um caderninho com cadeado. na capa está escrito DO NOT. só “do not”.",
  "the key is somewhere below. he'd never leave it lying around. (he would.)":
    "a chave está em algum lugar lá embaixo. ele nunca a deixaria largada. (deixaria.)",
  "nothing written yet. he writes at night.":
    "nada escrito ainda. ele escreve à noite.",
  "pulling the file…": "puxando a ficha…",
  CONFIDENTIAL: "CONFIDENCIAL",
  "nothing on file. talk to him and it fills up. that's the deal.":
    "nada na ficha. converse com ele e ela enche. esse é o trato.",
  redact: "tarjar",
  "burn the whole file": "queimar a ficha inteira",
  "Forget this": "Esquecer isto",
  "opening the drawer…": "abrindo a gaveta…",
  "no letters yet. he writes once a month. on a day only he knows.":
    "nenhuma carta ainda. ele escreve uma vez por mês. num dia que só ele sabe.",
  "fragments recorded · the rest are hiding":
    "fragmentos registrados · o resto está escondido",
  "dusting the shelf…": "tirando o pó da estante…",
  "their shelves:": "as estantes deles:",
  "that shelf is behind glass. private.":
    "essa estante está atrás do vidro. privada.",
  "rewinding the tapes…": "rebobinando as fitas…",
  "no episodes yet. the series starts when he's ready. you'll know.":
    "nenhum episódio ainda. a série começa quando ele estiver pronto. você vai saber.",
  "your choice is on this tape": "a sua escolha está nesta fita",
  "▶ rewatch": "▶ rever",
  rewatch: "rever",
  // the case
  "his case": "a maleta dele",
  "everything here rots him a little. that's the price on top of the price.":
    "tudo aqui apodrece ele um pouco. é o preço em cima do preço.",
  "the shutter is going up…": "a porta de aço está subindo…",
  buy: "comprar",
  "◂ back to the case": "◂ voltar para a maleta",
  "unlatching…": "destravando…",
  "empty foam. go below. win something. steal something.":
    "espuma vazia. desça. ganhe alguma coisa. roube alguma coisa.",
  "cursed. only the ERASE altar below takes it.":
    "amaldiçoado. só o altar do APAGAR lá embaixo aceita.",
  none: "nenhum",
  "◉ token counter": "◉ balcão de fichas",
  "◎ the splicer": "◎ a emendadora",
  "✶ the archivist": "✶ o arquivista",
  "▓ a hooded stall": "▓ uma barraca encapuzada",
  "solder it": "soldar",
  "solder next": "soldar o próximo",
  accept: "aceitar",
  decline: "recusar",
  "nobody to trade with. share a board with someone.":
    "ninguém para trocar. compartilhe um quadro com alguém.",
  "(no item)": "(nenhum item)",
  offer: "oferecer",
  "the tape-to-tape deck: other dimensions":
    "o deck de duas fitas: outras dimensões",
  Close: "Fechar",
  to: "para",
  give: "dar",
  tokens: "fichas",
  // ghosts
  "counting ghosts…": "contando fantasmas…",
  "my vortex may visit teammates' boards and be seen":
    "meu vortex pode visitar os quadros dos colegas e ser visto",
  "your workspace turned the ghost society off.":
    "seu workspace desligou a sociedade dos fantasmas.",
  "no ghosts around. your team hasn't opted in. or they're all dead inside.":
    "nenhum fantasma por perto. seu time não ligou isso. ou estão todos mortos por dentro.",
  "⚡ static attack": "⚡ ataque de estática",
  "🏅 golden plaque": "🏅 placa de ouro",
  engrave: "gravar",
  "ghost gossip": "fofoca de fantasma",
  "the static choir (3 voices at once)":
    "o coral de estática (3 vozes ao mesmo tempo)",
  "hold a note": "segurar uma nota",
  "show his private contempt ranking (of ghosts, not people. always absurd.)":
    "mostrar o ranking secreto de desprezo dele (de fantasmas, não de pessoas. sempre absurdo.)",
  "report something a ghost delivered":
    "denunciar algo que um fantasma entregou",
  "workspace moderation (admin)": "moderação do workspace (admin)",
  "turn the ghost society off for everyone":
    "desligar a sociedade dos fantasmas para todos",
  "keep every Vortex on Polite": "manter todo Vortex no Educado",
  "for…": "por…",
  "what for": "por quê",
  board: "quadro",
  "the recorders · make, collect, keep":
    "os gravadores · fazer, colecionar, guardar",
  "the listeners · lore and mysteries": "os ouvintes · lore e mistérios",
  "the demagnetised · chaos and dark": "os desmagnetizados · caos e escuridão",
  // vital signs
  MOOD: "HUMOR",
  CAUSE: "CAUSA",
  HUNGER: "FOME",
  BOREDOM: "TÉDIO",
  SANITY: "SANIDADE",
  LONELY: "SOLIDÃO",
  EGO: "EGO",
  ENERGY: "ENERGIA",
  "calls you": "te chama de",
  days: "dias",
  "days together": "dias juntos",
  "none. yet.": "nenhuma. ainda.",
  stage: "estágio",
  on: "ligado",
  off: "desligado",
  // costume parts
  cap: "boné",
  tophat: "cartola",
  horns: "chifres",
  halo: "auréola",
  crown: "coroa",
  bow: "laço",
  antenna: "antena",
  bandana: "bandana",
  beanie: "gorro",
  glasses: "óculos",
  monocle: "monóculo",
  mustache: "bigode",
  bandaid: "curativo",
  flower: "flor",
  scar: "cicatriz",
  bowtie: "gravata-borboleta",
  earring: "brinco",
  // drawer + case
  "SUBJECT FILE": "FICHA",
  entries: "registros",
  labels: "etiquetas",
  "let my team see this shelf": "deixar meu time ver esta estante",
  "side a · work": "lado a · trabalho",
  "side b · chaos": "lado b · caos",
  "side c · lore": "lado c · lore",
  "the 22 cards of the tarot": "as 22 cartas do tarô",
  "the 12 tapes of the radio": "as 12 fitas da rádio",
  "the eyes of the splicer": "os olhos da emendadora",
  "the wardrobe": "o guarda-roupa",
  "the case": "a maleta",
  case: "maleta",
  wardrobe: "guarda-roupa",
  bench: "bancada",
  sets: "coleções",
  level: "nível",
  trades: "trocas",
  "the token counter": "o balcão de fichas",
  "the splicer's mods": "os mods da emendadora",
  "the archivist's rare shelf": "a prateleira rara do arquivista",
  // the weird overlays + studio
  "MIC · never recorded": "MICROFONE · nada é gravado",
  stop: "parar",
  CAMERA: "CÂMERA",
  nobody: "ninguém",
  "you looked away": "você desviou o olhar",
  "too close": "perto demais",
  watching: "vendo",
  "● VORTEX IS DRIVING": "● O VORTEX ESTÁ DIRIGINDO",
  "stop the tour": "parar o tour",
  "THE GHOST IS DEFRAGMENTING": "O FANTASMA ESTÁ DESFRAGMENTANDO",
  "back in {n} seconds.": "volta em {n} segundos.",
  skip: "pular",
  "this is just Vortex being Vortex. yondra is fine. your work is fine.":
    "é só o Vortex sendo o Vortex. o yondra está bem. seu trabalho está bem.",
  "pick one. the other becomes static. no pressure.":
    "escolha um. o outro vira estática. sem pressão.",
  "✕ end the movie": "✕ acabar o filme",
  "end run": "encerrar a corrida",
  card: "card",
  "THE STUDIO": "O ESTÚDIO",
  "▶ PLAY": "▶ TOCAR",
  "■ STOP": "■ PARAR",
  "let him improve it": "deixar ele melhorar",
  "● REC": "● GRAVAR",
  "share link": "link para compartilhar",
  erase: "apagar",
};

/* achievements: the server sends English titles; their ids ("done-25") are
   enough to rebuild them in PT (tier · label), secrets stay "? ? ?" */
const TIER_PT: Record<number, string> = {
  1: "primeira",
  5: "regular",
  10: "devota",
  25: "veterana",
  50: "lenda",
  100: "mito",
};
const MEASURE_PT: Record<string, [string, string]> = {
  done: ["um card concluído", "%d cards concluídos"],
  minutes: ["uma hora em fita", "%d horas em fita"],
  chats: ["uma conversa com ele", "%d conversas com ele"],
  level: ["nível um (boas-vindas)", "nível %d"],
  days: ["um dia juntos", "%d dias juntos"],
  kind: ["uma palavra gentil", "%d palavras gentis"],
  tokens: ["uma ficha ganha", "%d fichas ganhas"],
  games: ["uma partida no fliperama", "%d partidas no fliperama"],
  night: ["uma madrugada", "%d madrugadas"],
  fed: ["um card dado a ele", "%d cards dados a ele"],
  caught: ["uma mentira pega", "%d mentiras pegas"],
  costumes: ["uma fantasia", "%d fantasias"],
  trades: ["uma troca com o time", "%d trocas com o time"],
  fragments: ["um fragmento achado", "%d fragmentos achados"],
  episodes: ["um episódio visto", "%d episódios vistos"],
  rooms: ["uma sala lá embaixo", "%d salas lá embaixo"],
  echoes: ["um eco recolhido", "%d ecos recolhidos"],
  tapes: ["uma fita da rádio guardada", "%d fitas da rádio guardadas"],
  deaths: ["um funeral", "%d funerais"],
  endings: ["um final visto", "%d finais vistos"],
};
export function achTitle(
  a: { id: string; title: string; secret?: boolean },
  l: Lang = vxLang(),
): string {
  if (l !== "pt" || a.secret) return a.title;
  const m = /^([a-z]+)-(\d+)$/.exec(a.id);
  const tpl = m ? MEASURE_PT[m[1]] : undefined;
  if (!m || !tpl) return a.title;
  const n = Number(m[2]);
  return `${TIER_PT[n] ?? n} · ${n === 1 ? tpl[0] : tpl[1].replace("%d", String(n))}`;
}

/** translate a piece of his interface (falls back to the English text) */
export const tr = (en: string, l: Lang = vxLang()) =>
  l === "pt" ? (PT[en] ?? en) : en;
/** for tests: every key has a translation that isn't empty */
export const ptKeys = () => Object.entries(PT);

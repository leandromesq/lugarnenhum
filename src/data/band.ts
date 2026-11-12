export const band = {
  name: "Lugar Nenhum",
  description: "músicas vindas de lugar nenhum, indo pra lugar algum",
  announcement: "EM BREVE: RÁDIO BESORRO EP - 2027",
  biography: [
    "Lugar Nenhum é uma banda do interior paulista, formada em Presidente Prudente, que transita em uma série de vertentes experimentais da música alternativa.",
    "Formada por Pedro Gazoni (bateria), Leandro Mesquita (vocais, teclas e guitarra), José Macedo (baixo) e Eduardo Lapenta (guitarras e synths).",
    "A banda explora o choque entre o analógico e o digital, entre aquilo que é palpável, orgânico e natural e um mundo fortemente mediado por tecnologias. Sua música parte da tentativa de tornar o digital físico, explorando ruídos, imperfeições, limitações e acidentes como elementos musicais.",
    "Essa estética também nasce da própria realidade do interior: enquanto tecnologias mais recentes demoram a chegar, equipamentos antigos, baratos e acessíveis permanecem disponíveis para serem explorados de maneiras pouco convencionais. O que poderia ser uma limitação se transforma em ferramenta criativa.",
    "A Lugar Nenhum busca, assim, encontrar novas possibilidades em tecnologias consideradas ultrapassadas, combinando instrumentos, equipamentos analógicos e processos digitais para criar uma sonoridade que transita entre o humano e o tecnológico, o familiar e o estranho, o obsoleto e o futuro.",
  ],
};

export interface HotspotRect {
  /** Fractions (0–1) of the photograph's own width and height. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  instagram: string;
  /** Where the member stands in home-desktop.webp and home-mobile.webp. */
  hotspot: { desktop: HotspotRect; mobile: HotspotRect };
  /** Long biography from the 2026 portfolio, used by the presskit. */
  biography: string;
}

export const members: readonly Member[] = [
  {
    id: "leandro-mesquita",
    name: "Leandro Mesquita",
    role: "vocais, teclas e guitarra",
    instagram: "lelezonio",
    hotspot: {
      desktop: { x: 0.224, y: 0.367, width: 0.118, height: 0.55 },
      mobile: { x: 0.227, y: 0.272, width: 0.236, height: 0.41 },
    },
    biography:
      'Compositor e vocalista da banda Lugar Nenhum, de Presidente Prudente/SP, participa da criação do repertório autoral do grupo. Integrou como vocalista o projeto José Macedo e Banda, financiado pelo Edital 001/2021 – Lei Emergencial Aldir Blanc, de Teodoro Sampaio em 2021. Em 2026, participou da composição coletiva da música "Ainda dá tempo", na Oficina Bem-Viver: (Re)Significar o Envelhecimento, no Centro de Convivência do Idoso do Jardim Novo Bandeirantes, em Cambé/PR. Colaborou na criação da letra, da melodia e do arranjo e apresentou a canção com voz e violão no encerramento da oficina. Além da composição e da interpretação vocal, é responsável pelo desenvolvimento do site da Lugar Nenhum.',
  },
  {
    id: "jose-macedo",
    name: "José Macedo",
    role: "baixo",
    instagram: "jhn_macedo",
    hotspot: {
      desktop: { x: 0.345, y: 0.324, width: 0.165, height: 0.6 },
      mobile: { x: 0, y: 0.228, width: 0.222, height: 0.5 },
    },
    biography:
      "Músico, compositor e intérprete, baixista da banda de indie rock Lugar Nenhum, de Presidente Prudente/SP, participa da criação coletiva do repertório autoral do grupo, reunido no EP de estreia Rádio Besorro. Lançou nas plataformas digitais os singles autorais Just a Kid e Caos Eventual, ambos em 2020. Em 2021, foi contemplado pelo Edital 001/2021 – Lei Emergencial Aldir Blanc, de Teodoro Sampaio, com o projeto José Macedo e Banda, que contou com Pedro Gazoni e Leandro Mesquita, hoje integrantes da Lugar Nenhum, como músicos e intérpretes. Na época, o grupo atuava sob o nome Besorro, tocando covers de indie rock, e foi nessa fase que surgiram as composições reunidas no EP, cujo título homenageia esse período. Uma das músicas do EP já foi apresentada por ele em voz e violão no festival Diversonoridade, em Presidente Prudente. No processo de produção independente da banda, gravou os baixos e as guitarras das demos do EP.",
  },
  {
    id: "pedro-gazoni",
    name: "Pedro Gazoni",
    role: "bateria e produção",
    instagram: "pedro.gazoni",
    hotspot: {
      desktop: { x: 0.515, y: 0.395, width: 0.118, height: 0.53 },
      mobile: { x: 0.468, y: 0.302, width: 0.236, height: 0.45 },
    },
    biography:
      "Multi-instrumentista e autodidata, desenvolveu sua base musical em instrumentos de cordas, teclas e percussão. Em 2020, integrou-se como baterista na banda Os Paulos, com a qual realizou uma turnê de despedida em 2023, passando por locais importantes de Presidente Prudente, incluindo o Sesc Thermas, e pela cidade de Araçatuba. Em seguida, acompanhou a formação do grupo musical Boasorte, participando da composição e gravação do álbum Indelével, lançado em 2024 e com shows de lançamento em Presidente Prudente e São Paulo. Paralelamente às bandas, produziu o projeto José Macedo e Banda, financiado pelo Edital 001/2021 – Lei Emergencial Aldir Blanc, de Teodoro Sampaio, em 2023, gravou e produziu a trilha sonora do projeto PONTAL em REDE, do grupo DEArquitetura no ProAC 19/2023-1694.1086.5650 e em 2025 produziu a trilha sonora do documentário Nasci RUY, morri HERÓI da produtora Filmes 18 mm contemplado no edital 07/2024 - PNAB. Atualmente é Baterista e Produtor da banda de indie rock Lugar Nenhum. Suas experiências resultam em uma sonoridade que combina o analógico e o digital, a instrumentação e a produção musical.",
  },
  {
    id: "eduardo-lapenta",
    name: "Eduardo Lapenta",
    role: "guitarras e synths",
    instagram: "dulpnt",
    hotspot: {
      desktop: { x: 0.636, y: 0.41, width: 0.12, height: 0.52 },
      mobile: { x: 0.708, y: 0.28, width: 0.262, height: 0.47 },
    },
    biography:
      "Multi-instrumentista com educação musical, desenvolveu suas habilidades através de instrumentos de cordas e teclas. Participante ativo do cenário underground prudentino, colaborou com muitas bandas e projetos da região. Em 2025, foi produtor musical do EP de estréia da banda conterrânea Moments. Atualmente é guitarrista e tecladista da banda Lugar Nenhum, explorando novas sonoridades e cenários musicais aliados a experiências prévias obtidas.",
  },
];

/** "Trajetória" and "próximo lançamento" from the 2026 portfolio. */
export const history: readonly string[] = [
  "A trajetória da Lugar Nenhum tem início em 2020, com a formação da banda Besorro, projeto precursor que daria origem à atual formação. Inicialmente composta por Pedro Gazoni e Leandro Mesquita, a banda surge durante o período de isolamento social provocado pela pandemia de COVID-19, realizando transmissões ao vivo pela plataforma Twitch. As apresentações eram dedicadas a versões de músicas de diferentes artistas, muitas vezes escolhidas a partir dos pedidos enviados pelo público no chat.",
  "Ainda em 2020, o projeto ganha novos integrantes com a chegada de José Macedo e Gabriel Prioste, consolidando sua primeira formação completa e ampliando as possibilidades musicais das apresentações ao vivo.",
  "Em 2021, a banda é contemplada pelo edital Aldir Blanc, no município de Teodoro Sampaio (SP). Como parte da realização do projeto, Pedro Gazoni, Leandro Mesquita e José Macedo apresentam uma transmissão ao vivo que marca um ponto de virada na trajetória do grupo. Ao final da apresentação, é executada a primeira guia de uma composição autoral que posteriormente daria origem ao EP Conselhos/Promessas. A experiência desperta o interesse pela criação de repertório próprio e inaugura uma nova perspectiva para o projeto, até então dedicado principalmente a interpretações de músicas de outros artistas.",
  "Após um período dedicado à composição e ao desenvolvimento de ideias, a banda entra em hiato, interrompendo temporariamente suas atividades.",
  "Em 2025, o projeto retoma suas atividades com a chegada de Eduardo Lapenta, iniciando uma nova etapa de sua trajetória. A retomada marca também a transição definitiva da antiga Besorro para Lugar Nenhum, acompanhada pelo início da produção oficial do EP completo e pela consolidação de uma nova identidade artística.",
];

export const nextRelease =
  "A Lugar Nenhum tem como próximo objetivo o lançamento de seu primeiro EP, Rádio Besorro, para 2027, composto por seis faixas autorais. O trabalho representa a consolidação de um processo criativo iniciado ainda em 2021 e marca um novo capítulo na trajetória da banda. A partir do lançamento, o grupo busca ampliar sua circulação, dando continuidade a uma história que, desde sua origem, se constrói a partir da experimentação, da colaboração e da criação musical independente.";

export const navigation = [
  { href: "/musica", label: "OUÇA NOSSA MÚSICA", shortLabel: "MÚSICA" },
  { href: "/loja", label: "NOSSA LOJA", shortLabel: "LOJA" },
  { href: "/quem-somos", label: "QUEM SOMOS", shortLabel: "SOBRE" },
] as const;

export interface Release {
  id: string;
  title: string;
  format: string;
  duration: string;
  status: string;
  /** Supply the official listening URL when available. Never fake playback. */
  listenUrl?: string;
}

/** 15-second excerpt of the unfinished guide track; label it as a preview. */
export function previewPath(release: Release): string {
  return `/assets/audio/${release.id}.mp3`;
}

/** Square label artwork mapped onto the 3D disc; also the static fallback. */
export function labelPath(release: Release): string {
  return `/assets/models/cd/${release.id}.webp`;
}

export const releases: readonly Release[] = [
  {
    id: "conselhos-promessas",
    title: "conselhos/promessas",
    format: "FAIXA",
    duration: "3:46",
    status: "Streaming em breve.",
  },
  {
    id: "passo-tanto-tempo-so",
    title: "passo tanto tempo só",
    format: "FAIXA",
    duration: "3:18",
    status: "Streaming em breve.",
  },
  {
    id: "sempre-andei-no-seu-caminho",
    title: "Sempre andei no seu caminho",
    format: "FAIXA",
    duration: "2:21",
    status: "Streaming em breve.",
  },
  {
    id: "interludio",
    title: "interlúdio",
    format: "FAIXA",
    duration: "1:00",
    status: "Streaming em breve.",
  },
  {
    id: "o-que-eu-vejo-em-voce",
    title: "o que eu vejo em você",
    format: "FAIXA",
    duration: "4:06",
    status: "Streaming em breve.",
  },
  {
    id: "todas-as-coisas",
    title: "todas as coisas",
    format: "FAIXA",
    duration: "2:46",
    status: "Streaming em breve.",
  },
];

export const band = {
  name: "Lugar Nenhum",
  description: "músicas vindas de lugar nenhum, indo pra lugar algum",
  announcement:
    "OUÇA AGORA: EP BESORRO FM - DISPONÍVEL EM TODAS AS PLATAFORMAS DE STREAMING",
  biography: [
    "lugar nenhum é uma banda de dream pop noise rock post punk midwest emo slowcore neo psychedelia indie sleaze lo-fi nugaze sophisti-pop ethereal wave drone glitch power eletronics free improvisation shoegaze Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla felis  urna, vestibulum sed pretium sed, accumsan sit amet erat. Fusce dictum  ipsum eu turpis fringilla, a auctor neque scelerisque. Suspendisse  tempor diam a magna luctus, et fermentum velit ornare. Fusce id quam ac  elit ullamcorper maximus eget ac magna. Ut tempor dolor sed scelerisque  convallis.",
    "Nunc semper pharetra nunc vitae sodales. Fusce neque mi, maximus  lobortis mi sit amet, efficitur euismod neque. Vestibulum ornare quam in ante elementum, ut maximus lectus suscipit. Cras id sollicitudin mi.  Praesent congue vitae nulla vel ornare. Donec vitae odio vel lacus  interdum tristique non placerat nisi. Quisque volutpat quam eu enim  feugiat molestie. Vestibulum ornare dolor a tellus mattis feugiat.",
  ],
};

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

export const releases: readonly Release[] = [
  {
    id: "conselhos-promessas",
    title: "conselhos/promessas",
    format: "FAIXA",
    duration: "3:46",
    status: "Links de streaming em breve.",
  },
  {
    id: "passo-tanto-tempo-so",
    title: "passo tanto tempo só",
    format: "FAIXA",
    duration: "3:18",
    status: "Links de streaming em breve.",
  },
  {
    id: "sempre-andei-no-seu-caminho",
    title: "Sempre andei no seu caminho",
    format: "FAIXA",
    duration: "2:21",
    status: "Links de streaming em breve.",
  },
  {
    id: "interludio",
    title: "interlúdio",
    format: "FAIXA",
    duration: "1:00",
    status: "Links de streaming em breve.",
  },
  {
    id: "o-que-eu-vejo-em-voce",
    title: "o que eu vejo em você",
    format: "FAIXA",
    duration: "4:06",
    status: "Links de streaming em breve.",
  },
  {
    id: "todas-as-coisas",
    title: "todas as coisas",
    format: "FAIXA",
    duration: "2:46",
    status: "Links de streaming em breve.",
  },
];

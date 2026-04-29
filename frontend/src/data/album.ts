/**
 * Modelo de dados do álbum Panini FIFA World Cup 2026.
 *
 * Estrutura matemática (980 = 9 + 11 + 48 × 20):
 *   - 9 figurinhas Introduction (especiais)
 *   - 11 figurinhas FIFA Museum / campeões passados (especiais)
 *   - 48 seleções, 20 figurinhas cada:
 *       · 1 escudo metalizado (especial)
 *       · 1 foto da equipe
 *       · 18 jogadores
 *
 * Total de especiais: 9 + 11 + 48 = 68 ✓
 *
 * IDs no formato Panini: <CODE><N>, ex: "BRA7", "FWC3", "FM11", "ARG17".
 * - CODE: prefixo de 3 letras (FIFA country code) ou prefixo de seção especial.
 * - N: 1-based dentro do conjunto.
 *
 * A ordem das seleções e a numeração página-a-página NÃO foram localizadas
 * online em 2026-04-28. São preenchidas em `TEAM_ORDER` abaixo (placeholder)
 * e refinadas quando o usuário tiver o álbum em mãos para fotografar o sumário.
 */

export const ALBUM_TOTAL = 980
export const ALBUM_PAGES = 112
export const ALBUM_SPECIAL_COUNT = 68

export const STICKERS_PER_TEAM = 20
export const INTRO_COUNT = 9
export const MUSEUM_COUNT = 11
export const TEAM_COUNT = 48

export type SectionKind = 'intro' | 'museum' | 'team'
export type SlotKind = 'crest' | 'team_photo' | 'player' | 'intro' | 'museum'

export interface Sticker {
  id: string
  section: SectionKind
  /** Código de 3 letras (BRA, ARG, FWC, FM…). */
  code: string
  /** 1-based dentro do conjunto/seleção. */
  index: number
  isSpecial: boolean
  label: string
  /** Tipo dentro da seleção / seção. */
  slot: SlotKind
  /** Página do álbum onde a figurinha mora (1-112). undefined para seções
   *  cujas páginas ainda não foram mapeadas. */
  page?: number
}

export interface Team {
  /** Código de 3 letras usado no álbum Panini 2026. */
  code: string
  /** Nome em português (alinhado à fonte oficial fifa.com/pt). */
  name: string
  /** Grupo da Copa (A..L). */
  group: string
  /** Página onde a seleção começa no álbum impresso (cada seleção ocupa 2 páginas). */
  startPage: number
  /** Emoji da bandeira (regional indicator / subdivision flag). */
  flag: string
}

/**
 * Códigos especiais (provisórios — confirmar com o álbum em mãos).
 * Usamos FWC pra Introduction e FM pra FIFA Museum por convenção comum
 * de edições anteriores; podem ser ajustados sem quebrar o app.
 */
export const INTRO_CODE = 'FWC'
export const MUSEUM_CODE = 'FM'

/**
 * Lista oficial das 48 seleções na ordem do álbum impresso, agrupadas
 * em A..L (4 por grupo). Ordem e códigos confirmados a partir do índice
 * fotografado pelo usuário em 2026-04-28.
 *
 * Cada seleção ocupa 2 páginas. Há um intervalo entre os grupos F e G
 * (páginas 56-57 são reservadas para outra coisa — provavelmente seção
 * intermediária com FWC/Heroes).
 */
export const TEAMS: Team[] = [
  // Grupo A
  { code: 'MEX', name: 'México',           group: 'A', startPage: 8,   flag: '🇲🇽' },
  { code: 'RSA', name: 'África do Sul',    group: 'A', startPage: 10,  flag: '🇿🇦' },
  { code: 'KOR', name: 'Coreia do Sul',    group: 'A', startPage: 12,  flag: '🇰🇷' },
  { code: 'CZE', name: 'Tchéquia',         group: 'A', startPage: 14,  flag: '🇨🇿' },
  // Grupo B
  { code: 'CAN', name: 'Canadá',           group: 'B', startPage: 16,  flag: '🇨🇦' },
  { code: 'BIH', name: 'Bósnia e Herzegovina', group: 'B', startPage: 18, flag: '🇧🇦' },
  { code: 'QAT', name: 'Catar',            group: 'B', startPage: 20,  flag: '🇶🇦' },
  { code: 'SUI', name: 'Suíça',            group: 'B', startPage: 22,  flag: '🇨🇭' },
  // Grupo C
  { code: 'BRA', name: 'Brasil',           group: 'C', startPage: 24,  flag: '🇧🇷' },
  { code: 'MAR', name: 'Marrocos',         group: 'C', startPage: 26,  flag: '🇲🇦' },
  { code: 'HAI', name: 'Haiti',            group: 'C', startPage: 28,  flag: '🇭🇹' },
  { code: 'SCO', name: 'Escócia',          group: 'C', startPage: 30,  flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Grupo D
  { code: 'USA', name: 'EUA',              group: 'D', startPage: 32,  flag: '🇺🇸' },
  { code: 'PAR', name: 'Paraguai',         group: 'D', startPage: 34,  flag: '🇵🇾' },
  { code: 'AUS', name: 'Austrália',        group: 'D', startPage: 36,  flag: '🇦🇺' },
  { code: 'TUR', name: 'Turquia',          group: 'D', startPage: 38,  flag: '🇹🇷' },
  // Grupo E
  { code: 'GER', name: 'Alemanha',         group: 'E', startPage: 40,  flag: '🇩🇪' },
  { code: 'CUW', name: 'Curaçau',          group: 'E', startPage: 42,  flag: '🇨🇼' },
  { code: 'CIV', name: 'Costa do Marfim',  group: 'E', startPage: 44,  flag: '🇨🇮' },
  { code: 'ECU', name: 'Equador',          group: 'E', startPage: 46,  flag: '🇪🇨' },
  // Grupo F
  { code: 'NED', name: 'Holanda',          group: 'F', startPage: 48,  flag: '🇳🇱' },
  { code: 'JPN', name: 'Japão',            group: 'F', startPage: 50,  flag: '🇯🇵' },
  { code: 'SWE', name: 'Suécia',           group: 'F', startPage: 52,  flag: '🇸🇪' },
  { code: 'TUN', name: 'Tunísia',          group: 'F', startPage: 54,  flag: '🇹🇳' },
  // [páginas 56-57 são seção especial entre F e G]
  // Grupo G
  { code: 'BEL', name: 'Bélgica',          group: 'G', startPage: 58,  flag: '🇧🇪' },
  { code: 'EGY', name: 'Egito',            group: 'G', startPage: 60,  flag: '🇪🇬' },
  { code: 'IRN', name: 'Irã',              group: 'G', startPage: 62,  flag: '🇮🇷' },
  { code: 'NZL', name: 'Nova Zelândia',    group: 'G', startPage: 64,  flag: '🇳🇿' },
  // Grupo H
  { code: 'ESP', name: 'Espanha',          group: 'H', startPage: 66,  flag: '🇪🇸' },
  { code: 'CPV', name: 'Cabo Verde',       group: 'H', startPage: 68,  flag: '🇨🇻' },
  { code: 'KSA', name: 'Arábia Saudita',   group: 'H', startPage: 70,  flag: '🇸🇦' },
  { code: 'URU', name: 'Uruguai',          group: 'H', startPage: 72,  flag: '🇺🇾' },
  // Grupo I
  { code: 'FRA', name: 'França',           group: 'I', startPage: 74,  flag: '🇫🇷' },
  { code: 'SEN', name: 'Senegal',          group: 'I', startPage: 76,  flag: '🇸🇳' },
  { code: 'IRQ', name: 'Iraque',           group: 'I', startPage: 78,  flag: '🇮🇶' },
  { code: 'NOR', name: 'Noruega',          group: 'I', startPage: 80,  flag: '🇳🇴' },
  // Grupo J
  { code: 'ARG', name: 'Argentina',        group: 'J', startPage: 82,  flag: '🇦🇷' },
  { code: 'ALG', name: 'Argélia',          group: 'J', startPage: 84,  flag: '🇩🇿' },
  { code: 'AUT', name: 'Áustria',          group: 'J', startPage: 86,  flag: '🇦🇹' },
  { code: 'JOR', name: 'Jordânia',         group: 'J', startPage: 88,  flag: '🇯🇴' },
  // Grupo K
  { code: 'POR', name: 'Portugal',         group: 'K', startPage: 90,  flag: '🇵🇹' },
  { code: 'COD', name: 'RD do Congo',      group: 'K', startPage: 92,  flag: '🇨🇩' },
  { code: 'UZB', name: 'Uzbequistão',      group: 'K', startPage: 94,  flag: '🇺🇿' },
  { code: 'COL', name: 'Colômbia',         group: 'K', startPage: 96,  flag: '🇨🇴' },
  // Grupo L
  { code: 'ENG', name: 'Inglaterra',       group: 'L', startPage: 98,  flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'CRO', name: 'Croácia',          group: 'L', startPage: 100, flag: '🇭🇷' },
  { code: 'GHA', name: 'Gana',             group: 'L', startPage: 102, flag: '🇬🇭' },
  { code: 'PAN', name: 'Panamá',           group: 'L', startPage: 104, flag: '🇵🇦' },
]

if (TEAMS.length !== TEAM_COUNT) {
  throw new Error(`TEAMS deve ter ${TEAM_COUNT} entradas (atualmente ${TEAMS.length})`)
}

/**
 * Gera todas as 980 figurinhas no formato canônico.
 * Ordem: Introduction → FIFA Museum → 48 seleções na ordem de TEAMS.
 *
 * Para cada seleção, dentro dos 20 slots:
 *   1 = escudo (especial)
 *   2 = foto da equipe
 *   3..20 = jogadores
 */
export function buildAllStickers(): Sticker[] {
  const all: Sticker[] = []

  for (let i = 1; i <= INTRO_COUNT; i++) {
    all.push({
      id: `${INTRO_CODE}${i}`,
      section: 'intro',
      code: INTRO_CODE,
      index: i,
      isSpecial: true,
      label: `Introdução ${i}`,
      slot: 'intro',
    })
  }

  for (let i = 1; i <= MUSEUM_COUNT; i++) {
    all.push({
      id: `${MUSEUM_CODE}${i}`,
      section: 'museum',
      code: MUSEUM_CODE,
      index: i,
      isSpecial: true,
      label: `FIFA Museum ${i}`,
      slot: 'museum',
    })
  }

  // Padrão confirmado em 6 seleções fotografadas (MEX, CAN, BIH, QAT, BRA, SCO):
  //   slot 1  = escudo metalizado (especial)
  //   slot 13 = foto da equipe + nome multilíngue
  //   slots 2-12, 14-20 = 18 jogadores
  // Slots 1-10 ficam na página par (startPage); 11-20 na página ímpar (startPage+1).
  for (const team of TEAMS) {
    for (let i = 1; i <= STICKERS_PER_TEAM; i++) {
      const isCrest = i === 1
      const isTeamPhoto = i === 13
      const slot: SlotKind = isCrest ? 'crest' : isTeamPhoto ? 'team_photo' : 'player'
      const playerNumber = i < 13 ? i - 1 : i - 2
      all.push({
        id: `${team.code}${i}`,
        section: 'team',
        code: team.code,
        index: i,
        isSpecial: isCrest,
        label: isCrest
          ? `${team.name} — escudo`
          : isTeamPhoto
            ? `${team.name} — foto da equipe`
            : `${team.name} — jogador ${playerNumber}`,
        slot,
        page: i <= 10 ? team.startPage : team.startPage + 1,
      })
    }
  }

  return all
}

export const ALL_STICKERS: Sticker[] = buildAllStickers()

if (ALL_STICKERS.length !== ALBUM_TOTAL) {
  throw new Error(`Esperava ${ALBUM_TOTAL} figurinhas, gerou ${ALL_STICKERS.length}`)
}

const specialCount = ALL_STICKERS.filter((s) => s.isSpecial).length
if (specialCount !== ALBUM_SPECIAL_COUNT) {
  throw new Error(`Esperava ${ALBUM_SPECIAL_COUNT} especiais, gerou ${specialCount}`)
}

export const STICKERS_BY_ID: Map<string, Sticker> = new Map(
  ALL_STICKERS.map((s) => [s.id, s]),
)

export const TEAMS_BY_CODE: Map<string, Team> = new Map(TEAMS.map((t) => [t.code, t]))

/**
 * Normaliza um candidato vindo do OCR para o formato canônico do ID.
 * Aceita variações como "bra 7", "BRA-7", "BRA07" → "BRA7".
 * Retorna null se não bater com nenhum sticker válido.
 */
export function normalizeStickerId(raw: string): string | null {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = cleaned.match(/^([A-Z]{2,3})0*(\d+)$/)
  if (!match) return null
  const id = `${match[1]}${match[2]}`
  return STICKERS_BY_ID.has(id) ? id : null
}

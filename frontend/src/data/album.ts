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

export interface Sticker {
  id: string
  section: SectionKind
  /** Código de 3 letras (BRA, ARG, FWC, FM…). */
  code: string
  /** 1-based dentro do conjunto/seleção. */
  index: number
  isSpecial: boolean
  label: string
}

export interface Team {
  /** Código FIFA de 3 letras. */
  code: string
  /** Nome em português. */
  name: string
  /** Grupo da Copa (A..L), opcional até o sorteio definitivo. */
  group?: string
}

/**
 * Códigos especiais (provisórios — confirmar com o álbum em mãos).
 * Usamos FWC pra Introduction e FM pra FIFA Museum por convenção comum
 * de edições anteriores; podem ser ajustados sem quebrar o app.
 */
export const INTRO_CODE = 'FWC'
export const MUSEUM_CODE = 'FM'

/**
 * Ordem provisória das 48 seleções classificadas para a Copa 2026.
 * Usada para gerar IDs e relacionar figurinhas a páginas. Será reordenada
 * quando soubermos a sequência real do álbum impresso (foto do sumário).
 *
 * Anfitriões primeiro (México, Canadá, EUA), depois ordem alfabética como
 * placeholder seguro. Lista das 48 classificadas baseada em divulgações de
 * abril/2026; ajuste conforme repescagens finais.
 */
export const TEAMS: Team[] = [
  // Anfitriões
  { code: 'MEX', name: 'México' },
  { code: 'CAN', name: 'Canadá' },
  { code: 'USA', name: 'Estados Unidos' },
  // CONMEBOL
  { code: 'ARG', name: 'Argentina' },
  { code: 'BRA', name: 'Brasil' },
  { code: 'COL', name: 'Colômbia' },
  { code: 'ECU', name: 'Equador' },
  { code: 'PAR', name: 'Paraguai' },
  { code: 'URU', name: 'Uruguai' },
  // UEFA
  { code: 'AUT', name: 'Áustria' },
  { code: 'BEL', name: 'Bélgica' },
  { code: 'CRO', name: 'Croácia' },
  { code: 'DEN', name: 'Dinamarca' },
  { code: 'ENG', name: 'Inglaterra' },
  { code: 'FRA', name: 'França' },
  { code: 'GER', name: 'Alemanha' },
  { code: 'NED', name: 'Países Baixos' },
  { code: 'NOR', name: 'Noruega' },
  { code: 'POR', name: 'Portugal' },
  { code: 'SCO', name: 'Escócia' },
  { code: 'ESP', name: 'Espanha' },
  { code: 'SUI', name: 'Suíça' },
  { code: 'TUR', name: 'Turquia' },
  { code: 'WAL', name: 'País de Gales' },
  { code: 'CZE', name: 'Tchéquia' },
  { code: 'POL', name: 'Polônia' },
  // CAF
  { code: 'ALG', name: 'Argélia' },
  { code: 'CPV', name: 'Cabo Verde' },
  { code: 'CIV', name: 'Costa do Marfim' },
  { code: 'EGY', name: 'Egito' },
  { code: 'GHA', name: 'Gana' },
  { code: 'MAR', name: 'Marrocos' },
  { code: 'SEN', name: 'Senegal' },
  { code: 'RSA', name: 'África do Sul' },
  { code: 'TUN', name: 'Tunísia' },
  // AFC
  { code: 'AUS', name: 'Austrália' },
  { code: 'IRN', name: 'Irã' },
  { code: 'JPN', name: 'Japão' },
  { code: 'JOR', name: 'Jordânia' },
  { code: 'KOR', name: 'Coreia do Sul' },
  { code: 'KSA', name: 'Arábia Saudita' },
  { code: 'UZB', name: 'Uzbequistão' },
  { code: 'QAT', name: 'Catar' },
  // CONCACAF (além dos anfitriões)
  { code: 'CRC', name: 'Costa Rica' },
  { code: 'CUW', name: 'Curaçao' },
  { code: 'HAI', name: 'Haiti' },
  { code: 'PAN', name: 'Panamá' },
  // OFC
  { code: 'NZL', name: 'Nova Zelândia' },
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
    })
  }

  for (const team of TEAMS) {
    for (let i = 1; i <= STICKERS_PER_TEAM; i++) {
      const isCrest = i === 1
      const isTeamPhoto = i === 2
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
            : `${team.name} — jogador ${i - 2}`,
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

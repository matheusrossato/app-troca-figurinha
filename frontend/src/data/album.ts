/**
 * Modelo de dados do álbum Panini FIFA World Cup 2026.
 *
 * Estrutura confirmada com o álbum em mãos (2026-04-29):
 *   - 19 figurinhas FWC (intro + FIFA Museum/History)
 *       · pág 1-3: 8 da introdução (taça, mascotes, slogan, Trionda, taças coloridas)
 *       · pág 106-109: 11 do FIFA Museum (1 por Copa, mas só 11 de 22 Copas
 *         viraram figurinha — as outras fotos com hologram são decoração fixa)
 *   - 14 figurinhas Coca-Cola (CC1-CC14)
 *       · pág 112-113: jogadores patrocinados pela Coca-Cola
 *
 * Páginas sem figurinhas (só impresso): 4-7 (sumário), 56-57 (intervalo F-G),
 * 110-111 ("Road to FIFA World Cup 2026" — eliminatórias).
 *   - 48 seleções, 20 figurinhas cada (960 figurinhas):
 *       · 1 escudo metalizado (especial)
 *       · 1 foto da equipe (slot 13)
 *       · 18 jogadores
 *
 * Total: 19 + 14 + 960 = 993 figurinhas, em até 113 páginas (incl. contracapa).
 *
 * IDs no formato Panini: <CODE><N>, ex: "BRA7", "FWC3", "CC11", "ARG17".
 */

export const ALBUM_TOTAL = 993
export const ALBUM_PAGES = 113

export const STICKERS_PER_TEAM = 20
export const TEAM_COUNT = 48

export type SectionKind = 'fwc' | 'team' | 'cocacola'
export type SlotKind = 'crest' | 'team_photo' | 'player' | 'fwc' | 'cocacola'

export interface Sticker {
  id: string
  section: SectionKind
  /** Código de 3 letras (BRA, ARG…) ou prefixo de seção especial (FWC, CC). */
  code: string
  /** 1-based dentro do conjunto/seleção. */
  index: number
  isSpecial: boolean
  label: string
  /** Tipo dentro da seleção / seção. */
  slot: SlotKind
  /** Página do álbum onde a figurinha mora (1-113). undefined se não mapeado. */
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

export const FWC_CODE = 'FWC'
export const CC_CODE = 'CC'

/** @deprecated mantido como alias pra não quebrar consumidores antigos. Use FWC_CODE. */
export const INTRO_CODE = FWC_CODE

/**
 * Layout completo da seção FWC (introdução + FIFA Museum/History) confirmado
 * pelo usuário em 2026-04-29 com fotos do álbum impresso.
 */
interface SectionSlot {
  id: string
  page: number
  label: string
}

export const FWC_LAYOUT: SectionSlot[] = [
  // Introdução (págs 1-3)
  { id: 'FWC1',  page: 1,   label: 'Taça Copa 2026 (esq.)' },
  { id: 'FWC2',  page: 1,   label: 'Taça Copa 2026 (dir.)' },
  { id: 'FWC3',  page: 1,   label: 'Mascotes Oficiais' },
  { id: 'FWC4',  page: 1,   label: 'Slogan Oficial' },
  { id: 'FWC5',  page: 2,   label: 'Trionda — bola oficial' },
  { id: 'FWC6',  page: 2,   label: 'Taça (fundo vermelho — Canadá)' },
  { id: 'FWC7',  page: 3,   label: 'Taça (fundo verde)' },
  { id: 'FWC8',  page: 3,   label: 'Taça (fundo azul claro)' },
  // FIFA Museum / History (págs 106-109)
  // Só 11 Copas viraram figurinha — outras fotos com hologram nas mesmas
  // páginas são decoração fixa do álbum.
  { id: 'FWC9',  page: 106, label: 'Itália 1934 — campeã' },
  { id: 'FWC10', page: 106, label: 'Uruguai 1950 — campeã' },
  { id: 'FWC11', page: 107, label: 'Alemanha Ocidental 1954 — campeã' },
  { id: 'FWC12', page: 107, label: 'Brasil 1962 — campeã' },
  { id: 'FWC13', page: 107, label: 'Alemanha Ocidental 1974 — campeã' },
  { id: 'FWC14', page: 108, label: 'Argentina 1986 — campeã' },
  { id: 'FWC15', page: 108, label: 'Brasil 1994 — campeã' },
  { id: 'FWC16', page: 109, label: 'Brasil 2002 — campeã' },
  { id: 'FWC17', page: 109, label: 'Itália 2006 — campeã' },
  { id: 'FWC18', page: 109, label: 'Alemanha 2014 — campeã' },
  { id: 'FWC19', page: 109, label: 'Argentina 2022 — campeã' },
]

export const CC_LAYOUT: SectionSlot[] = [
  // Coca-Cola pág 112 (sem numeração impressa)
  { id: 'CC1',  page: 112, label: 'Lamine Yamal (Espanha)' },
  { id: 'CC2',  page: 112, label: 'Joshua Kimmich (Alemanha)' },
  { id: 'CC3',  page: 112, label: 'Harry Kane (Inglaterra)' },
  { id: 'CC4',  page: 112, label: 'Santiago Giménez (México)' },
  { id: 'CC5',  page: 112, label: 'Joško Gvardiol (Croácia)' },
  { id: 'CC6',  page: 112, label: 'Federico Valverde (Uruguai)' },
  // Coca-Cola pág 113 (contracapa)
  { id: 'CC7',  page: 113, label: 'Jefferson Lerma (Colômbia)' },
  { id: 'CC8',  page: 113, label: 'Enner Valencia (Equador)' },
  { id: 'CC9',  page: 113, label: 'Gabriel Magalhães (Brasil)' },
  { id: 'CC10', page: 113, label: 'Virgil van Dijk (Holanda)' },
  { id: 'CC11', page: 113, label: 'Alphonso Davies (Canadá)' },
  { id: 'CC12', page: 113, label: 'Emiliano Martínez (Argentina)' },
  { id: 'CC13', page: 113, label: 'Raúl Jiménez (México)' },
  { id: 'CC14', page: 113, label: 'Lautaro Martínez (Argentina)' },
]

function buildIdsByPage(layout: SectionSlot[]): Map<number, string[]> {
  const m = new Map<number, string[]>()
  for (const slot of layout) {
    const arr = m.get(slot.page) ?? []
    arr.push(slot.id)
    m.set(slot.page, arr)
  }
  return m
}

/** Mapa página → IDs da seção FWC nessa página. */
export const FWC_IDS_BY_PAGE = buildIdsByPage(FWC_LAYOUT)
/** Mapa página → IDs da seção Coca-Cola nessa página. */
export const CC_IDS_BY_PAGE = buildIdsByPage(CC_LAYOUT)

/** @deprecated alias pra FWC_IDS_BY_PAGE. */
export const INTRO_IDS_BY_PAGE = FWC_IDS_BY_PAGE

/**
 * Lista oficial das 48 seleções na ordem do álbum impresso, agrupadas
 * em A..L (4 por grupo). Ordem e códigos confirmados a partir do índice
 * fotografado pelo usuário em 2026-04-28.
 *
 * Cada seleção ocupa 2 páginas. Há um intervalo entre os grupos F e G
 * (páginas 56-57 são reservadas para outra coisa).
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
 * Gera todas as 993 figurinhas no formato canônico.
 * Ordem: FWC (intro + museum) → Coca-Cola → 48 seleções na ordem de TEAMS.
 *
 * Para cada seleção, dentro dos 20 slots:
 *   1 = escudo (especial)
 *   13 = foto da equipe
 *   demais = jogadores
 */
export function buildAllStickers(): Sticker[] {
  const all: Sticker[] = []

  for (const [i, slot] of FWC_LAYOUT.entries()) {
    all.push({
      id: slot.id,
      section: 'fwc',
      code: FWC_CODE,
      index: i + 1,
      isSpecial: true,
      label: slot.label,
      slot: 'fwc',
      page: slot.page,
    })
  }

  for (const [i, slot] of CC_LAYOUT.entries()) {
    all.push({
      id: slot.id,
      section: 'cocacola',
      code: CC_CODE,
      index: i + 1,
      isSpecial: true,
      label: slot.label,
      slot: 'cocacola',
      page: slot.page,
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

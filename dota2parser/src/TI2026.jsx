import { useEffect, useMemo, useState } from 'react'
import playerData from './../../players_stat.json'
import leagueData from './../../leagues.json'
import liveData from './../../ti2026.json'
import teamLogoData from './../../team_logos.json'


const getTeamLogo = (teamName, fallback = '') => (
  teamLogoData?.teams?.[teamName]?.logo_url || fallback || ''
)

const SCORE_FACTORS = {
  kills: 121,
  deaths: 180,
  creep_score: 3,
  gpm: 2,
  madstone_collected: 57,
  tower_kills: 340,
  obs_placed: 113,
  camps_stacked: 170,
  runes_grabbed: 121,
  watchers_taken: 90,
  smokes_used: 283,
  roshan_kills: 850,
  teamfight_participation: 1895,
  stuns: 15,
  tormentor_kills: 850,
  courier_kills: 850,
  firstblood: 1700,
}

const ROLE_FORM_STATS = {
  0: ['gpm', 'kills', 'creep_score', 'tower_kills', 'teamfight_participation'],
  1: ['gpm', 'kills', 'runes_grabbed', 'teamfight_participation', 'stuns'],
  2: ['obs_placed', 'camps_stacked', 'teamfight_participation', 'stuns', 'smokes_used'],
}

const COPY = {
  ru: {
    sections: { progress: 'Ход турнира', predictor: 'Мой прогноз', odds: 'Шансы команд' },
    heading: 'The International 2026',
    subtitle: 'Swiss-симулятор, elimination round и полноценная double-elimination сетка.',
    statistical: 'Статистическая модель',
    unofficial: 'Формат 2026 подтверждён Valve: 5 раундов Swiss и 5 elimination-серий. Остановка на 4 победах или 4 поражениях повторяет официальный формат TI 2025; точные пары TI 2026 могут отличаться до публикации регламента.',
    selectedEvents: 'Форма команд рассчитана по выбранным предынтовым турнирам.',
    swiss: 'Swiss-стадия',
    elimination: 'Elimination Round',
    playoffs: 'Main Event',
    datesSwiss: '13–16 августа · 5 раундов · все серии Bo3 · 4 победы = проход, 4 поражения = вылет',
    datesPlayoffs: '20–23 августа · double elimination · финал Bo5',
    topThree: 'Топ-3 проходят напрямую',
    places: 'Места 4–13 играют за ещё 5 слотов',
    sixteen: '16 команд',
    eight: '8 команд в Main Event',
    liveTitle: 'Официальный ход турнира',
    liveEmpty: 'Турнир ещё не начался. Когда OpenDota опубликует TI 2026, бот найдёт League ID и начнёт добавлять сыгранные серии.',
    livePartial: 'Будущая пара появляется автоматически после первой карты серии. До публикации официального расписания сайт её не выдумывает.',
    updated: 'Обновлено',
    noUpdate: 'данных пока нет',
    round: 'Раунд',
    generateNext: 'Сформировать следующий раунд',
    lockedNext: 'Сначала выбери результат каждой серии текущего раунда.',
    scoreHint: 'Нажми на предполагаемый счёт серии.',
    reset: 'Сбросить прогноз',
    standings: 'Таблица Swiss',
    team: 'Команда',
    series: 'Серии',
    maps: 'Карты',
    status: 'Статус',
    direct: 'Прямо в плей-офф',
    eliminationStatus: 'Elimination Round',
    eliminated: 'Выбывает',
    pending: 'В игре',
    waitingSwiss: 'Заполни Swiss до конца: в пятом раунде играют 14 оставшихся команд, а команды 4–0 и 0–4 уже не участвуют.',
    waitingElimination: 'Выбери победителей пяти elimination-серий, чтобы открыть Main Event.',
    toPlayoffs: 'В Main Event',
    upperQf: 'Верхняя сетка · 1/4',
    upperSf: 'Верхняя сетка · 1/2',
    upperFinal: 'Финал верхней сетки',
    lowerR1: 'Нижняя сетка · раунд 1',
    lowerQf: 'Нижняя сетка · 1/4',
    lowerSf: 'Нижняя сетка · 1/2',
    lowerFinal: 'Финал нижней сетки',
    grandFinal: 'Гранд-финал',
    champion: 'Твой чемпион',
    probability: 'Шанс победы в серии',
    titleOdds: 'Шансы выиграть TI 2026',
    oddsHint: 'Модель симулирует весь формат несколько тысяч раз на основе формы игроков. Это не букмекерские коэффициенты и не гарантия.',
    teamStrength: 'Рейтинг формы',
    confidence: 'Матчей в выборке',
    noMatches: 'Нет матчей в выбранных турнирах',
    high: 'Высокая выборка',
    medium: 'Средняя выборка',
    low: 'Малая выборка',
    share: 'Скопировать прогноз',
    copied: 'Ссылка скопирована',
    resetConfirm: 'Прогноз очищен',
    currentRecord: 'Текущий счёт',
    outcomeBoard: 'Итог Swiss',
    directRoad: 'Проходят напрямую',
    challengers: 'Играют Elimination Round',
    outRoad: 'Покидают турнир',
    record40: '4–0',
    record41: '4–1',
    record32: '3–2',
    record23: '2–3',
    record14: '1–4',
    record04: '0–4',
    emptySlot: 'Место ещё не определено',
    swissRule: 'Команда прекращает Swiss сразу после 4-й победы или 4-го поражения.',
    roundFiveCount: '7 × Bo3',
    simulatedSeed: 'Посев симулируется по таблице и силе команд; официальный посев может отличаться.',
    officialResults: 'Последние официальные серии',
    completed: 'завершена',
    inProgress: 'идёт',
    bestOf3: 'Bo3',
    bestOf5: 'Bo5',
    formRatingLabel: 'Рейтинг формы',
    sampleMapsLabel: 'Карт команды в выборке',
    ratingExplanation: 'Рейтинг формы — сравнительная сила команды по статистике её игроков. Число карт — примерное количество командных карт в выбранной выборке, а не сумма всех пяти игроков.',
    swissSeriesTotal: 'В Swiss всего 39 серий Bo3: 8 + 8 + 8 + 8 + 7.',
    compactRounds: 'Чтобы экран не был перегружен, показывается только выбранный раунд.',
    eliminatedFromEvent: 'Выбыла из турнира',
    stillAlive: 'Продолжает борьбу',
    eliminatedOddsHint: 'После официального вылета команда становится серой, получает 0% и исключается из пересчёта шансов.',
    roadTitle: 'Дорога в Main Event',
    eliminationWinners: 'Победители Elimination',
    eliminationLosers: 'Проигравшие Elimination',
    directSlot: 'Прямой проход',
    playoffBracketTitle: 'Сетка Main Event',
    scrollBracket: 'Прокручивай сетку по горизонтали',
    pickRound: 'Выбери раунд',
    officialRecord: 'Официальный результат',
  },
  en: {
    sections: { progress: 'Tournament progress', predictor: 'My prediction', odds: 'Team chances' },
    heading: 'The International 2026',
    subtitle: 'Swiss simulator, elimination round and a full double-elimination bracket.',
    statistical: 'Statistical model',
    unofficial: 'Valve confirmed the 2026 structure: five Swiss rounds followed by five elimination series. The four-win/four-loss stop follows the official TI 2025 format; exact TI 2026 pairings may differ until the detailed rules are published.',
    selectedEvents: 'Team form uses the pre-TI tournaments selected above.',
    swiss: 'Swiss stage',
    elimination: 'Elimination Round',
    playoffs: 'Main Event',
    datesSwiss: 'August 13–16 · 5 rounds · all series Bo3 · 4 wins advance, 4 losses eliminate',
    datesPlayoffs: 'August 20–23 · double elimination · Bo5 final',
    topThree: 'Top 3 advance directly',
    places: 'Places 4–13 play for 5 more slots',
    sixteen: '16 teams',
    eight: '8 teams in the Main Event',
    liveTitle: 'Official tournament progress',
    liveEmpty: 'The tournament has not started yet. Once OpenDota publishes TI 2026, the bot will detect its League ID and begin adding played series.',
    livePartial: 'A future pairing appears automatically after the first map starts. The site will not invent an official schedule before it is published.',
    updated: 'Updated',
    noUpdate: 'no data yet',
    round: 'Round',
    generateNext: 'Generate next round',
    lockedNext: 'Choose every result in the current round first.',
    scoreHint: 'Click the predicted series score.',
    reset: 'Reset prediction',
    standings: 'Swiss standings',
    team: 'Team',
    series: 'Series',
    maps: 'Maps',
    status: 'Status',
    direct: 'Direct playoffs',
    eliminationStatus: 'Elimination Round',
    eliminated: 'Eliminated',
    pending: 'Playing',
    waitingSwiss: 'Finish the Swiss stage: round five has seven matches because the 4–0 and 0–4 teams have already stopped playing.',
    waitingElimination: 'Pick all five elimination winners to unlock the Main Event.',
    toPlayoffs: 'To Main Event',
    upperQf: 'Upper bracket quarterfinals',
    upperSf: 'Upper bracket semifinals',
    upperFinal: 'Upper bracket final',
    lowerR1: 'Lower bracket round 1',
    lowerQf: 'Lower bracket quarterfinals',
    lowerSf: 'Lower bracket semifinal',
    lowerFinal: 'Lower bracket final',
    grandFinal: 'Grand Final',
    champion: 'Your champion',
    probability: 'Series win chance',
    titleOdds: 'Chances to win TI 2026',
    oddsHint: 'The model simulates the full format several thousand times using player form. These are not betting odds or a guarantee.',
    teamStrength: 'Form rating',
    confidence: 'Matches in sample',
    noMatches: 'No matches in selected tournaments',
    high: 'High sample',
    medium: 'Medium sample',
    low: 'Low sample',
    share: 'Copy prediction link',
    copied: 'Link copied',
    resetConfirm: 'Prediction reset',
    currentRecord: 'Current record',
    outcomeBoard: 'Swiss outcome',
    directRoad: 'Advance directly',
    challengers: 'Play the Elimination Round',
    outRoad: 'Eliminated',
    record40: '4–0',
    record41: '4–1',
    record32: '3–2',
    record23: '2–3',
    record14: '1–4',
    record04: '0–4',
    emptySlot: 'Slot not decided yet',
    swissRule: 'A team stops playing Swiss immediately after its fourth win or fourth loss.',
    roundFiveCount: '7 × Bo3',
    simulatedSeed: 'Seeding is simulated from the standings and team strength; the official seeding may differ.',
    officialResults: 'Latest official series',
    completed: 'completed',
    inProgress: 'live',
    bestOf3: 'Bo3',
    bestOf5: 'Bo5',
    formRatingLabel: 'Form rating',
    sampleMapsLabel: 'Team maps in sample',
    ratingExplanation: 'Form rating compares teams using player statistics. The map count is an approximate number of team maps in the selected sample, not the sum across all five players.',
    swissSeriesTotal: 'Swiss contains 39 Bo3 series: 8 + 8 + 8 + 8 + 7.',
    compactRounds: 'Only the selected round is shown to keep the screen compact.',
    eliminatedFromEvent: 'Eliminated from the event',
    stillAlive: 'Still in contention',
    eliminatedOddsHint: 'Once officially eliminated, a team turns grey, receives 0%, and is removed from the chance calculation.',
    roadTitle: 'Road to the Main Event',
    eliminationWinners: 'Elimination winners',
    eliminationLosers: 'Elimination losers',
    directSlot: 'Direct qualification',
    playoffBracketTitle: 'Main Event bracket',
    scrollBracket: 'Scroll the bracket horizontally',
    pickRound: 'Select round',
    officialRecord: 'Official result',
  },
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  return () => {
    let next = seed += 0x6D2B79F5
    next = Math.imul(next ^ next >>> 15, next | 1)
    next ^= next + Math.imul(next ^ next >>> 7, next | 61)
    return ((next ^ next >>> 14) >>> 0) / 4294967296
  }
}

function formatDateTime(value, language) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date)
}

function scoreForStat(statKey, value) {
  if (statKey === 'deaths') return Math.max(0, 1800 - Number(value || 0) * SCORE_FACTORS.deaths)
  return Number(value || 0) * Number(SCORE_FACTORS[statKey] || 1)
}

function buildTeamModels(selectedTournamentIds) {
  const grouped = new Map()

  Object.entries(playerData).forEach(([playerName, info]) => {
    if (!info?.general?.team_name) return
    const teamName = info.general.team_name
    if (!grouped.has(teamName)) grouped.set(teamName, { name: teamName, logo: getTeamLogo(teamName, info.general.team_logo), players: [] })

    const role = Number(info.general.pos || 0)
    const stats = ROLE_FORM_STATS[role] || ROLE_FORM_STATS[0]
    const valuesByStat = Object.fromEntries(stats.map((key) => [key, []]))
    let matches = 0

    selectedTournamentIds.forEach((leagueId) => {
      const record = info?.[leagueId]
      if (!record?.stats) return
      const allArrays = Object.values(record.stats).flatMap((group) => Object.values(group || {})).filter(Array.isArray)
      matches += allArrays.reduce((maximum, values) => Math.max(maximum, values.length), 0)
      stats.forEach((statKey) => {
        Object.values(record.stats).forEach((group) => {
          const entries = group?.[statKey]
          if (Array.isArray(entries)) valuesByStat[statKey].push(...entries)
        })
      })
    })

    const form = stats.reduce((sum, statKey) => sum + scoreForStat(statKey, average(valuesByStat[statKey])), 0)
    grouped.get(teamName).players.push({ name: playerName, role, matches, form })
  })

  const teams = [...grouped.values()].map((team) => {
    const playersWithData = team.players.filter((player) => player.matches > 0)
    const rawForm = playersWithData.length ? average(playersWithData.map((player) => Math.log1p(Math.max(0, player.form)))) : 0
    const playerAppearances = team.players.reduce((sum, player) => sum + player.matches, 0)
    const sampleMaps = playersWithData.length ? Math.max(...playersWithData.map((player) => player.matches)) : 0
    return {
      ...team,
      matches: sampleMaps,
      sampleMaps,
      playerAppearances,
      rawForm,
    }
  })

  const forms = teams.filter((team) => team.rawForm > 0).map((team) => team.rawForm)
  const mean = average(forms)
  const deviation = Math.sqrt(average(forms.map((value) => (value - mean) ** 2))) || 1

  return teams.map((team) => ({
    ...team,
    rating: team.rawForm > 0 ? Math.round(1500 + ((team.rawForm - mean) / deviation) * 145) : 1375,
  })).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
}

function normalizeTeamName(value) {
  return String(value || '').toLocaleLowerCase().replace(/[^a-zа-яё0-9]+/giu, '')
}

function resolveTeamName(value, teams) {
  const normalized = normalizeTeamName(value)
  if (!normalized) return null
  const exact = teams.find((team) => normalizeTeamName(team.name) === normalized)
  if (exact) return exact.name
  const partial = teams.find((team) => {
    const candidate = normalizeTeamName(team.name)
    return candidate.length >= 4 && (candidate.includes(normalized) || normalized.includes(candidate))
  })
  return partial?.name || null
}

function buildOfficialState(teams, series, status) {
  const swiss = new Map(teams.map((team) => [team.name, { wins: 0, losses: 0 }]))
  const mainLosses = new Map(teams.map((team) => [team.name, 0]))
  const eliminated = new Set()
  let champion = null

  const completed = (Array.isArray(series) ? series : [])
    .filter((item) => item?.completed && item?.winner)
    .sort((a, b) => Number(a.start_time || 0) - Number(b.start_time || 0))

  completed.forEach((item) => {
    const teamA = resolveTeamName(item.team_a, teams)
    const teamB = resolveTeamName(item.team_b, teams)
    const winner = resolveTeamName(item.winner, teams)
    if (!teamA || !teamB || !winner) return
    const loser = winner === teamA ? teamB : teamA
    const stage = String(item.stage || '').toLocaleLowerCase()

    if (stage.includes('swiss')) {
      swiss.get(winner).wins += 1
      swiss.get(loser).losses += 1
      if (swiss.get(loser).losses >= 4) eliminated.add(loser)
      return
    }

    if (stage.includes('elimination')) {
      eliminated.add(loser)
      return
    }

    if (stage.includes('main')) {
      mainLosses.set(loser, Number(mainLosses.get(loser) || 0) + 1)
      if (mainLosses.get(loser) >= 2) eliminated.add(loser)
      champion = winner
    }
  })

  if (status === 'completed' && champion) {
    teams.forEach((team) => {
      if (team.name !== champion) eliminated.add(team.name)
    })
  }

  return { swiss, mainLosses, eliminated, champion }
}

function winProbability(teamA, teamB) {
  if (!teamA || !teamB) return 0.5
  return 1 / (1 + 10 ** ((teamB.rating - teamA.rating) / 400))
}

function recordKey(record) {
  return `${record.wins}-${record.losses}`
}

function createEmptyStandings(teams) {
  return new Map(teams.map((team) => [team.name, {
    team: team.name,
    wins: 0,
    losses: 0,
    mapWins: 0,
    mapLosses: 0,
    opponents: new Set(),
  }]))
}

function calculateStandings(teams, rounds) {
  const table = createEmptyStandings(teams)
  rounds.forEach((round) => round.matches.forEach((match) => {
    if (!match.winner || !match.a || !match.b) return
    const a = table.get(match.a)
    const b = table.get(match.b)
    if (!a || !b) return
    a.opponents.add(match.b)
    b.opponents.add(match.a)
    a.mapWins += Number(match.scoreA || 0)
    a.mapLosses += Number(match.scoreB || 0)
    b.mapWins += Number(match.scoreB || 0)
    b.mapLosses += Number(match.scoreA || 0)
    if (match.winner === match.a) {
      a.wins += 1
      b.losses += 1
    } else {
      b.wins += 1
      a.losses += 1
    }
  }))

  const teamMap = new Map(teams.map((team) => [team.name, team]))
  return [...table.values()].sort((a, b) => (
    b.wins - a.wins ||
    a.losses - b.losses ||
    (b.mapWins - b.mapLosses) - (a.mapWins - a.mapLosses) ||
    (teamMap.get(b.team)?.rating || 0) - (teamMap.get(a.team)?.rating || 0) ||
    a.team.localeCompare(b.team)
  ))
}

function isSwissActive(entry) {
  return entry.wins < 4 && entry.losses < 4
}

function expectedRoundMatchCount(roundNumber) {
  return roundNumber === 5 ? 7 : 8
}

function pairingPenalty(a, b, teamMap) {
  const recordDistance = Math.abs(a.wins - b.wins) + Math.abs(a.losses - b.losses)
  const ratingDistance = Math.abs((teamMap.get(a.team)?.rating || 1500) - (teamMap.get(b.team)?.rating || 1500))
  return recordDistance * 10000 + ratingDistance
}

function findNoRematchPairing(entries, teamMap) {
  const solve = (remaining) => {
    if (!remaining.length) return []

    let chosenIndex = 0
    let fewestCandidates = Number.POSITIVE_INFINITY
    remaining.forEach((entry, index) => {
      const candidateCount = remaining.reduce((count, candidate, candidateIndex) => (
        candidateIndex !== index && !entry.opponents.has(candidate.team) ? count + 1 : count
      ), 0)
      if (candidateCount < fewestCandidates) {
        chosenIndex = index
        fewestCandidates = candidateCount
      }
    })

    const a = remaining[chosenIndex]
    const rest = remaining.filter((_, index) => index !== chosenIndex)
    const candidates = rest
      .filter((candidate) => !a.opponents.has(candidate.team))
      .sort((left, right) => pairingPenalty(a, left, teamMap) - pairingPenalty(a, right, teamMap))

    for (const b of candidates) {
      const next = rest.filter((entry) => entry.team !== b.team)
      const tail = solve(next)
      if (tail) return [[a, b], ...tail]
    }
    return null
  }

  return solve(entries)
}

function pairTeams(teams, standings, roundNumber) {
  const teamMap = new Map(teams.map((team) => [team.name, team]))
  if (roundNumber === 1) {
    const seeded = [...teams].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name))
    const half = seeded.length / 2
    return seeded.slice(0, half).map((team, index) => ({
      id: `swiss-${roundNumber}-${index + 1}`,
      a: team.name,
      b: seeded[index + half].name,
      winner: null,
      scoreA: 0,
      scoreB: 0,
    }))
  }

  const activeStandings = standings.filter(isSwissActive)
  let pairedEntries = findNoRematchPairing(activeStandings, teamMap)

  if (!pairedEntries) {
    const pool = [...activeStandings]
    pairedEntries = []
    while (pool.length >= 2) {
      const a = pool.shift()
      let index = pool.findIndex((candidate) => recordKey(a) === recordKey(candidate) && !a.opponents.has(candidate.team))
      if (index < 0) index = pool.findIndex((candidate) => !a.opponents.has(candidate.team))
      if (index < 0) index = 0
      pairedEntries.push([a, pool.splice(index, 1)[0]])
    }
  }

  return pairedEntries.map(([entryA, entryB], index) => ({
    id: `swiss-${roundNumber}-${index + 1}`,
    a: entryA.team,
    b: entryB.team,
    winner: null,
    scoreA: 0,
    scoreB: 0,
    ratingA: teamMap.get(entryA.team)?.rating,
    ratingB: teamMap.get(entryB.team)?.rating,
  }))
}

function swissBuckets(standings) {
  const get = (wins, losses) => standings.filter((entry) => entry.wins === wins && entry.losses === losses)
  return {
    record40: get(4, 0),
    record41: get(4, 1),
    record32: get(3, 2),
    record23: get(2, 3),
    record14: get(1, 4),
    record04: get(0, 4),
  }
}

function winnerOf(match, picks) {
  if (!match?.a || !match?.b) return null
  const pick = picks[match.id]
  return pick && (pick.winner === match.a || pick.winner === match.b) ? pick.winner : null
}

function loserOf(match, picks) {
  const winner = winnerOf(match, picks)
  if (!winner) return null
  return winner === match.a ? match.b : match.a
}

function buildPlayoffMatches(playoffTeams, picks) {
  if (playoffTeams.length !== 8) return []
  const qf = [
    { id: 'ubqf-1', label: 'upperQf', a: playoffTeams[0], b: playoffTeams[7], bestOf: 3 },
    { id: 'ubqf-2', label: 'upperQf', a: playoffTeams[3], b: playoffTeams[4], bestOf: 3 },
    { id: 'ubqf-3', label: 'upperQf', a: playoffTeams[1], b: playoffTeams[6], bestOf: 3 },
    { id: 'ubqf-4', label: 'upperQf', a: playoffTeams[2], b: playoffTeams[5], bestOf: 3 },
  ]
  const ubSf = [
    { id: 'ubsf-1', label: 'upperSf', a: winnerOf(qf[0], picks), b: winnerOf(qf[1], picks), bestOf: 3 },
    { id: 'ubsf-2', label: 'upperSf', a: winnerOf(qf[2], picks), b: winnerOf(qf[3], picks), bestOf: 3 },
  ]
  const lbR1 = [
    { id: 'lbr1-1', label: 'lowerR1', a: loserOf(qf[0], picks), b: loserOf(qf[1], picks), bestOf: 3 },
    { id: 'lbr1-2', label: 'lowerR1', a: loserOf(qf[2], picks), b: loserOf(qf[3], picks), bestOf: 3 },
  ]
  const ubFinal = { id: 'ubf', label: 'upperFinal', a: winnerOf(ubSf[0], picks), b: winnerOf(ubSf[1], picks), bestOf: 3 }
  const lbQf = [
    { id: 'lbqf-1', label: 'lowerQf', a: winnerOf(lbR1[0], picks), b: loserOf(ubSf[1], picks), bestOf: 3 },
    { id: 'lbqf-2', label: 'lowerQf', a: winnerOf(lbR1[1], picks), b: loserOf(ubSf[0], picks), bestOf: 3 },
  ]
  const lbSf = { id: 'lbsf', label: 'lowerSf', a: winnerOf(lbQf[0], picks), b: winnerOf(lbQf[1], picks), bestOf: 3 }
  const lbFinal = { id: 'lbf', label: 'lowerFinal', a: winnerOf(lbSf, picks), b: loserOf(ubFinal, picks), bestOf: 3 }
  const grandFinal = { id: 'gf', label: 'grandFinal', a: winnerOf(ubFinal, picks), b: winnerOf(lbFinal, picks), bestOf: 5 }
  return [...qf, ...ubSf, ...lbR1, ubFinal, ...lbQf, lbSf, lbFinal, grandFinal]
}

function simulateTournament(teams, random) {
  const simulatedRounds = []
  for (let roundIndex = 0; roundIndex < 5; roundIndex += 1) {
    const standings = calculateStandings(teams, simulatedRounds)
    const matches = pairTeams(teams, standings, roundIndex + 1).map((match) => {
      const teamA = teams.find((team) => team.name === match.a)
      const teamB = teams.find((team) => team.name === match.b)
      const aWins = random() < winProbability(teamA, teamB)
      const close = Math.abs((teamA?.rating || 1500) - (teamB?.rating || 1500)) < 130
      const loserMaps = random() < (close ? 0.62 : 0.38) ? 1 : 0
      return {
        ...match,
        winner: aWins ? match.a : match.b,
        scoreA: aWins ? 2 : loserMaps,
        scoreB: aWins ? loserMaps : 2,
      }
    })
    simulatedRounds.push({ number: roundIndex + 1, matches })
  }

  const standings = calculateStandings(teams, simulatedRounds)
  const buckets = swissBuckets(standings)
  const direct = [...buckets.record40, ...buckets.record41].map((entry) => entry.team)
  const elimination = buckets.record32.map((entry, index) => {
    const opponent = buckets.record23[buckets.record23.length - 1 - index]
    const a = entry.team
    const b = opponent?.team
    const teamA = teams.find((team) => team.name === a)
    const teamB = teams.find((team) => team.name === b)
    return random() < winProbability(teamA, teamB) ? a : b
  }).filter(Boolean)

  const seeds = [...direct, ...elimination]
  if (seeds.length !== 8) return teams[0]?.name
  const p = (a, b) => random() < winProbability(teams.find((team) => team.name === a), teams.find((team) => team.name === b)) ? a : b
  const l = (a, b, winner) => winner === a ? b : a
  const q1 = p(seeds[0], seeds[7]); const q2 = p(seeds[3], seeds[4])
  const q3 = p(seeds[1], seeds[6]); const q4 = p(seeds[2], seeds[5])
  const us1 = p(q1, q2); const us2 = p(q3, q4)
  const lr1 = p(l(seeds[0], seeds[7], q1), l(seeds[3], seeds[4], q2))
  const lr2 = p(l(seeds[1], seeds[6], q3), l(seeds[2], seeds[5], q4))
  const uf = p(us1, us2)
  const lq1 = p(lr1, l(q3, q4, us2)); const lq2 = p(lr2, l(q1, q2, us1))
  const ls = p(lq1, lq2)
  const lf = p(ls, l(us1, us2, uf))
  return p(uf, lf)
}

function MatchCard({ match, teamMap, picks, onPick, text }) {
  const teamA = teamMap.get(match.a)
  const teamB = teamMap.get(match.b)
  const pick = picks[match.id]
  const probabilityA = winProbability(teamA, teamB)
  const winTarget = match.bestOf === 5 ? 3 : 2
  const loserScores = match.bestOf === 5 ? [0, 1, 2] : [0, 1]

  if (!match.a || !match.b) {
    return <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-center text-xs text-zinc-600">TBD</div>
  }

  const scoreButton = (winner, loser, loserScore) => {
    const winnerIsA = winner === match.a
    const active = pick?.winner === winner && pick?.scoreWinner === winTarget && pick?.scoreLoser === loserScore
    return (
      <button
        key={`${winner}-${loserScore}`}
        onClick={() => onPick(match.id, { winner, loser, scoreWinner: winTarget, scoreLoser: loserScore })}
        className={`rounded-md border px-2 py-1 text-[11px] font-black transition ${active ? 'border-violet-400 bg-violet-600 text-white' : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
      >
        {winnerIsA ? `${winTarget}:${loserScore}` : `${loserScore}:${winTarget}`}
      </button>
    )
  }

  return (
    <article className="rounded-xl border border-white/10 bg-zinc-950/80 p-3 shadow-lg shadow-black/20">
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-600">
        <span>{text[match.label] || match.label}</span><span>{match.bestOf === 5 ? text.bestOf5 : text.bestOf3}</span>
      </div>
      <div className="space-y-2">
        <div className={`rounded-lg px-3 py-2 ${pick?.winner === match.a ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[.035]'}`}>
          <div className="flex items-center justify-between gap-2"><strong className="truncate">{match.a}</strong><span className="text-xs text-zinc-500">{Math.round(probabilityA * 100)}%</span></div>
          <div className="mt-1 flex gap-1">{loserScores.map((score) => scoreButton(match.a, match.b, score))}</div>
        </div>
        <div className={`rounded-lg px-3 py-2 ${pick?.winner === match.b ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/[.035]'}`}>
          <div className="flex items-center justify-between gap-2"><strong className="truncate">{match.b}</strong><span className="text-xs text-zinc-500">{Math.round((1 - probabilityA) * 100)}%</span></div>
          <div className="mt-1 flex gap-1">{loserScores.map((score) => scoreButton(match.b, match.a, score))}</div>
        </div>
      </div>
    </article>
  )
}

function RoadTeamSlot({ entry, teamMap, emptyLabel, tone = 'violet' }) {
  const teamName = typeof entry === 'string' ? entry : entry?.team
  const team = teamMap.get(teamName)
  const toneClass = {
    emerald: 'border-emerald-400/25 bg-emerald-500/10',
    amber: 'border-amber-400/25 bg-amber-500/10',
    red: 'border-red-400/20 bg-red-500/[.07]',
    violet: 'border-violet-400/20 bg-violet-500/[.07]',
  }[tone]
  return (
    <div className={`flex min-h-20 items-center gap-3 rounded-xl border p-3 ${teamName ? toneClass : 'border-dashed border-white/10 bg-black/20 text-zinc-700'}`}>
      {team?.logo ? <img src={team.logo} alt="" className="size-9 shrink-0 object-contain" /> : <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-black/25 text-lg font-black">?</span>}
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{teamName || emptyLabel}</p>
        {entry?.mapWins !== undefined && <p className="mt-1 text-[10px] text-zinc-500">{entry.mapWins}–{entry.mapLosses}</p>}
      </div>
    </div>
  )
}

function RoadGroup({ title, subtitle, entries, slots, teamMap, emptyLabel, tone }) {
  const filled = [...entries]
  while (filled.length < slots) filled.push(null)
  return (
    <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-3 text-center">
        <h4 className="text-sm font-black uppercase tracking-wider text-white">{title}</h4>
        {subtitle && <p className="mt-1 text-[10px] text-zinc-600">{subtitle}</p>}
      </div>
      <div className="space-y-2">{filled.slice(0, slots).map((entry, index) => <RoadTeamSlot key={(typeof entry === 'string' ? entry : entry?.team) || `${title}-${index}`} entry={entry} teamMap={teamMap} emptyLabel={emptyLabel} tone={tone} />)}</div>
    </section>
  )
}

function RoadToMainEvent({ buckets, eliminationMatches, eliminationPicks, teamMap, text }) {
  const winners = eliminationMatches.map((match) => winnerOf(match, eliminationPicks)).filter(Boolean)
  const losers = eliminationMatches.map((match) => loserOf(match, eliminationPicks)).filter(Boolean)
  return (
    <section className="overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top,_rgba(89,46,160,.34),_rgba(8,5,18,.96)_55%)] p-4 shadow-2xl shadow-violet-950/30 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.28em] text-violet-300">The International 2026</p><h3 className="mt-1 text-3xl font-black">{text.roadTitle}</h3></div>
        <p className="max-w-xl text-right text-xs leading-5 text-zinc-500">{text.swissRule}</p>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1220px] grid-cols-[180px_210px_1fr_1fr_210px_180px] gap-3">
          <RoadGroup title={text.record40} subtitle={text.directSlot} entries={buckets.record40} slots={1} teamMap={teamMap} emptyLabel={text.emptySlot} tone="emerald" />
          <RoadGroup title={text.record41} subtitle={text.directSlot} entries={buckets.record41} slots={2} teamMap={teamMap} emptyLabel={text.emptySlot} tone="emerald" />
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <RoadGroup title={text.eliminationWinners} subtitle={text.toPlayoffs} entries={winners} slots={5} teamMap={teamMap} emptyLabel={text.emptySlot} tone="amber" />
            <RoadGroup title={text.eliminationLosers} subtitle={text.outRoad} entries={losers} slots={5} teamMap={teamMap} emptyLabel={text.emptySlot} tone="red" />
          </div>
          <RoadGroup title={text.record14} subtitle={text.outRoad} entries={buckets.record14} slots={2} teamMap={teamMap} emptyLabel={text.emptySlot} tone="red" />
          <RoadGroup title={text.record04} subtitle={text.outRoad} entries={buckets.record04} slots={1} teamMap={teamMap} emptyLabel={text.emptySlot} tone="red" />
        </div>
      </div>
    </section>
  )
}

function BracketMatch({ match, teamMap, picks, onPick, text, style }) {
  const pick = picks[match.id]
  const teamA = teamMap.get(match.a)
  const teamB = teamMap.get(match.b)
  const probabilityA = winProbability(teamA, teamB)
  const target = match.bestOf === 5 ? 3 : 2
  const loserScores = match.bestOf === 5 ? [0, 1, 2] : [0, 1]
  const row = (teamName, team, probability) => {
    const active = pick?.winner === teamName
    return (
      <div className={`rounded-lg border px-2.5 py-2 ${active ? 'border-amber-300/50 bg-amber-400/15' : 'border-white/5 bg-black/35'}`}>
        <div className="flex items-center gap-2">
          {team?.logo ? <img src={team.logo} alt="" className="size-5 object-contain" /> : <span className="size-5" />}
          <strong className="min-w-0 flex-1 truncate text-xs">{teamName || 'TBD'}</strong>
          {teamName && <span className="text-[10px] text-zinc-500">{Math.round(probability * 100)}%</span>}
        </div>
        {teamName && match.a && match.b && <div className="mt-1.5 flex gap-1">{loserScores.map((loserScore) => {
          const teamIsA = teamName === match.a
          const score = teamIsA ? `${target}:${loserScore}` : `${loserScore}:${target}`
          const selected = active && pick?.scoreLoser === loserScore
          return <button key={score} onClick={() => onPick(match.id, { winner: teamName, loser: teamIsA ? match.b : match.a, scoreWinner: target, scoreLoser: loserScore })} className={`rounded px-1.5 py-0.5 text-[9px] font-black ${selected ? 'bg-amber-300 text-black' : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'}`}>{score}</button>
        })}</div>}
      </div>
    )
  }
  return (
    <article style={style} className="absolute z-10 min-h-[166px] w-[270px] rounded-xl border border-violet-300/20 bg-gradient-to-br from-violet-950/95 to-zinc-950/95 p-2.5 shadow-xl shadow-black/50">
      <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-violet-300/70"><span>{text[match.label]}</span><span>{match.bestOf === 5 ? text.bestOf5 : text.bestOf3}</span></div>
      <div className="space-y-1.5">{row(match.a, teamA, probabilityA)}{row(match.b, teamB, 1 - probabilityA)}</div>
    </article>
  )
}

function MainEventBracket({ matches, teamMap, picks, onPick, text }) {
  const byId = new Map(matches.map((match) => [match.id, match]))
  const cardWidth = 270
  const cardCenterY = 83
  const positions = {
    'ubqf-1': [0, 50], 'ubqf-2': [0, 255], 'ubqf-3': [0, 460], 'ubqf-4': [0, 665],
    'ubsf-1': [350, 152], 'ubsf-2': [350, 562], 'ubf': [710, 357], 'gf': [1320, 357],
    'lbr1-1': [0, 980], 'lbr1-2': [0, 1205], 'lbqf-1': [350, 925], 'lbqf-2': [350, 1235],
    'lbsf': [710, 1080], 'lbf': [1010, 760],
  }
  const links = [
    { from: 'ubqf-1', to: 'ubsf-1' }, { from: 'ubqf-2', to: 'ubsf-1' },
    { from: 'ubqf-3', to: 'ubsf-2' }, { from: 'ubqf-4', to: 'ubsf-2' },
    { from: 'ubsf-1', to: 'ubf' }, { from: 'ubsf-2', to: 'ubf' },
    { from: 'ubf', to: 'gf' }, { from: 'lbf', to: 'gf' },
    { from: 'lbr1-1', to: 'lbqf-1' }, { from: 'lbr1-2', to: 'lbqf-2' },
    { from: 'lbqf-1', to: 'lbsf' }, { from: 'lbqf-2', to: 'lbsf' },
    { from: 'lbsf', to: 'lbf' },
    { from: 'ubqf-1', to: 'lbr1-1', drop: true }, { from: 'ubqf-2', to: 'lbr1-1', drop: true },
    { from: 'ubqf-3', to: 'lbr1-2', drop: true }, { from: 'ubqf-4', to: 'lbr1-2', drop: true },
    { from: 'ubsf-2', to: 'lbqf-1', drop: true }, { from: 'ubsf-1', to: 'lbqf-2', drop: true },
    { from: 'ubf', to: 'lbf', drop: true },
  ]
  const center = (id, side) => {
    const [x, y] = positions[id]
    return [x + (side === 'right' ? cardWidth : 0), y + cardCenterY]
  }
  return (
    <section className="overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_48%_35%,_rgba(102,55,190,.28),_rgba(5,3,13,.97)_62%)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[.28em] text-violet-300">Aegis bracket</p><h3 className="mt-1 text-3xl font-black">{text.playoffBracketTitle}</h3></div>
        <p className="text-xs text-zinc-500">← {text.scrollBracket || 'Прокручивай сетку по горизонтали'} →</p>
      </div>
      <div className="overflow-x-auto pb-3">
        <div className="relative h-[1450px] min-w-[1630px]">
          <div className="absolute left-0 top-0 text-[10px] font-black uppercase tracking-[.28em] text-violet-300/65">Upper bracket</div>
          <div className="absolute left-0 top-[925px] text-[10px] font-black uppercase tracking-[.28em] text-rose-300/65">Lower bracket</div>
          <div className="absolute left-0 right-0 top-[905px] border-t border-white/5" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1630 1450" preserveAspectRatio="none">
            {links.map(({ from, to, drop }) => {
              const [x1, y1] = center(from, 'right'); const [x2, y2] = center(to, 'left'); const mid = (x1 + x2) / 2
              return <path key={`${from}-${to}`} d={`M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`} fill="none" stroke={drop ? 'rgba(244,114,182,.2)' : 'rgba(167,139,250,.38)'} strokeWidth="2" strokeDasharray={drop ? '7 7' : undefined} />
            })}
          </svg>
          {Object.entries(positions).map(([id, [left, top]]) => {
            const match = byId.get(id)
            if (!match) return null
            return <BracketMatch key={id} match={match} teamMap={teamMap} picks={picks} onPick={onPick} text={text} style={{ left, top }} />
          })}
          <div className="absolute left-[1125px] top-[405px] grid size-32 place-items-center rounded-full border border-amber-300/30 bg-[radial-gradient(circle,_rgba(251,191,36,.22),_rgba(76,29,149,.22),_transparent_68%)] text-center shadow-2xl shadow-violet-500/20"><span className="text-5xl">🏆</span></div>
        </div>
      </div>
    </section>
  )
}

export default function TI2026({ language = 'ru', selectedTournamentIds = Object.keys(leagueData) }) {
  const text = COPY[language]
  const [section, setSection] = useState('progress')
  const [activeRound, setActiveRound] = useState(1)
  const teams = useMemo(() => buildTeamModels(selectedTournamentIds), [selectedTournamentIds])
  const teamMap = useMemo(() => new Map(teams.map((team) => [team.name, team])), [teams])
  const officialState = useMemo(() => buildOfficialState(teams, liveData.series, liveData.status), [teams])

  const [swissRounds, setSwissRounds] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ti2026-swiss-v2') || 'null')
      return Array.isArray(saved) && saved.length ? saved : []
    } catch { return [] }
  })
  const [eliminationPicks, setEliminationPicks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ti2026-elimination-v2') || '{}') } catch { return {} }
  })
  const [playoffPicks, setPlayoffPicks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ti2026-playoffs-v2') || '{}') } catch { return {} }
  })
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!swissRounds.length && teams.length === 16) {
      setSwissRounds([{ number: 1, matches: pairTeams(teams, calculateStandings(teams, []), 1) }])
    }
  }, [teams, swissRounds.length])

  useEffect(() => { localStorage.setItem('ti2026-swiss-v2', JSON.stringify(swissRounds)) }, [swissRounds])
  useEffect(() => { localStorage.setItem('ti2026-elimination-v2', JSON.stringify(eliminationPicks)) }, [eliminationPicks])
  useEffect(() => { localStorage.setItem('ti2026-playoffs-v2', JSON.stringify(playoffPicks)) }, [playoffPicks])

  const standings = useMemo(() => calculateStandings(teams, swissRounds), [teams, swissRounds])
  const buckets = useMemo(() => swissBuckets(standings), [standings])
  const finalRound = swissRounds.find((round) => round.number === 5)
  const swissComplete = Boolean(finalRound?.matches.length === 7 && finalRound.matches.every((match) => match.winner))
  const directTeams = [...buckets.record40, ...buckets.record41].map((entry) => entry.team)
  const eliminationMatches = useMemo(() => {
    if (!swissComplete || buckets.record32.length !== 5 || buckets.record23.length !== 5) return []
    return buckets.record32.map((entry, index) => ({
      id: `elim-${index + 1}`,
      label: 'elimination',
      a: entry.team,
      b: buckets.record23[buckets.record23.length - 1 - index].team,
      bestOf: 3,
    }))
  }, [buckets, swissComplete])
  const eliminationWinners = eliminationMatches.map((match) => winnerOf(match, eliminationPicks)).filter(Boolean)
  const playoffTeams = swissComplete && directTeams.length === 3 && eliminationWinners.length === 5
    ? [...directTeams, ...eliminationWinners]
    : []
  const bracketSeeds = playoffTeams.length === 8 ? playoffTeams : Array(8).fill(null)
  const playoffMatches = buildPlayoffMatches(bracketSeeds, playoffPicks)
  const champion = winnerOf(playoffMatches.find((match) => match.id === 'gf'), playoffPicks)

  const championshipOdds = useMemo(() => {
    if (teams.length !== 16) return []
    const counts = new Map(teams.map((team) => [team.name, 0]))
    const random = mulberry32(stableHash(teams.map((team) => `${team.name}:${team.rating}`).join('|')))
    const simulations = 2400
    for (let index = 0; index < simulations; index += 1) {
      const winner = simulateTournament(teams, random)
      counts.set(winner, Number(counts.get(winner) || 0) + 1)
    }

    const weighted = teams.map((team) => {
      const eliminated = officialState.eliminated.has(team.name)
      const record = officialState.swiss.get(team.name) || { wins: 0, losses: 0 }
      const mainLosses = Number(officialState.mainLosses.get(team.name) || 0)
      const baseline = Number(counts.get(team.name) || 0) / simulations
      const liveMultiplier = (1.16 ** record.wins) / (1.18 ** record.losses) / (1.28 ** mainLosses)
      return { ...team, eliminated, rawChance: eliminated ? 0 : baseline * liveMultiplier }
    })
    const total = weighted.reduce((sum, team) => sum + team.rawChance, 0) || 1
    return weighted.map((team) => ({ ...team, chance: team.eliminated ? 0 : team.rawChance / total }))
      .sort((a, b) => Number(a.eliminated) - Number(b.eliminated) || b.chance - a.chance || b.rating - a.rating)
  }, [teams, officialState])

  const officialSeries = Array.isArray(liveData.series) ? [...liveData.series].sort((a, b) => Number(b.start_time || 0) - Number(a.start_time || 0)) : []

  const chooseSwiss = (roundIndex, matchId, winner, loserScore) => {
    setSwissRounds((current) => current.slice(0, roundIndex + 1).map((round, index) => index !== roundIndex ? round : {
      ...round,
      matches: round.matches.map((match) => {
        if (match.id !== matchId) return match
        const winnerIsA = winner === match.a
        return { ...match, winner, scoreA: winnerIsA ? 2 : loserScore, scoreB: winnerIsA ? loserScore : 2 }
      }),
    }))
    setEliminationPicks({})
    setPlayoffPicks({})
  }

  const addNextRound = () => {
    const currentRound = swissRounds[swissRounds.length - 1]
    if (!currentRound?.matches.every((match) => match.winner) || swissRounds.length >= 5) return
    const currentStandings = calculateStandings(teams, swissRounds)
    const nextRoundNumber = swissRounds.length + 1
    const matches = pairTeams(teams, currentStandings, nextRoundNumber)
    if (matches.length !== expectedRoundMatchCount(nextRoundNumber)) return
    setSwissRounds((current) => [...current, { number: nextRoundNumber, matches }])
    setActiveRound(nextRoundNumber)
  }

  const setPick = (setter) => (matchId, pick) => setter((current) => ({ ...current, [matchId]: pick }))

  const resetPrediction = () => {
    const firstRound = teams.length === 16 ? [{ number: 1, matches: pairTeams(teams, calculateStandings(teams, []), 1) }] : []
    setSwissRounds(firstRound)
    setActiveRound(1)
    setEliminationPicks({})
    setPlayoffPicks({})
    setToast(text.resetConfirm)
    window.setTimeout(() => setToast(''), 1800)
  }

  const sharePrediction = async () => {
    const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ swissRounds, eliminationPicks, playoffPicks }))))
    const url = `${window.location.origin}${window.location.pathname}#tipred2=${payload}`
    try {
      await navigator.clipboard.writeText(url)
      setToast(text.copied)
      window.setTimeout(() => setToast(''), 1800)
    } catch { /* clipboard may be unavailable on local HTTP */ }
  }

  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#tipred2=')) return
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(hash.slice(9)))))
      if (Array.isArray(decoded.swissRounds)) setSwissRounds(decoded.swissRounds)
      if (decoded.eliminationPicks) setEliminationPicks(decoded.eliminationPicks)
      if (decoded.playoffPicks) setPlayoffPicks(decoded.playoffPicks)
    } catch { /* ignore malformed prediction links */ }
  }, [])

  const sampleLabel = (matches) => matches >= 80 ? text.high : matches >= 30 ? text.medium : text.low
  const activeSwissRound = swissRounds.find((round) => round.number === activeRound) || swissRounds.at(-1)

  return (
    <section className="space-y-6">
      {toast && <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-violet-400/30 bg-violet-700 px-4 py-3 text-sm font-black text-white shadow-2xl">{toast}</div>}

      <div className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/70 via-zinc-950 to-red-950/30 shadow-2xl shadow-black/30">
        <div className="p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[.3em] text-violet-300">Aegis Lab · {text.statistical}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-5xl">{text.heading}</h2>
          <p className="mt-3 max-w-4xl text-zinc-300">{text.subtitle}</p>
          <p className="mt-2 text-xs text-violet-200/70">{text.selectedEvents}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(text.sections).map(([key, label]) => (
              <button key={key} onClick={() => setSection(key)} className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${section === key ? 'bg-violet-600 text-white' : 'border border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {section === 'progress' && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-violet-300">1</span>
              <h3 className="mt-2 text-xl font-black">{text.swiss}</h3><p className="mt-1 text-sm text-zinc-500">{text.datesSwiss}</p>
              <p className="mt-4 text-sm text-zinc-300">{text.sixteen} · {text.topThree}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-amber-300">2</span>
              <h3 className="mt-2 text-xl font-black">{text.elimination}</h3>
              <p className="mt-4 text-sm text-zinc-300">{text.places}</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">3</span>
              <h3 className="mt-2 text-xl font-black">{text.playoffs}</h3><p className="mt-1 text-sm text-zinc-500">{text.datesPlayoffs}</p>
              <p className="mt-4 text-sm text-zinc-300">{text.eight}</p>
            </article>
          </div>

          <article className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h3 className="text-2xl font-black">{text.liveTitle}</h3><p className="mt-1 text-xs text-zinc-600">{text.updated}: {formatDateTime(liveData.updated_at, language) || text.noUpdate}</p></div>
              {liveData.league_id && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">OpenDota #{liveData.league_id}</span>}
            </div>
            {!officialSeries.length ? (
              <div className="mt-5 rounded-xl border border-dashed border-white/10 bg-white/[.025] p-6 text-sm leading-6 text-zinc-400"><p>{text.liveEmpty}</p><p className="mt-2 text-zinc-600">{text.livePartial}</p></div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {officialSeries.slice(0, 12).map((series) => (
                  <div key={series.id} className="rounded-xl border border-white/10 bg-white/[.035] p-4">
                    <div className="flex items-center justify-between text-xs text-zinc-600"><span>{series.stage || text.swiss}</span><span>{series.completed ? text.completed : text.inProgress}</span></div>
                    <div className="mt-3 flex items-center justify-between gap-3"><strong className="truncate">{series.team_a}</strong><b>{series.score_a}</b></div>
                    <div className="mt-2 flex items-center justify-between gap-3"><strong className="truncate">{series.team_b}</strong><b>{series.score_b}</b></div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <div className="rounded-2xl border border-violet-400/15 bg-violet-500/[.055] p-4 text-sm leading-6 text-zinc-400">
            <strong className="text-violet-200">{text.formRatingLabel}:</strong> {text.ratingExplanation}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {teams.map((team, index) => {
              const isOut = officialState.eliminated.has(team.name)
              return (
                <article key={team.name} className={`rounded-xl border p-4 transition ${isOut ? 'border-white/5 bg-white/[.015] opacity-40 grayscale' : 'border-violet-300/15 bg-gradient-to-br from-violet-950/35 to-black/30'}`}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/15 text-xs font-black text-violet-300">{index + 1}</span>
                    {team.logo ? <img src={team.logo} alt="" className="size-8 object-contain" /> : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><h4 className="truncate font-black">{team.name}</h4>{isOut && <span className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[9px] font-black text-zinc-400">{text.eliminated}</span>}</div>
                      <p className="mt-1 text-[11px] text-zinc-400">{text.formRatingLabel}: <b className="text-violet-300">{team.rating}</b></p>
                      <p className="text-[11px] text-zinc-600">{text.sampleMapsLabel}: <b>{team.sampleMaps}</b></p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}

      {section === 'predictor' && (
        <div className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="max-w-4xl text-sm text-amber-100/80">{text.unofficial}</p>
            <div className="flex gap-2"><button onClick={sharePrediction} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-black hover:bg-white/10">{text.share}</button><button onClick={resetPrediction} className="rounded-lg bg-red-500/15 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-500/25">{text.reset}</button></div>
          </div>

          <section className="rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(91,33,182,.25),_rgba(9,7,17,.96)_55%)] p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[.25em] text-violet-300">{text.pickRound}</p><h3 className="mt-1 text-3xl font-black">{text.swiss}</h3><p className="mt-2 text-sm text-zinc-500">{text.swissSeriesTotal} {text.compactRounds}</p></div>
              <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 5].map((number) => {
                const available = swissRounds.some((round) => round.number === number)
                return <button key={number} disabled={!available} onClick={() => setActiveRound(number)} className={`rounded-xl border px-4 py-2 text-sm font-black transition ${activeSwissRound?.number === number ? 'border-violet-300 bg-violet-600 text-white shadow-lg shadow-violet-900/40' : available ? 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10' : 'cursor-not-allowed border-white/5 bg-black/20 text-zinc-800'}`}>{text.round} {number}</button>
              })}</div>
            </div>
            {activeSwissRound && <article className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between"><div><h4 className="text-2xl font-black">{text.round} {activeSwissRound.number}</h4><p className="text-xs text-zinc-600">{text.scoreHint}</p></div><span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-black text-violet-300">{activeSwissRound.number === 5 ? text.roundFiveCount : '8 × Bo3'}</span></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{activeSwissRound.matches.map((match) => {
                const roundIndex = swissRounds.findIndex((round) => round.number === activeSwissRound.number)
                return <MatchCard key={match.id} match={{ ...match, label: 'round', bestOf: 3 }} teamMap={teamMap} picks={Object.fromEntries(activeSwissRound.matches.filter((item) => item.winner).map((item) => [item.id, { winner: item.winner }]))} onPick={(id, pick) => chooseSwiss(roundIndex, id, pick.winner, pick.scoreLoser)} text={text} />
              })}</div>
            </article>}
            {swissRounds.length < 5 && (
              <div className="mt-4"><button disabled={!swissRounds.at(-1)?.matches.every((match) => match.winner)} onClick={addNextRound} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-30">{text.generateNext}</button>{!swissRounds.at(-1)?.matches.every((match) => match.winner) && <p className="mt-2 text-xs text-zinc-600">{text.lockedNext}</p>}</div>
            )}
          </section>

          <RoadToMainEvent buckets={buckets} eliminationMatches={eliminationMatches} eliminationPicks={eliminationPicks} teamMap={teamMap} text={text} />

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/70">
            <div className="border-b border-white/10 p-5"><h3 className="text-2xl font-black">{text.standings}</h3></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-white/[.035] text-xs uppercase tracking-wider text-zinc-600"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">{text.team}</th><th className="px-4 py-3">{text.series}</th><th className="px-4 py-3">{text.maps}</th><th className="px-4 py-3">{text.status}</th></tr></thead><tbody>{standings.map((entry, index) => {
              const direct = entry.wins === 4
              const out = entry.losses === 4
              const challenger = swissComplete && ((entry.wins === 3 && entry.losses === 2) || (entry.wins === 2 && entry.losses === 3))
              const status = direct ? text.direct : out ? text.eliminated : challenger ? text.eliminationStatus : text.pending
              const statusClass = direct ? 'text-emerald-300' : out ? 'text-red-300' : challenger ? 'text-amber-300' : 'text-zinc-500'
              return <tr key={entry.team} className="border-t border-white/5"><td className="px-4 py-3 font-black text-zinc-600">{index + 1}</td><td className="px-4 py-3 font-black">{entry.team}</td><td className="px-4 py-3">{entry.wins}–{entry.losses}</td><td className="px-4 py-3">{entry.mapWins}–{entry.mapLosses}</td><td className={`px-4 py-3 text-xs font-black ${statusClass}`}>{status}</td></tr>
            })}</tbody></table></div>
          </section>

          <section>
            <h3 className="text-2xl font-black">{text.elimination}</h3>
            {!swissComplete ? <p className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-sm text-zinc-600">{text.waitingSwiss}</p> : <><p className="mt-2 text-xs text-zinc-600">{text.simulatedSeed}</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{eliminationMatches.map((match) => <MatchCard key={match.id} match={match} teamMap={teamMap} picks={eliminationPicks} onPick={setPick(setEliminationPicks)} text={text} />)}</div></>}
          </section>

          <section>
            {playoffTeams.length !== 8 && <p className="mb-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-600">{text.waitingElimination}</p>}
            <MainEventBracket matches={playoffMatches} teamMap={teamMap} picks={playoffPicks} onPick={setPick(setPlayoffPicks)} text={text} />
            {champion && <div className="mt-6 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-400/15 to-violet-500/10 p-6 text-center"><p className="text-xs font-black uppercase tracking-[.3em] text-amber-300">{text.champion}</p><h4 className="mt-2 text-4xl font-black text-white">🏆 {champion}</h4></div>}
          </section>
        </div>
      )}

      {section === 'odds' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 p-5"><h3 className="text-3xl font-black">{text.titleOdds}</h3><p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-400">{text.oddsHint}</p><p className="mt-2 text-xs font-bold text-violet-300/75">{text.eliminatedOddsHint}</p></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {championshipOdds.map((team, index) => (
              <article key={team.name} className={`rounded-2xl border p-5 transition ${team.eliminated ? 'border-white/5 bg-zinc-950/40 opacity-40 grayscale' : 'border-violet-300/15 bg-gradient-to-br from-violet-950/35 to-zinc-950/80'}`}>
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-sm font-black ${team.eliminated ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-500/15 text-violet-300'}`}>{index + 1}</span>{team.logo ? <img src={team.logo} alt="" className="size-9 object-contain" /> : null}<div className="min-w-0"><h4 className="truncate font-black">{team.name}</h4><p className="text-xs text-zinc-600">{text.teamStrength}: {team.rating}</p></div></div><strong className={`text-2xl ${team.eliminated ? 'text-zinc-600' : 'text-violet-300'}`}>{team.eliminated ? '0.0%' : `${(team.chance * 100).toFixed(1)}%`}</strong></div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${team.eliminated ? 'bg-zinc-800' : 'bg-gradient-to-r from-violet-600 to-fuchsia-500'}`} style={{ width: `${team.eliminated ? 0 : Math.max(2, team.chance * 100)}%` }} /></div>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs"><p className="text-zinc-600">{team.matches ? `${text.sampleMapsLabel}: ${team.matches} · ${sampleLabel(team.matches)}` : text.noMatches}</p><span className={`shrink-0 rounded-full px-2 py-1 font-black ${team.eliminated ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500/10 text-emerald-300'}`}>{team.eliminated ? text.eliminatedFromEvent : text.stillAlive}</span></div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

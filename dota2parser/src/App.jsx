// UI_PATCH_VERSION: 2026-07-17-tier2-extended-v1
import { useMemo, useState } from 'react'
import TI2026 from './TI2026'
import data from './../../players_stat.json'
import leagues from './../../leagues.json'
import meta from './../../dataset_meta.json'
import teamLogoData from './../../team_logos.json'


const getTeamLogo = (teamName, fallback = '') => (
  teamLogoData?.teams?.[teamName]?.logo_url || fallback || ''
)

const ROLE_COLORS = {
  0: ['red', 'green', 'red', 'green', 'red'],
  1: ['red', 'blue', 'green', 'red', 'green'],
  2: ['blue', 'green', 'blue', 'green', 'blue'],
}

const COLOR_STATS = {
  red: ['kills', 'deaths', 'creep_score', 'gpm', 'madstone_collected', 'tower_kills'],
  blue: ['obs_placed', 'camps_stacked', 'runes_grabbed', 'watchers_taken', 'smokes_used'],
  green: ['roshan_kills', 'teamfight_participation', 'stuns', 'tormentor_kills', 'courier_kills', 'firstblood'],
}

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

const TITLES = {
  str: { percent: 13, en: ['Brawny', 'when playing a Strength hero'], ru: ['Крепкий', 'при игре на герое силы'] },
  agi: { percent: 15, en: ['Dashing', 'when playing an Agility hero'], ru: ['Ловкий', 'при игре на герое ловкости'] },
  int: { percent: 11, en: ['Canny', 'when playing an Intelligence hero'], ru: ['Смекалистый', 'при игре на герое интеллекта'] },
  all: { percent: 15, en: ['Balanced', 'when playing a Universal hero'], ru: ['Сбалансированный', 'при игре на универсальном герое'] },
  green: { percent: 18, en: ['Emerald', 'when playing a green hero'], ru: ['Изумрудный', 'при игре на зелёном герое'] },
  blue: { percent: 19, en: ['Cerulean', 'when playing a blue hero'], ru: ['Лазурный', 'при игре на синем герое'] },
  red: { percent: 13, en: ['Crimson', 'when playing a red hero'], ru: ['Багряный', 'при игре на красном герое'] },
  undead: { percent: 13, en: ['Otherworldly', 'when playing an undead, demon, or spirit hero'], ru: ['Потусторонний', 'при игре на нежити, демоне или духе'] },
  horns: { percent: 15, en: ['Bestial', 'when playing a horned or winged hero'], ru: ['Звериный', 'при игре на герое с рогами или крыльями'] },
  bearded: { percent: 10, en: ['Hirsute', 'when playing a bearded or fuzzy hero'], ru: ['Мохнатый', 'при игре на бородатом или пушистом герое'] },
  aquatic: { percent: 15, en: ['Elemental', 'when playing an aquatic, fiery, or icy hero'], ru: ['Стихийный', 'при игре на водном, огненном или ледяном герое'] },
  first_pick: { percent: 15, en: ['Sacrificial', "when the player's hero is picked first"], ru: ['Жертвенный', 'если героя игрока выбрали первым'] },
  last_pick: { percent: 15, en: ['Coveted', "when the player's hero is picked last"], ru: ['Желанный', 'если героя игрока выбрали последним'] },
  games_with_arcana: { percent: 25, en: ['Glamorous', "when the player's hero has an Arcana equipped"], ru: ['Роскошный', 'если на герое игрока надета Arcana'] },
  games_with_hero_master: { percent: 13, en: ['Virtuoso', 'when the hero has Master or Grandmaster tier'], ru: ['Виртуоз', 'если у героя уровень Master или Grandmaster'] },
}

const SUBTITLES = {
  '0_kills': { percent: 8, en: ['Pacifist', 'if the player ends the game with 0 kills'], ru: ['Пацифист', 'если игрок закончил игру с 0 убийств'] },
  lowest_networth: { percent: 8, en: ['Ant', 'if the player has the lowest net worth'], ru: ['Муравей', 'если у игрока самый низкий net worth'] },
  bbs_before_30min: { percent: 9, en: ['Bull', 'in games where the player buys back before minute 30'], ru: ['Бык', 'в играх с выкупом игрока до 30-й минуты'] },
  most_deaths: { percent: 15, en: ['North Pilgrim', 'if the player has the most deaths'], ru: ['Северный пилигрим', 'если у игрока больше всего смертей'] },
  '4+_active_items': { percent: 7, en: ['Octopus', 'when the player has 4 or more active items'], ru: ['Осьминог', 'если у игрока 4 или больше активных предметов'] },
  most_assists: { percent: 7, en: ['Accomplice', 'if the player has the most assists'], ru: ['Соучастник', 'если у игрока больше всего помощи'] },
  '9_slots': { percent: 21, en: ['Mule', 'when all 9 inventory and backpack slots are occupied'], ru: ['Мул', 'когда заняты все 9 слотов инвентаря и рюкзака'] },
  lost_games: { percent: 6, en: ['Underdog', "when the player's team loses"], ru: ['Аутсайдер', 'когда команда игрока проигрывает'] },
  most_voice_lines: { percent: 7, en: ['Loquacious', 'when the player uses the most voice lines'], ru: ['Болтливый', 'если игрок использовал больше всего реплик'] },
  total_deaths_from_torm: { percent: 9, global: true, en: ['Tormented', 'if any player dies to a Tormentor'], ru: ['Истязаемый', 'если кто-либо погибает от Терзателя'] },
  firstblood_before_10min: { percent: 13, global: true, en: ['Patient', 'if first blood happens after minute 10'], ru: ['Терпеливый', 'если первая кровь случилась после 10-й минуты'] },
  firstblood_before_horn: { percent: 7, global: true, en: ['Flayed Twins Acolyte', 'if first blood happens before the horn'], ru: ['Аколит Близнецов Живодёров', 'если первая кровь случилась до сигнала рога'] },
  'games<25min': { percent: 25, global: true, en: ['Decisive', 'in games shorter than 25 minutes'], ru: ['Решительный', 'в играх короче 25 минут'] },
}

const TEXT = {
  en: {
    appTitle: 'Dota 2 Fantasy Calculator', event: 'The International 2026', source: 'Original project', how: 'How it works', donate: 'Support the project',
    tournaments: 'Tournaments', all: 'All', clear: 'Clear', selected: 'selected', ongoing: 'ongoing', roles: ['Core', 'Mid', 'Support'],
    cardSetup: 'Fantasy card setup', cardSetupHint: 'Each role starts with three stat lines. Add the fourth and fifth only when your card has them.',
    title: 'Title', subtitle: 'Subtitle', stat: 'Stat', multiplier: 'Multiplier', noSelection: 'Not selected', bestPlayers: 'Best players',
    score: 'Estimated score', matches: 'matches', noDataTitle: 'Tournament data has not been parsed yet',
    noDataBody: 'Run python main.py. The site will read the updated players_stat.json after the next frontend build.',
    updated: 'Dataset updated', notGenerated: 'not generated yet', close: 'Close', formula: 'Calculation formula',
    formulaText: 'Each selected stat is averaged across the chosen tournaments and multiplied by its official coefficient and your manually entered multiplier. Title and subtitle bonuses are then applied.',
    globalNote: 'Tournament-wide subtitles use the number of qualifying matches in each selected event.',
    playerNote: 'Player subtitles and titles use only that player’s matches.', dataStatus: 'Parsed matches', language: 'Language',
    addPoint: 'Add point', removePoint: 'Remove last', pointCount: 'points enabled', manualHint: 'Type any value: 1, 1.5, 2.7…',
    noMatches: 'No matches', players: 'players', teamsLabel: 'TI 2026 teams', tournamentsLabel: 'pre-TI tournaments', localTime: 'local time', rankHint: 'Ranking updates instantly when you change stats, multipliers, titles or tournaments.',
    dataMode: 'Fantasy data source', preTiMode: 'Pre-TI only', tiLiveMode: 'TI 2026 live', combinedMode: 'Combined',
    preTiModeHint: 'Uses only the checked tournaments before TI.', tiLiveModeHint: 'Uses only maps already played at The International 2026.', combinedModeHint: 'Combines checked pre-TI events with TI maps at double weight.',
    automaticTi: 'TI auto-sync', activeDataset: 'Active calculation set', activeMatches: 'maps in active mode', tiWeightNote: 'TI maps have ×2 freshness weight in Combined mode.', tiNoDataBody: 'TI 2026 has not started or OpenDota has not published its League ID yet. The hourly bot will add maps automatically.', emptySelectionBody: 'Select at least one pre-TI tournament or switch the data source mode.',
    sampleMode: 'Pre-TI sample', mainSample: 'Main sample', extendedSample: 'Extended + Tier 2',
    mainSampleHint: 'Only the six main pre-TI tournaments are used.', extendedSampleHint: 'Adds optional Tier-2 events with reduced influence and gap-filling protection.',
    tier2Badge: 'Tier 2', tier2GapFill: 'Tier-2 influence is reduced when a player already has 20+ maps in the main sample.',
    primaryEvents: 'main events', tier2Events: 'Tier-2 events', baseWeight: 'base weight', effectiveWeight: 'effective weight',
  },
  ru: {
    appTitle: 'Калькулятор Dota 2 Fantasy', event: 'The International 2026', source: 'Оригинальный проект', how: 'Как считается', donate: 'Поддержать проект',
    tournaments: 'Турниры', all: 'Все', clear: 'Снять все', selected: 'выбрано', ongoing: 'идёт сейчас', roles: ['Керри / оффлейн', 'Мидер', 'Саппорт'],
    cardSetup: 'Настройка фэнтези-карт', cardSetupHint: 'Сначала открыты три пункта. Четвёртый и пятый добавляй только тогда, когда они есть на твоей карте.',
    title: 'Титул', subtitle: 'Субтитул', stat: 'Показатель', multiplier: 'Множитель', noSelection: 'Не выбрано', bestPlayers: 'Лучшие игроки',
    score: 'Расчётные очки', matches: 'матчей', noDataTitle: 'Данные турниров ещё не собраны',
    noDataBody: 'Запусти python main.py. После следующей сборки фронтенда сайт прочитает обновлённый players_stat.json.',
    updated: 'Датасет обновлён', notGenerated: 'ещё не создавался', close: 'Закрыть', formula: 'Формула расчёта',
    formulaText: 'Каждый выбранный показатель усредняется по отмеченным турнирам и умножается на официальный коэффициент и введённый вручную множитель. После этого применяются бонусы титула и субтитула.',
    globalNote: 'Общие субтитулы считаются по числу подходящих матчей на каждом выбранном турнире.',
    playerNote: 'Персональные титулы и субтитулы считаются только по матчам конкретного игрока.', dataStatus: 'Обработано матчей', language: 'Язык',
    addPoint: 'Добавить пункт', removePoint: 'Убрать последний', pointCount: 'пунктов включено', manualHint: 'Можно писать любое значение: 1, 1.5, 2.7…',
    noMatches: 'Нет матчей', players: 'игроков', teamsLabel: 'команд TI 2026', tournamentsLabel: 'предынтовых турниров', localTime: 'местное время', rankHint: 'Рейтинг сразу пересчитывается при смене показателей, множителей, титулов или турниров.',
    dataMode: 'Источник фэнтези-данных', preTiMode: 'Только до TI', tiLiveMode: 'Только TI 2026', combinedMode: 'Совмещённый',
    preTiModeHint: 'Учитываются только отмеченные турниры до Инта.', tiLiveModeHint: 'Учитываются только уже сыгранные карты The International 2026.', combinedModeHint: 'Отмеченные предынтовые турниры объединяются с матчами TI, которым даётся двойной вес.',
    automaticTi: 'TI автообновление', activeDataset: 'Активная выборка расчёта', activeMatches: 'карт в активном режиме', tiWeightNote: 'В совмещённом режиме свежие карты TI имеют вес ×2.', tiNoDataBody: 'TI 2026 ещё не начался или OpenDota пока не опубликовал League ID. Почасовой бот добавит карты автоматически.', emptySelectionBody: 'Выбери хотя бы один предынтовый турнир или переключи источник данных.',
    sampleMode: 'Предынтовая выборка', mainSample: 'Основная', extendedSample: 'Расширенная + Tier 2',
    mainSampleHint: 'Учитываются только шесть основных предынтовых турниров.', extendedSampleHint: 'Добавляются дополнительные Tier-2 турниры с пониженным весом и защитой от перекоса выборки.',
    tier2Badge: 'Tier 2', tier2GapFill: 'Влияние Tier 2 уменьшается, если у игрока уже есть 20+ карт в основной выборке.',
    primaryEvents: 'основных турниров', tier2Events: 'Tier-2 турниров', baseWeight: 'базовый вес', effectiveWeight: 'эффективный вес',
  },
}

const STAT_LABELS = {
  kills: ['Kills', 'Убийства'], deaths: ['Deaths', 'Смерти'], creep_score: ['Creep score', 'Добитые крипы'],
  gpm: ['GPM', 'GPM'], madstone_collected: ['Madstone collected', 'Собрано Madstone'], tower_kills: ['Tower kills', 'Уничтожено башен'],
  obs_placed: ['Observer wards', 'Observer-варды'], camps_stacked: ['Camps stacked', 'Сделано стаков'], runes_grabbed: ['Runes grabbed', 'Подобрано рун'],
  watchers_taken: ['Watchers captured', 'Захвачено наблюдателей'], smokes_used: ['Smokes used', 'Использовано Smoke'],
  roshan_kills: ['Roshan kills', 'Убийства Рошана'], teamfight_participation: ['Teamfight participation', 'Участие в драках'],
  stuns: ['Stun duration', 'Длительность оглушений'], tormentor_kills: ['Tormentor kills', 'Убийства Терзателя'],
  courier_kills: ['Courier kills', 'Убийства курьеров'], firstblood: ['First blood', 'Первая кровь'],
}

const COLOR_CLASSES = {
  red: 'border-red-500/50 bg-red-500/10 text-red-100',
  blue: 'border-blue-500/50 bg-blue-500/10 text-blue-100',
  green: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100',
}

const ROLE_ACCENTS = {
  0: 'from-red-500/15 via-transparent to-transparent',
  1: 'from-violet-500/15 via-transparent to-transparent',
  2: 'from-blue-500/15 via-transparent to-transparent',
}

function formatDateOnly(value, language) {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatDateTime(value, language) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function parseMultiplier(value) {
  const parsed = Number(String(value ?? '').trim().replace(',', '.'))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

function isTiLeague(league) {
  const name = `${league?.name || ''} ${league?.short_name || ''}`.toLowerCase()
  return Boolean(league?.is_ti) || (name.includes('international') && name.includes('2026'))
}

function isTier2League(league) {
  return Number(league?.tier || 1) === 2 || Boolean(league?.catalog_key)
}

function recordMatchCount(record) {
  if (!record?.stats) return 0
  return Object.values(record.stats)
    .flatMap((group) => Object.values(group || {}))
    .filter(Array.isArray)
    .reduce((maximum, values) => Math.max(maximum, values.length), 0)
}

function leagueTimestamp(league) {
  const timestamp = Date.parse(`${league?.start_date || '9999-12-31'}T00:00:00Z`)
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function weightedAverageParts(parts) {
  const denominator = parts.reduce((sum, item) => sum + Number(item.weight || 0), 0)
  if (!denominator) return 0
  return parts.reduce((sum, item) => sum + Number(item.value || 0) * Number(item.weight || 0), 0) / denominator
}


const EXTRA_TEXT = {
  en: {
    tabs: { calculator: 'Calculator', players: 'All players', recommendations: 'AI recommendations', ti: 'TI 2026' },
    allPlayersTitle: 'All player statistics', allPlayersHint: 'Choose a role and sort the full list by any fantasy stat.',
    sortBy: 'Sort by', none: 'None', titlesBlock: 'Titles', subtitlesBlock: 'Subtitles', totalMatches: 'Total matches',
    aiTitle: 'AI recommendations for maximum points', aiHint: 'The recommendation engine compares every TI player, all available stats, titles and subtitles using the active data source and your current slot multipliers.',
    aiDisclaimer: 'This is a statistical projection, not a guarantee. Drafts, patch changes and opponent strength can affect the real result.',
    recommendedPlayer: 'Recommended player', recommendedSetup: 'Recommended setup', projectedScore: 'Projected score',
    applySetup: 'Apply setup', alternatives: 'Alternatives', confidence: 'Data confidence', high: 'High', medium: 'Medium', low: 'Low',
    selectedMultiplierNote: 'Uses the multipliers currently entered in the calculator.', noRecommendation: 'Not enough parsed matches for a recommendation.',
    rawPoints: 'Fantasy points at ×1', roleTabs: ['Core', 'Mid', 'Support'], team: 'Team',
    noMatchesInTournaments: 'No matches in selected tournaments',
  },
  ru: {
    tabs: { calculator: 'Калькулятор', players: 'Все игроки', recommendations: 'ИИ-рекомендации', ti: 'TI 2026' },
    allPlayersTitle: 'Общая статистика игроков', allPlayersHint: 'Выбери роль и сортируй полный список по любому фэнтези-показателю.',
    sortBy: 'Сортировать по', none: 'Без сортировки', titlesBlock: 'Титулы', subtitlesBlock: 'Субтитулы', totalMatches: 'Всего матчей',
    aiTitle: 'ИИ-рекомендации для максимального набора очков', aiHint: 'Система сравнивает всех игроков TI, доступные показатели, титулы и субтитулы по активному источнику данных и текущим множителям карты.',
    aiDisclaimer: 'Это статистический прогноз, а не гарантия. Драфты, патч и сила соперника могут изменить реальный результат.',
    recommendedPlayer: 'Рекомендуемый игрок', recommendedSetup: 'Рекомендуемая сборка', projectedScore: 'Прогноз очков',
    applySetup: 'Применить сборку', alternatives: 'Альтернативы', confidence: 'Надёжность данных', high: 'Высокая', medium: 'Средняя', low: 'Низкая',
    selectedMultiplierNote: 'Используются множители, которые сейчас введены в калькуляторе.', noRecommendation: 'Недостаточно распарсенных матчей для рекомендации.',
    rawPoints: 'Фэнтези-очки при ×1', roleTabs: ['Core', 'Mid', 'Support'], team: 'Команда',
    noMatchesInTournaments: 'Нет матчей в выбранных турнирах',
  },
}

const STAT_TO_COLOR = Object.fromEntries(
  Object.entries(COLOR_STATS).flatMap(([color, stats]) => stats.map((stat) => [stat, color])),
)

const ROLE_GROUPS = {
  0: ['red', 'green'],
  1: ['red', 'blue', 'green'],
  2: ['blue', 'green'],
}

const TITLE_COUNT_LABELS = {
  str: ['Strength heroes played', 'Героев силы сыграно'],
  agi: ['Agility heroes played', 'Героев ловкости сыграно'],
  int: ['Intelligence heroes played', 'Героев интеллекта сыграно'],
  all: ['Universal heroes played', 'Универсальных героев сыграно'],
  green: ['Green heroes played', 'Зелёных героев сыграно'],
  blue: ['Blue heroes played', 'Синих героев сыграно'],
  red: ['Red heroes played', 'Красных героев сыграно'],
  undead: ['Undead/demon/spirit heroes played', 'Нежить/демоны/духи сыграно'],
  horns: ['Horned/winged heroes played', 'Героев с рогами/крыльями сыграно'],
  bearded: ['Bearded/fuzzy heroes played', 'Бородатых/пушистых героев сыграно'],
  aquatic: ['Aquatic/fiery/icy heroes played', 'Водных/огненных/ледяных героев сыграно'],
  first_pick: ['First picked', 'Выбран первым'],
  last_pick: ['Last picked', 'Выбран последним'],
  games_with_arcana: ['Arcana equipped', 'Игр с Arcana'],
  games_with_hero_master: ['Master/Grandmaster hero', 'Игр с Master/Grandmaster героем'],
}

const SUBTITLE_COUNT_LABELS = {
  '0_kills': ['Games without kills', 'Игр без убийств'],
  lowest_networth: ['Lowest net worth', 'Самый низкий net worth'],
  bbs_before_30min: ['Buyback before minute 30', 'Выкуп до 30-й минуты'],
  most_deaths: ['Most deaths', 'Больше всего смертей'],
  '4+_active_items': ['4+ active items', '4+ активных предмета'],
  most_assists: ['Most assists', 'Больше всего помощи'],
  '9_slots': ['All 9 slots occupied', 'Заняты все 9 слотов'],
  lost_games: ['Lost games', 'Проигранные игры'],
  most_voice_lines: ['Most voice lines', 'Больше всего реплик'],
}
function App() {
  const [language, setLanguage] = useState(() => localStorage.getItem('d2f-language') || 'ru')
  const [dataMode, setDataMode] = useState(() => {
    const saved = localStorage.getItem('d2f-data-mode')
    return ['pre', 'ti', 'combined'].includes(saved) ? saved : 'pre'
  })
  const [sampleMode, setSampleMode] = useState(() => localStorage.getItem('d2f-sample-mode') === 'extended' ? 'extended' : 'main')
  const [selectedTournaments, setSelectedTournaments] = useState(() => Object.entries(leagues)
    .filter(([, league]) => !isTiLeague(league))
    .map(([leagueId]) => leagueId))
  const [showHow, setShowHow] = useState(false)
  const [activeTab, setActiveTab] = useState('calculator')
  const [selectedRole, setSelectedRole] = useState(0)
  const [sortBy, setSortBy] = useState('')
  const [selectedStats, setSelectedStats] = useState(Array(15).fill(null))
  const [selectedMultipliers, setSelectedMultipliers] = useState(Array(15).fill('1'))
  const [selectedTitles, setSelectedTitles] = useState(Array(3).fill(null))
  const [selectedSubtitles, setSelectedSubtitles] = useState(Array(3).fill(null))
  const [visibleSlots, setVisibleSlots] = useState([3, 3, 3])

  const t = { ...TEXT[language], ...EXTRA_TEXT[language] }
  const languageIndex = language === 'en' ? 0 : 1

  const players = useMemo(() => Object.entries(data).filter(([, info]) => info?.general), [])
  const leagueEntries = useMemo(() => Object.entries(leagues)
    .sort(([, leagueA], [, leagueB]) => leagueTimestamp(leagueA) - leagueTimestamp(leagueB) || String(leagueA.name || '').localeCompare(String(leagueB.name || ''))), [])
  const preTiLeagueIds = useMemo(() => leagueEntries.filter(([, league]) => !isTiLeague(league) && !isTier2League(league)).map(([leagueId]) => leagueId), [leagueEntries])
  const tier2LeagueIds = useMemo(() => leagueEntries.filter(([, league]) => !isTiLeague(league) && isTier2League(league)).map(([leagueId]) => leagueId), [leagueEntries])
  const tiLeagueIds = useMemo(() => leagueEntries.filter(([, league]) => isTiLeague(league)).map(([leagueId]) => leagueId), [leagueEntries])
  const allowedPreTiLeagueIds = useMemo(() => sampleMode === 'extended' ? [...preTiLeagueIds, ...tier2LeagueIds] : preTiLeagueIds, [preTiLeagueIds, sampleMode, tier2LeagueIds])
  const selectedPrimaryLeagueIds = useMemo(() => selectedTournaments.filter((leagueId) => preTiLeagueIds.includes(leagueId)), [preTiLeagueIds, selectedTournaments])
  const effectiveLeagueIds = useMemo(() => {
    if (dataMode === 'ti') return tiLeagueIds
    const preTi = selectedTournaments.filter((leagueId) => allowedPreTiLeagueIds.includes(leagueId))
    if (dataMode === 'combined') return [...preTi, ...tiLeagueIds]
    return preTi
  }, [allowedPreTiLeagueIds, dataMode, selectedTournaments, tiLeagueIds])
  const activeParsedMatches = useMemo(() => effectiveLeagueIds.reduce((sum, leagueId) => sum + Number(leagues[leagueId]?.total_matches_parsed || 0), 0), [effectiveLeagueIds])
  const dataModeHint = dataMode === 'ti' ? t.tiLiveModeHint : dataMode === 'combined' ? t.combinedModeHint : t.preTiModeHint
  const sampleModeHint = sampleMode === 'extended' ? t.extendedSampleHint : t.mainSampleHint
  const sourceLabel = dataMode === 'ti' ? t.tiLiveMode : dataMode === 'combined' ? t.combinedMode : t.preTiMode
  const sampleLabel = sampleMode === 'extended' ? t.extendedSample : t.mainSample
  const dataModeLabel = dataMode === 'ti' ? sourceLabel : `${sourceLabel} · ${sampleLabel}`

  const chooseLanguage = (nextLanguage) => {
    localStorage.setItem('d2f-language', nextLanguage)
    setLanguage(nextLanguage)
  }

  const chooseDataMode = (nextMode) => {
    localStorage.setItem('d2f-data-mode', nextMode)
    setDataMode(nextMode)
  }

  const chooseSampleMode = (nextMode) => {
    localStorage.setItem('d2f-sample-mode', nextMode)
    setSampleMode(nextMode)
    if (nextMode === 'extended') {
      setSelectedTournaments((current) => [...new Set([...current, ...tier2LeagueIds])])
    }
  }

  const updateArray = (setter, index, value) => {
    setter((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))
  }

  const primaryMatchCount = (info) => selectedPrimaryLeagueIds.reduce((sum, leagueId) => sum + recordMatchCount(info?.[leagueId]), 0)

  const leagueWeightForPlayer = (info, leagueId) => {
    const league = leagues[leagueId] || {}
    if (dataMode === 'combined' && isTiLeague(league)) return Number(league.fantasy_weight || 2)
    if (sampleMode !== 'extended' || !isTier2League(league)) return 1

    const baseWeight = Number(league.fantasy_weight || 0.35)
    const threshold = Math.max(1, Number(league.coverage_threshold_maps || 20))
    const minimumFactor = Math.min(1, Math.max(0, Number(league.minimum_weight_factor || 0.25)))
    const coverage = Math.min(1, primaryMatchCount(info) / threshold)
    const gapFillFactor = 1 - (1 - minimumFactor) * coverage
    return baseWeight * gapFillFactor
  }

  const selectedLeagueRecords = (info) => effectiveLeagueIds
    .map((leagueId) => [leagueId, info?.[leagueId], leagueWeightForPlayer(info, leagueId)])
    .filter(([, record]) => record?.stats)

  const statAverage = (info, color, statKey) => {
    let numerator = 0
    let denominator = 0
    selectedLeagueRecords(info).forEach(([, record, weight]) => {
      const statValues = record?.stats?.[color]?.[statKey]
      if (!Array.isArray(statValues) || statValues.length === 0) return
      numerator += statValues.reduce((sum, value) => sum + Number(value || 0), 0) * weight
      denominator += statValues.length * weight
    })
    return denominator ? numerator / denominator : 0
  }

  const statPoints = (info, color, statKey, multiplier = 1) => {
    const avg = statAverage(info, color, statKey)
    if (statKey === 'deaths') return Math.max(0, 1800 - avg * SCORE_FACTORS.deaths) * multiplier
    return avg * Number(SCORE_FACTORS[statKey] || 1) * multiplier
  }

  const matchCount = (info) => {
    let total = 0
    selectedLeagueRecords(info).forEach(([, record]) => {
      total += recordMatchCount(record)
    })
    return total
  }

  const aggregateCounts = (info, category) => {
    const result = {}
    selectedLeagueRecords(info).forEach(([, record]) => {
      Object.entries(record?.[category] || {}).forEach(([key, value]) => {
        result[key] = Number(result[key] || 0) + Number(value || 0)
      })
    })
    return result
  }

  const titleBonus = (info, titleKey) => {
    if (!titleKey) return 0
    const title = TITLES[titleKey]
    const parts = selectedLeagueRecords(info).map(([, record, weight]) => {
      const matches = recordMatchCount(record)
      return { value: matches ? (Number(record.titles?.[titleKey] || 0) * title.percent) / matches : 0, weight: matches * weight }
    }).filter((part) => part.weight > 0)
    return weightedAverageParts(parts)
  }

  const subtitleBonus = (info, subtitleKey) => {
    if (!subtitleKey) return 0
    const subtitle = SUBTITLES[subtitleKey]
    const parts = effectiveLeagueIds.map((leagueId) => {
      const league = leagues[leagueId] || {}
      const freshnessWeight = leagueWeightForPlayer(info, leagueId)
      if (subtitle.global) {
        const totalMatches = Number(league.total_matches_parsed || 0)
        const occurrences = Number(league[subtitleKey] || 0)
        return totalMatches ? { value: (occurrences * subtitle.percent) / totalMatches, weight: totalMatches * freshnessWeight } : null
      }

      const record = info?.[leagueId]
      if (!record?.stats) return null
      const matches = recordMatchCount(record)
      return matches ? { value: (Number(record.subtitles?.[subtitleKey] || 0) * subtitle.percent) / matches, weight: matches * freshnessWeight } : null
    }).filter(Boolean)
    return weightedAverageParts(parts)
  }

  const scoreForPlayer = (info) => {
    const role = Number(info.general.pos)
    const baseIndex = role * 5
    const statScore = ROLE_COLORS[role].reduce((total, color, slot) => {
      if (slot >= visibleSlots[role]) return total
      const statKey = selectedStats[baseIndex + slot]
      if (!statKey) return total
      const multiplier = parseMultiplier(selectedMultipliers[baseIndex + slot])
      return total + statPoints(info, color, statKey, multiplier)
    }, 0)

    const bonus = titleBonus(info, selectedTitles[role]) + subtitleBonus(info, selectedSubtitles[role])
    return statScore * (1 + bonus / 100)
  }

  const rankedPlayersForRole = (role) => players
    .filter(([, info]) => Number(info.general.pos) === role)
    .map(([name, info]) => ({ name, info, score: scoreForPlayer(info) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))

  const setSlotCount = (role, nextCount) => {
    const bounded = Math.max(3, Math.min(5, nextCount))
    const previousCount = visibleSlots[role]
    setVisibleSlots((current) => current.map((count, index) => index === role ? bounded : count))

    if (bounded < previousCount) {
      const start = role * 5 + bounded
      const end = role * 5 + 5
      setSelectedStats((current) => current.map((value, index) => index >= start && index < end ? null : value))
      setSelectedMultipliers((current) => current.map((value, index) => index >= start && index < end ? '1' : value))
    }
  }

  const updateMultiplier = (index, value) => {
    if (/^\d*(?:[.,]\d*)?$/.test(value)) updateArray(setSelectedMultipliers, index, value)
  }

  const playerListForRole = (role) => players
    .filter(([, info]) => Number(info.general.pos) === role)
    .sort(([nameA, infoA], [nameB, infoB]) => {
      if (!sortBy) return nameA.localeCompare(nameB)
      const color = STAT_TO_COLOR[sortBy]
      const valueA = statAverage(infoA, color, sortBy)
      const valueB = statAverage(infoB, color, sortBy)
      if (sortBy === 'deaths') return valueA - valueB || nameA.localeCompare(nameB)
      return valueB - valueA || nameA.localeCompare(nameB)
    })

  const bestSetupForPlayer = (name, info, role) => {
    const slotColors = ROLE_COLORS[role].slice(0, visibleSlots[role])
    const baseIndex = role * 5
    let bestStatScore = -1
    let bestStats = []

    const searchStats = (slot, used, total, chosen) => {
      if (slot === slotColors.length) {
        if (total > bestStatScore) {
          bestStatScore = total
          bestStats = [...chosen]
        }
        return
      }

      const color = slotColors[slot]
      const multiplier = parseMultiplier(selectedMultipliers[baseIndex + slot])
      COLOR_STATS[color].forEach((statKey) => {
        if (used.has(statKey)) return
        used.add(statKey)
        chosen.push(statKey)
        searchStats(slot + 1, used, total + statPoints(info, color, statKey, multiplier), chosen)
        chosen.pop()
        used.delete(statKey)
      })
    }

    searchStats(0, new Set(), 0, [])

    const bestTitle = Object.keys(TITLES)
      .map((key) => ({ key, bonus: titleBonus(info, key) }))
      .sort((a, b) => b.bonus - a.bonus)[0] || { key: null, bonus: 0 }

    const bestSubtitle = Object.keys(SUBTITLES)
      .map((key) => ({ key, bonus: subtitleBonus(info, key) }))
      .sort((a, b) => b.bonus - a.bonus)[0] || { key: null, bonus: 0 }

    const score = Math.max(0, bestStatScore) * (1 + (bestTitle.bonus + bestSubtitle.bonus) / 100)
    return { name, info, stats: bestStats, title: bestTitle.key, subtitle: bestSubtitle.key, score, matches: matchCount(info) }
  }

  const recommendationsForRole = (role) => players
    .filter(([, info]) => Number(info.general.pos) === role && matchCount(info) > 0)
    .map(([name, info]) => bestSetupForPlayer(name, info, role))
    .sort((a, b) => b.score - a.score || b.matches - a.matches)
    .slice(0, 5)

  const applyRecommendation = (role, recommendation) => {
    const baseIndex = role * 5
    setSelectedStats((current) => current.map((value, index) => {
      if (index < baseIndex || index >= baseIndex + 5) return value
      const slot = index - baseIndex
      return slot < visibleSlots[role] ? recommendation.stats[slot] || null : value
    }))
    updateArray(setSelectedTitles, role, recommendation.title)
    updateArray(setSelectedSubtitles, role, recommendation.subtitle)
    setActiveTab('calculator')
    window.scrollTo({ top: document.body.scrollHeight * 0.35, behavior: 'smooth' })
  }

  const confidenceForMatches = (matches) => {
    if (matches >= 25) return t.high
    if (matches >= 10) return t.medium
    return t.low
  }

  const renderRoleTabs = () => (
    <div className="relative mb-8 grid grid-cols-3 border-b border-white/10">
      {[0, 1, 2].map((role) => (
        <button
          key={role}
          onClick={() => setSelectedRole(role)}
          className={`px-2 pb-5 text-center text-2xl font-black transition sm:text-4xl ${selectedRole === role ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}
        >
          {t.roleTabs[role]}
        </button>
      ))}
      <span
        className="absolute bottom-0 left-0 h-1 w-1/3 bg-white transition-transform duration-300"
        style={{ transform: `translateX(${selectedRole * 100}%)` }}
      />
    </div>
  )

  const renderPlayerCard = ([playerName, info]) => {
    const titles = aggregateCounts(info, 'titles')
    const subtitles = aggregateCounts(info, 'subtitles')
    const matches = matchCount(info)
    const teamName = info.general.team_name || '—'
    const teamLogo = getTeamLogo(teamName, info.general.team_logo)

    return (
      <article key={playerName} className="flex min-w-0 flex-col gap-4 rounded-xl bg-gradient-to-b from-purple-950 via-purple-950/75 to-transparent p-4 text-white shadow-xl shadow-black/20">
        <div className="flex min-h-12 items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-3xl font-black">{playerName}</h3>
            <p className="mt-1 truncate text-xs text-violet-200/60">{teamName}</p>
          </div>
          {teamLogo ? (
            <img src={teamLogo} alt={teamName} className="h-10 w-16 shrink-0 object-contain" onError={(event) => { event.currentTarget.style.display = 'none' }} />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 text-xs font-black text-zinc-400">{teamName.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <p className="text-sm"><strong>{t.totalMatches}:</strong> {matches}</p>
        {matches === 0 && (
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200">
            {t.noMatchesInTournaments}
          </p>
        )}

        {ROLE_GROUPS[selectedRole].map((color) => (
          <div key={color} className={`rounded-lg border p-3 ${COLOR_CLASSES[color]}`}>
            {COLOR_STATS[color].map((statKey) => (
              <div key={statKey} className="flex items-baseline gap-2 text-sm leading-6">
                <span className="min-w-0 truncate"><strong>{STAT_LABELS[statKey][languageIndex]}:</strong></span>
                <span className="min-w-3 flex-1 border-b border-dotted border-white/20" />
                <span className="shrink-0 font-bold">{formatNumber(statPoints(info, color, statKey, 1))}</span>
              </div>
            ))}
          </div>
        ))}

        <div>
          <h4 className="mb-1 font-black">{t.titlesBlock}:</h4>
          <div className="space-y-0.5 text-sm text-zinc-200">
            {Object.entries(titles).filter(([, value]) => value > 0).map(([key, value]) => (
              <div key={key}>{TITLE_COUNT_LABELS[key]?.[languageIndex] || key}: {value}</div>
            ))}
            {Object.values(titles).every((value) => !value) && <span className="text-zinc-600">—</span>}
          </div>
        </div>

        <div>
          <h4 className="mb-1 font-black">{t.subtitlesBlock}:</h4>
          <div className="space-y-0.5 text-sm text-zinc-200">
            {Object.entries(subtitles).filter(([, value]) => value > 0).map(([key, value]) => (
              <div key={key}>{SUBTITLE_COUNT_LABELS[key]?.[languageIndex] || key}: {value}</div>
            ))}
            {Object.values(subtitles).every((value) => !value) && <span className="text-zinc-600">—</span>}
          </div>
        </div>
      </article>
    )
  }

  return (
    <div className="min-h-screen bg-[#07070b] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.17),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(220,38,38,.09),transparent_28%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="mx-auto max-w-[1700px] px-5 py-5 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-400">{t.event}</p>
              <h1 className="mt-1 text-2xl font-black sm:text-3xl">{t.appTitle}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://send.monobank.ua/jar/6Pnjo5o48i"
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-fuchsia-400/30 bg-gradient-to-r from-violet-600/90 to-fuchsia-600/90 px-4 py-2 text-sm font-black text-white shadow-lg shadow-violet-950/30 transition hover:brightness-110"
              >
                ♥ {t.donate}
              </a>
              <button onClick={() => setShowHow(true)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">{t.how}</button>
              <div className="flex rounded-xl border border-white/10 bg-white/5 p-1" aria-label={t.language}>
                {['ru', 'en'].map((item) => (
                  <button key={item} onClick={() => chooseLanguage(item)} className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${language === item ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>{item.toUpperCase()}</button>
                ))}
              </div>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            {Object.entries(t.tabs).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${activeTab === tab ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/40' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
              >
                {tab === 'recommendations' && '✦ '}{tab === 'ti' && '🏆 '}{label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-[1700px] space-y-8 px-5 py-8 lg:px-10">
        {activeParsedMatches === 0 && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
            <h2 className="font-black text-amber-200">{t.noDataTitle}</h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-amber-100/80">{dataMode === 'ti' ? t.tiNoDataBody : effectiveLeagueIds.length === 0 ? t.emptySelectionBody : t.noDataBody}</p>
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[.035] p-5 shadow-2xl shadow-black/20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">{t.tournaments}</h2>
                <p className="text-sm text-zinc-500">{effectiveLeagueIds.length} / {dataMode === 'ti' ? tiLeagueIds.length : allowedPreTiLeagueIds.length + (dataMode === 'combined' ? tiLeagueIds.length : 0)} {t.selected}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSelectedTournaments(allowedPreTiLeagueIds)} className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold hover:bg-violet-500">{t.all}</button>
                <button onClick={() => setSelectedTournaments([])} className="rounded-lg bg-zinc-800 px-3 py-2 text-xs font-bold hover:bg-zinc-700">{t.clear}</button>
              </div>
            </div>
            <div className="mb-4 grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/[.07] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.18em] text-violet-300">{t.dataMode}</p>
                    <p className="mt-1 text-xs text-zinc-400">{dataModeHint}</p>
                  </div>
                  <div className="flex flex-wrap rounded-xl border border-white/10 bg-black/30 p-1">
                    {[
                      ['pre', t.preTiMode],
                      ['ti', t.tiLiveMode],
                      ['combined', t.combinedMode],
                    ].map(([mode, label]) => (
                      <button key={mode} onClick={() => chooseDataMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-black transition ${dataMode === mode ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}>{label}</button>
                    ))}
                  </div>
                </div>
                {dataMode === 'combined' && <p className="mt-2 text-xs font-bold text-violet-200/80">{t.tiWeightNote}</p>}
              </div>

              <div className={`rounded-xl border p-3 transition ${sampleMode === 'extended' ? 'border-amber-400/30 bg-amber-400/[.07]' : 'border-white/10 bg-white/[.025]'} ${dataMode === 'ti' ? 'opacity-50' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs font-black uppercase tracking-[.18em] ${sampleMode === 'extended' ? 'text-amber-300' : 'text-zinc-300'}`}>{t.sampleMode}</p>
                    <p className="mt-1 text-xs text-zinc-400">{sampleModeHint}</p>
                  </div>
                  <div className="flex flex-wrap rounded-xl border border-white/10 bg-black/30 p-1">
                    {[['main', t.mainSample], ['extended', t.extendedSample]].map(([mode, label]) => (
                      <button key={mode} disabled={dataMode === 'ti'} onClick={() => chooseSampleMode(mode)} className={`rounded-lg px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed ${sampleMode === mode ? mode === 'extended' ? 'bg-amber-500 text-black' : 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'}`}>{label}</button>
                    ))}
                  </div>
                </div>
                {sampleMode === 'extended' && dataMode !== 'ti' && <p className="mt-2 text-xs font-bold text-amber-200/80">{t.tier2GapFill}</p>}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {leagueEntries.map(([leagueId, league]) => {
                const tiLeague = isTiLeague(league)
                const tier2League = isTier2League(league)
                const available = tiLeague ? dataMode !== 'pre' : allowedPreTiLeagueIds.includes(leagueId)
                const active = tiLeague ? dataMode !== 'pre' : available && selectedTournaments.includes(leagueId)
                const activeClass = tier2League
                  ? 'border-amber-400/70 bg-amber-400/10'
                  : 'border-violet-500/70 bg-violet-500/15'
                return (
                  <button
                    key={leagueId}
                    onClick={() => {
                      if (tiLeague) {
                        chooseDataMode(dataMode === 'pre' ? 'ti' : dataMode === 'ti' ? 'combined' : 'pre')
                        return
                      }
                      if (tier2League && sampleMode !== 'extended') {
                        chooseSampleMode('extended')
                        setSelectedTournaments((current) => [...new Set([...current, leagueId])])
                        return
                      }
                      setSelectedTournaments((current) => active ? current.filter((id) => id !== leagueId) : [...current, leagueId])
                    }}
                    className={`rounded-xl border p-4 text-left transition ${active ? activeClass : tier2League && sampleMode !== 'extended' ? 'border-amber-400/10 bg-black/15 opacity-55 hover:opacity-80' : 'border-white/10 bg-black/20 hover:border-white/20'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <strong className="leading-5">{league.short_name || league.name}</strong>
                        {tier2League && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-300">{t.tier2Badge} · {t.baseWeight} ×{Number(league.fantasy_weight || 0.35).toFixed(2)}</p>}
                      </div>
                      <span className={`mt-0.5 size-4 shrink-0 rounded border ${active ? tier2League ? 'border-amber-300 bg-amber-400' : 'border-violet-400 bg-violet-500' : 'border-zinc-600'}`} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">{formatDateOnly(league.start_date, language)} — {formatDateOnly(league.end_date, language)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                      <span className="text-zinc-400">{Number(league.total_matches_parsed || 0)} {t.matches}</span>
                      <span className="flex items-center gap-1.5">{tiLeague && <span className="rounded-full bg-violet-500/15 px-2 py-1 font-bold text-violet-300">{t.automaticTi}</span>}{league.status === 'ongoing' && <span className="rounded-full bg-emerald-500/15 px-2 py-1 font-bold text-emerald-300">{t.ongoing}</span>}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-white/[.035] p-5">
            <h2 className="text-xl font-black">{t.dataStatus}</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider text-violet-300">{t.activeDataset}: {dataModeLabel}</p>
            <div className="mt-4 flex items-end gap-2"><p className="text-5xl font-black text-violet-400">{activeParsedMatches}</p><span className="pb-1 text-xs font-bold text-zinc-500">{t.activeMatches}</span></div>
            <p className="mt-2 text-sm text-zinc-500">{t.updated}: {meta.generated_at ? `${formatDateTime(meta.generated_at, language)} (${t.localTime})` : t.notGenerated}</p>
            <div className="mt-5 space-y-2 text-sm text-zinc-400">
              <p>16 {t.teamsLabel}</p>
              <p>{players.length} {t.players}</p>
              <p>{preTiLeagueIds.length} {t.primaryEvents}</p>
              <p>{tier2LeagueIds.length} {t.tier2Events}</p>
              <p className="font-bold text-violet-300">{dataModeLabel}</p>
            </div>
          </aside>
        </section>

        {activeTab === 'calculator' && (
          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-black">{t.cardSetup}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t.cardSetupHint}</p>
              <p className="mt-1 text-xs text-violet-300/80">{t.rankHint}</p>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-3">
              {[0, 1, 2].map((role) => {
                const ranking = rankedPlayersForRole(role)
                const baseIndex = role * 5
                return (
                  <article key={role} className={`overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b ${ROLE_ACCENTS[role]} bg-zinc-950/70 shadow-2xl shadow-black/20`}>
                    <div className="border-b border-white/10 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-black">{t.roles[role]}</h3>
                          <p className="mt-1 text-xs text-zinc-500">{visibleSlots[role]} / 5 {t.pointCount}</p>
                        </div>
                        <span className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-black text-zinc-300">{ranking.length} {t.players}</span>
                      </div>

                      <div className="mt-5 grid gap-3">
                        <label>
                          <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-500">{t.title}</span>
                          <select value={selectedTitles[role] || ''} onChange={(event) => updateArray(setSelectedTitles, role, event.target.value || null)} className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-violet-500">
                            <option value="">{t.noSelection}</option>
                            {Object.entries(TITLES).map(([key, value]) => <option key={key} value={key}>{value[language][0]} (+{value.percent}%) — {value[language][1]}</option>)}
                          </select>
                        </label>
                        <label>
                          <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-zinc-500">{t.subtitle}</span>
                          <select value={selectedSubtitles[role] || ''} onChange={(event) => updateArray(setSelectedSubtitles, role, event.target.value || null)} className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm outline-none focus:border-violet-500">
                            <option value="">{t.noSelection}</option>
                            {Object.entries(SUBTITLES).map(([key, value]) => <option key={key} value={key}>{value[language][0]} (+{value.percent}%) — {value[language][1]}</option>)}
                          </select>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-3 p-5">
                      {ROLE_COLORS[role].slice(0, visibleSlots[role]).map((color, slot) => {
                        const index = baseIndex + slot
                        return (
                          <div key={`${role}-${slot}`} className={`rounded-xl border p-3 ${COLOR_CLASSES[color]}`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-xs font-black uppercase tracking-wider">{t.stat} {slot + 1}</span>
                              <span className="size-2.5 rounded-full bg-current opacity-80" />
                            </div>
                            <div className="grid grid-cols-[minmax(0,1fr)_105px] gap-2">
                              <select value={selectedStats[index] || ''} onChange={(event) => updateArray(setSelectedStats, index, event.target.value || null)} className="min-w-0 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500">
                                <option value="">{t.noSelection}</option>
                                {COLOR_STATS[color].map((stat) => <option key={stat} value={stat}>{STAT_LABELS[stat][languageIndex]}</option>)}
                              </select>
                              <label className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-zinc-500">×</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  aria-label={t.multiplier}
                                  title={t.manualHint}
                                  value={selectedMultipliers[index]}
                                  onChange={(event) => updateMultiplier(index, event.target.value)}
                                  onBlur={() => {
                                    if (!String(selectedMultipliers[index]).trim()) updateArray(setSelectedMultipliers, index, '1')
                                  }}
                                  className="w-full rounded-lg border border-white/10 bg-zinc-950 py-2.5 pl-7 pr-2 text-sm font-bold text-white outline-none focus:border-violet-500"
                                />
                              </label>
                            </div>
                          </div>
                        )
                      })}

                      <div className="flex flex-wrap gap-2 pt-1">
                        {visibleSlots[role] < 5 && (
                          <button onClick={() => setSlotCount(role, visibleSlots[role] + 1)} className="flex-1 rounded-lg bg-violet-600 px-3 py-2.5 text-xs font-black hover:bg-violet-500">
                            + {t.addPoint} {visibleSlots[role] + 1}
                          </button>
                        )}
                        {visibleSlots[role] > 3 && (
                          <button onClick={() => setSlotCount(role, visibleSlots[role] - 1)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-black text-zinc-300 hover:bg-white/10">
                            − {t.removePoint}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600">{t.manualHint}</p>
                    </div>

                    <div className="border-t border-white/10 bg-black/20 p-5">
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <h4 className="text-lg font-black">{t.bestPlayers}</h4>
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-600">{t.score}</span>
                      </div>
                      <ol className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {ranking.map(({ name, info, score }, rank) => {
                          const matches = matchCount(info)
                          return (
                            <li key={name} title={`${info.general.team_name || ''} · ${matches} ${t.matches}`} className="flex min-w-0 items-baseline text-sm">
                              <span className={`min-w-0 truncate ${matches ? 'text-zinc-200' : 'text-zinc-600'}`}>{rank + 1}. {name}</span>
                              <span className="mx-1.5 min-w-3 flex-1 border-b border-dotted border-white/20" />
                              {matches > 0 ? (
                                <strong className="shrink-0 text-violet-300">{formatNumber(score)}</strong>
                              ) : (
                                <span className="shrink-0 text-[10px] font-bold text-zinc-600">{t.noMatchesInTournaments}</span>
                              )}
                            </li>
                          )
                        })}
                      </ol>
                      {ranking.length === 0 && <p className="py-6 text-center text-sm text-zinc-600">{t.noMatches}</p>}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {activeTab === 'players' && (
          <section>
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-black sm:text-5xl">{t.allPlayersTitle}</h2>
              <p className="mt-2 text-sm text-zinc-500">{t.allPlayersHint}</p>
            </div>

            {renderRoleTabs()}

            <div className="mb-8 flex flex-col items-center justify-center gap-2">
              <label className="text-sm font-black">{t.sortBy}:</label>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="min-w-64 rounded-lg border border-white/10 bg-white px-3 py-2 text-black outline-none">
                <option value="">{t.none}</option>
                {Object.entries(COLOR_STATS).flatMap(([color, stats]) => stats.map((statKey) => (
                  <option key={`${color}-${statKey}`} value={statKey}>{STAT_LABELS[statKey][languageIndex]}</option>
                )))}
              </select>
              <p className="text-xs text-zinc-600">{t.rawPoints}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {playerListForRole(selectedRole).map(renderPlayerCard)}
            </div>
          </section>
        )}

        {activeTab === 'ti' && (
          <TI2026 language={language} selectedTournamentIds={effectiveLeagueIds} />
        )}

        {activeTab === 'recommendations' && (
          <section>
            <div className="mb-8 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-violet-300">✦ Fantasy AI</p>
              <h2 className="mt-2 text-3xl font-black sm:text-5xl">{t.aiTitle}</h2>
              <p className="mt-3 max-w-5xl leading-7 text-zinc-300">{t.aiHint}</p>
              <p className="mt-2 text-sm text-violet-200/70">{t.selectedMultiplierNote}</p>
              <p className="mt-4 text-xs text-zinc-500">{t.aiDisclaimer}</p>
            </div>

            <div className="grid items-start gap-6 xl:grid-cols-3">
              {[0, 1, 2].map((role) => {
                const recommendations = recommendationsForRole(role)
                const top = recommendations[0]
                return (
                  <article key={role} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/75 shadow-2xl shadow-black/30">
                    <div className={`bg-gradient-to-r ${ROLE_ACCENTS[role]} border-b border-white/10 p-5`}>
                      <h3 className="text-2xl font-black">{t.roleTabs[role]}</h3>
                      <p className="mt-1 text-xs text-zinc-500">{visibleSlots[role]} / 5 {t.pointCount}</p>
                    </div>

                    {!top ? (
                      <p className="p-8 text-center text-sm text-zinc-600">{t.noRecommendation}</p>
                    ) : (
                      <>
                        <div className="p-5">
                          <p className="text-xs font-black uppercase tracking-wider text-zinc-500">{t.recommendedPlayer}</p>
                          <div className="mt-2 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-3xl font-black text-white">{top.name}</h4>
                              <p className="mt-1 text-sm text-zinc-500">{top.info.general.team_name || '—'} · {top.matches} {t.matches}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-500">{t.projectedScore}</p>
                              <strong className="text-2xl text-violet-300">{formatNumber(top.score)}</strong>
                            </div>
                          </div>

                          <div className="mt-5 rounded-xl border border-white/10 bg-white/[.035] p-4">
                            <p className="mb-3 text-xs font-black uppercase tracking-wider text-zinc-500">{t.recommendedSetup}</p>
                            <div className="space-y-2">
                              {top.stats.map((statKey, slot) => {
                                const color = ROLE_COLORS[role][slot]
                                const multiplier = parseMultiplier(selectedMultipliers[role * 5 + slot])
                                return (
                                  <div key={`${statKey}-${slot}`} className="flex items-center justify-between gap-3 text-sm">
                                    <span className={`rounded-md border px-2 py-1 ${COLOR_CLASSES[color]}`}>{STAT_LABELS[statKey][languageIndex]}</span>
                                    <strong className="text-zinc-300">×{multiplier}</strong>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="mt-4 border-t border-white/10 pt-3 text-sm text-zinc-300">
                              <p><strong>{t.title}:</strong> {TITLES[top.title]?.[language]?.[0] || '—'}</p>
                              <p className="mt-1"><strong>{t.subtitle}:</strong> {SUBTITLES[top.subtitle]?.[language]?.[0] || '—'}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-zinc-500">
                            <span>{t.confidence}: <strong className="text-zinc-300">{confidenceForMatches(top.matches)}</strong></span>
                            <button onClick={() => applyRecommendation(role, top)} className="rounded-lg bg-violet-600 px-3 py-2 font-black text-white hover:bg-violet-500">{t.applySetup}</button>
                          </div>
                        </div>

                        <div className="border-t border-white/10 bg-black/20 p-5">
                          <h5 className="mb-3 text-sm font-black">{t.alternatives}</h5>
                          <ol className="space-y-2">
                            {recommendations.slice(1).map((item, index) => (
                              <li key={item.name} className="flex items-baseline text-sm">
                                <span className="min-w-0 truncate text-zinc-300">{index + 2}. {item.name}</span>
                                <span className="mx-2 min-w-4 flex-1 border-b border-dotted border-white/20" />
                                <strong className="shrink-0 text-violet-300">{formatNumber(item.score)}</strong>
                              </li>
                            ))}
                          </ol>
                        </div>
                      </>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {showHow && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-md" onMouseDown={() => setShowHow(false)}>
          <section className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <button onClick={() => setShowHow(false)} className="absolute right-4 top-4 rounded-lg bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10">{t.close}</button>
            <h2 className="pr-24 text-2xl font-black">{t.formula}</h2>
            <p className="mt-4 leading-7 text-zinc-300">{t.formulaText}</p>
            <div className="mt-5 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 font-mono text-sm leading-7 text-violet-100">
              score = Σ(avg stat × coefficient × entered multiplier)<br />
              final = score × (1 + title% + subtitle%)
            </div>
            <p className="mt-5 text-sm leading-6 text-zinc-400">{t.playerNote}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{t.globalNote}</p>
          </section>
        </div>
      )}
    </div>
  )
}

export default App

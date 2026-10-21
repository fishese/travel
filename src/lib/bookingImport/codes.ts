/** IATA airline designators the parser will accept without a nearby "flight"
 * keyword. Risky designators that are also ordinary words live in RISKY_AIRLINES
 * and still need that keyword when written with a space ("AT 10" is a time,
 * "AM123" is a flight). */
const AIRLINE_LIST = `
SQ CX NH JL UA AA DL BA LH AF KL EK QR QF NZ AC CA MU CZ HU FM ZH
KE OZ CI BR TG VN MH GA AI TK SK AY LX OS SN IB TP LO FI DY PC ET MS AZ
SA LA JJ G3 AD CM AV AR H2 JA VB Y4 QF WS PD FJ SB PX NF TN
AK FD QZ D7 XJ Z2 TR MI VJ BL UO HX HB NX GE PR 5J DG 6E SG IX QP
MM GK BC HD NU 7G 6J NQ FW OC JH IJ ZG 7C LJ TW BX ZE RS
B7 AE BI UL PG OD JT ID IQ SJ SL VN QH VU
EY WY GF SV FZ G9 RJ ME TU W3 KP HM MK
EW CL EN DE XC XQ SM A3 OU BT YM JU FB RO QS EI VS LS WK HV VY UX FR U2
W6 W4 W9 D8 WF S7 SU U6 DP PS B2
WN NK B6 F9 G4 HA SY YX OH 9E QX OO
JQ VA
AM AT OK AS UK IT TO OR BY US ON NO UP JR
3U 9C GS KN PN 8L EU SC G5 HO JD MF NS RY TV
`.split(/\s+/).filter(Boolean)

/** Designators that are also common English words or labels (ID, JR, AT…). */
export const RISKY_AIRLINES = new Set([
  'AM', 'AS', 'AT', 'BE', 'BY', 'GO', 'IN', 'IS', 'IT', 'MY', 'NO', 'OK', 'ON', 'OR',
  'SO', 'TO', 'UP', 'US', 'WE', 'AN', 'DO', 'IF', 'AI', 'UK', 'ID', 'JR',
])

export const AIRLINES = new Set(AIRLINE_LIST)

const AIRPORT_LIST = `
HND NRT NGO KIX ITM UKB CTS OKD AKJ KUH MMB HKD AOJ SDJ AXT GAJ FKS IBR
KIJ KMQ TOY FSZ NKM MMJ OKJ HIJ HIW UBJ TAK TKS MYJ KCZ FUK KKJ HSG OIT
KMJ NGS KMI KOJ OKA ISG MMY ASJ SHM TTJ YGJ IWJ OBO RIS KUH MMY SHI
HKG TPE TSA KHH RMQ ICN GMP PUS CJU TAE SIN KUL BKK DMK CGK DPS MNL CEB
SGN HAN DAD PNH REP VTE RGN BWN PEN LGK DEL BOM MAA CCU BLR HYD COK AMD
GOI CCU PEK PKX PVG SHA HGH CAN SZX XMN CTU CKG WUH XIY KMG TAO NKG CSX
DLC SHE FOC HAK SYX KWE NNG SWA
DXB AUH DOH DOH BAH KWI MCT RUH JED CAI AMM BEY TLV IST SAW ESB AYT ADB
LHR LGW LCY STN LTN MAN BHX EDI GLA BFS DUB ORK SNN CDG ORY AMS BRU FRA
MUC BER HAM DUS STR CGN ZRH GVA VIE BUD PRG WAW KRK CPH ARN OSL HEL TLL
RIX VNO ATH SKG LIS OPO MAD BCN PMI AGP VLC FAO FCO MXP LIN VCE NAP BLQ
ZAG BEG SOF OTP BUH KIV TBS EVN ALA
JFK EWR LGA BOS PHL IAD DCA BWI ATL MIA FLL MCO TPA CLT RDU DTW ORD MDW
MSP STL MCI DEN SLC PHX LAS LAX SAN SFO SJC OAK SEA PDX HNL OGG KOA LIH
ANC YYZ YVR YUL YYC YOW MEX CUN GDL SJO PTY BOG LIM SCL EZE GIG GRU
SYD MEL BNE PER ADL CBR AKL WLG CHC NAN PPT GUM SPN
SOQ HKT MDC LBJ AMQ BKI TWU PPS USU TAG DGT MLE ROR TKK YAP HRG RMF SSH
CNS KBV USM CZM BON GPS SCY RTB BZE LOP UPG WNI BPN KNG TRK KOE ARD MOF
NDA TTE PQC CXR CMB HIR VLI SEZ ZNZ MRU PNI KSA UIO GYE ENI
TYO NYC LON PAR OSA SEL CHI WAS BJS SHA MIL ROM SAO YTO
`.split(/\s+/).filter(Boolean)

export const AIRPORTS = new Set(AIRPORT_LIST)

/** Longer names first so 成田空港 wins over 成田 and 新千歳 wins over 千歳. */
export const AIRPORT_NAMES: [string, string][] = [
  ['成田空港', 'NRT'],
  ['羽田空港', 'HND'],
  ['関西国際', 'KIX'],
  ['関西空港', 'KIX'],
  ['中部国際', 'NGO'],
  ['新千歳', 'CTS'],
  ['香港国際', 'HKG'],
  ['仁川国際', 'ICN'],
  ['charles de gaulle', 'CDG'],
  ['chek lap kok', 'HKG'],
  ['san francisco', 'SFO'],
  ['los angeles', 'LAX'],
  ['new york', 'JFK'],
  ['hong kong', 'HKG'],
  ['singapore', 'SIN'],
  ['changi', 'SIN'],
  ['heathrow', 'LHR'],
  ['gatwick', 'LGW'],
  ['schiphol', 'AMS'],
  ['suvarnabhumi', 'BKK'],
  ['taoyuan', 'TPE'],
  ['incheon', 'ICN'],
  ['gimpo', 'GMP'],
  ['pudong', 'PVG'],
  ['haneda', 'HND'],
  ['narita', 'NRT'],
  ['kansai', 'KIX'],
  ['centrair', 'NGO'],
  ['chitose', 'CTS'],
  ['成田', 'NRT'],
  ['羽田', 'HND'],
  ['関西', 'KIX'],
  ['伊丹', 'ITM'],
  ['福岡', 'FUK'],
  ['那覇', 'OKA'],
  ['千歳', 'CTS'],
  ['小松', 'KMQ'],
  ['広島', 'HIJ'],
  ['仙台', 'SDJ'],
  ['鹿児島', 'KOJ'],
  ['熊本', 'KMJ'],
  ['長崎', 'NGS'],
  ['新潟', 'KIJ'],
  ['高松', 'TAK'],
  ['松山', 'MYJ'],
  ['大分', 'OIT'],
  ['宮崎', 'KMI'],
  ['神戸', 'UKB'],
  ['岡山', 'OKJ'],
  ['石垣', 'ISG'],
  ['宮古', 'MMY'],
  ['仁川', 'ICN'],
  ['金浦', 'GMP'],
  ['桃園', 'TPE'],
  ['中部', 'NGO'],
  ['香港', 'HKG'],
  ['チャンギ', 'SIN'],
  ['シンガポール', 'SIN'],
  ['バンコク', 'BKK'],
  // Dive gateways. Longer names are listed first so バリクパパン is not read
  // as バリ, and コサムイ is not read as サムイ. Okinawa and Palawan are not
  // mapped: those regions have more than one airport. Bare トラック is a truck,
  // so only チューク and トラック諸島 mean Chuuk. Galápagos as a place name is
  // Baltra (GPS); San Cristóbal stays SCY. Raja Ampat uses Sorong, Sipadan
  // uses Tawau, and Komodo uses Labuan Bajo.
  ['sharm el-sheikh', 'SSH'],
  ['sharm el sheikh', 'SSH'],
  ['シャルム・エル・シェイク', 'SSH'],
  ['シャルムエルシェイク', 'SSH'],
  ['puerto princesa', 'PPS'],
  ['プエルト・プリンセサ', 'PPS'],
  ['プエルトプリンセサ', 'PPS'],
  ['サン・クリストバル', 'SCY'],
  ['サンクリストバル', 'SCY'],
  ['san cristóbal', 'SCY'],
  ['san cristobal', 'SCY'],
  ['kota kinabalu', 'BKI'],
  ['コタ・キナバル', 'BKI'],
  ['コタキナバル', 'BKI'],
  ['labuan bajo', 'LBJ'],
  ['ラブアン・バジョ', 'LBJ'],
  ['ラブアンバジョ', 'LBJ'],
  ['raja ampat', 'SOQ'],
  ['raja-ampat', 'SOQ'],
  ['ラジャ・アンパット', 'SOQ'],
  ['ラジャアンパット', 'SOQ'],
  ['soekarno-hatta', 'CGK'],
  ['soekarno hatta', 'CGK'],
  ['スカルノ・ハッタ', 'CGK'],
  ['スカルノハッタ', 'CGK'],
  ['banda neira', 'NDA'],
  ['バンダネイラ', 'NDA'],
  ['marsa alam', 'RMF'],
  ['マルサ・アラム', 'RMF'],
  ['マルサアラム', 'RMF'],
  ['ujung pandang', 'UPG'],
  ['ウジュンパンダン', 'UPG'],
  ['port vila', 'VLI'],
  ['ポート・ビラ', 'VLI'],
  ['ポートビラ', 'VLI'],
  ['phu quoc', 'PQC'],
  ['phú quốc', 'PQC'],
  ['フーコック', 'PQC'],
  ['nha trang', 'CXR'],
  ['ニャチャン', 'CXR'],
  ['cam ranh', 'CXR'],
  ['カムラン', 'CXR'],
  ['triton bay', 'KNG'],
  ['トリトンベイ', 'KNG'],
  ['el nido', 'ENI'],
  ['エル・ニド', 'ENI'],
  ['エルニド', 'ENI'],
  ['koh samui', 'USM'],
  ['ko samui', 'USM'],
  ['コサムイ', 'USM'],
  ['balikpapan', 'BPN'],
  ['バリクパパン', 'BPN'],
  ['tagbilaran', 'TAG'],
  ['タグビララン', 'TAG'],
  ['dumaguete', 'DGT'],
  ['ドゥマゲテ', 'DGT'],
  ['hurghada', 'HRG'],
  ['フルガダ', 'HRG'],
  ['guayaquil', 'GYE'],
  ['グアヤキル', 'GYE'],
  ['zanzibar', 'ZNZ'],
  ['ザンジバル', 'ZNZ'],
  ['mauritius', 'MRU'],
  ['モーリシャス', 'MRU'],
  ['seychelles', 'SEZ'],
  ['セイシェル', 'SEZ'],
  ['langkawi', 'LGK'],
  ['ランカウイ', 'LGK'],
  ['makassar', 'UPG'],
  ['マカッサル', 'UPG'],
  ['wakatobi', 'WNI'],
  ['ワカトビ', 'WNI'],
  ['kaimana', 'KNG'],
  ['カイマナ', 'KNG'],
  ['maumere', 'MOF'],
  ['マウメレ', 'MOF'],
  ['cozumel', 'CZM'],
  ['コスメル', 'CZM'],
  ['bonaire', 'BON'],
  ['ボネール', 'BON'],
  ['galápagos', 'GPS'],
  ['galapagos', 'GPS'],
  ['ガラパゴス', 'GPS'],
  ['maldives', 'MLE'],
  ['モルディブ', 'MLE'],
  ['denpasar', 'DPS'],
  ['デンパサール', 'DPS'],
  ['jakarta', 'CGK'],
  ['ジャカルタ', 'CGK'],
  ['manado', 'MDC'],
  ['マナド', 'MDC'],
  ['sam ratulangi', 'MDC'],
  ['サムラトゥランギ', 'MDC'],
  ['sorong', 'SOQ'],
  ['ソロン', 'SOQ'],
  ['phuket', 'HKT'],
  ['プーケット', 'HKT'],
  ['panglao', 'TAG'],
  ['パングラオ', 'TAG'],
  ['busuanga', 'USU'],
  ['ブサンガ', 'USU'],
  ['ishigaki', 'ISG'],
  ['painushima', 'ISG'],
  ['新石垣空港', 'ISG'],
  ['新石垣', 'ISG'],
  ['colombo', 'CMB'],
  ['コロンボ', 'CMB'],
  ['honiara', 'HIR'],
  ['ホニアラ', 'HIR'],
  ['lombok', 'LOP'],
  ['ロンボク', 'LOP'],
  ['pohnpei', 'PNI'],
  ['ponape', 'PNI'],
  ['ポナペ', 'PNI'],
  ['ternate', 'TTE'],
  ['テルナテ', 'TTE'],
  ['tarakan', 'TRK'],
  ['タラカン', 'TRK'],
  ['cairns', 'CNS'],
  ['ケアンズ', 'CNS'],
  ['cancún', 'CUN'],
  ['cancun', 'CUN'],
  ['カンクン', 'CUN'],
  ['roatan', 'RTB'],
  ['roatán', 'RTB'],
  ['ロアタン', 'RTB'],
  ['belize', 'BZE'],
  ['ベリーズ', 'BZE'],
  ['saipan', 'SPN'],
  ['サイパン', 'SPN'],
  ['koror', 'ROR'],
  ['コロール', 'ROR'],
  ['palau', 'ROR'],
  ['パラオ', 'ROR'],
  ['bohol', 'TAG'],
  ['ボホール', 'TAG'],
  ['sipadan', 'TWU'],
  ['シパダン', 'TWU'],
  ['tawau', 'TWU'],
  ['タワウ', 'TWU'],
  ['ambon', 'AMQ'],
  ['アンボン', 'AMQ'],
  ['komodo', 'LBJ'],
  ['コモド', 'LBJ'],
  ['samui', 'USM'],
  ['サムイ', 'USM'],
  ['krabi', 'KBV'],
  ['クラビ', 'KBV'],
  ['malé', 'MLE'],
  ['マレ', 'MLE'],
  ['chuuk', 'TKK'],
  ['チューク', 'TKK'],
  ['トラック諸島', 'TKK'],
  ['truk', 'TKK'],
  ['nadi', 'NAN'],
  ['ナンディ', 'NAN'],
  ['cebu', 'CEB'],
  ['セブ', 'CEB'],
  ['mactan', 'CEB'],
  ['マクタン', 'CEB'],
  ['guam', 'GUM'],
  ['グアム', 'GUM'],
  ['bali', 'DPS'],
  ['バリ', 'DPS'],
  ['naha', 'OKA'],
  ['miyako', 'MMY'],
  ['yap', 'YAP'],
  ['ヤップ', 'YAP'],
  ['coron', 'USU'],
  ['コロン', 'USU'],
  ['sharm', 'SSH'],
  ['シャルム', 'SSH'],
  ['baltra', 'GPS'],
  ['バルトラ', 'GPS'],
  ['quito', 'UIO'],
  ['キト', 'UIO'],
  ['alor', 'ARD'],
  ['アロール', 'ARD'],
  ['kosrae', 'KSA'],
  ['コスラエ', 'KSA'],
  ['kupang', 'KOE'],
  ['クパン', 'KOE'],
  ['manila', 'MNL'],
  ['マニラ', 'MNL'],
  ['bangkok', 'BKK'],
]

export const CITY_NAMES = [
  'San Francisco',
  'Los Angeles',
  'New York',
  'Hong Kong',
  'Singapore',
  'Kuala Lumpur',
  'Ho Chi Minh',
  'Washington',
  'Barcelona',
  'Amsterdam',
  'Stockholm',
  'Melbourne',
  'Vancouver',
  'Shanghai',
  'Beijing',
  'Bangkok',
  'Taipei',
  'Seoul',
  'Tokyo',
  'Osaka',
  'Kyoto',
  'Nagoya',
  'Fukuoka',
  'Sapporo',
  'Hiroshima',
  'Kanazawa',
  'Yokohama',
  'Hakone',
  'Okinawa',
  'Naha',
  'Kobe',
  'Nara',
  'London',
  'Paris',
  'Sydney',
  'Berlin',
  'Munich',
  'Rome',
  'Milan',
  'Lisbon',
  'Madrid',
  'Dubai',
  'Taipei',
  'Busan',
  'Hanoi',
  'Manila',
  'Jakarta',
  'Denpasar',
  'Honolulu',
  'Cebu',
  'Sorong',
  'Raja Ampat',
  'Phuket',
  'Manado',
  'Labuan Bajo',
  'Komodo',
  'Bali',
  'Ambon',
  'Kota Kinabalu',
  'Tawau',
  'Sipadan',
  'Puerto Princesa',
  'El Nido',
  'Coron',
  'Busuanga',
  'Tagbilaran',
  'Bohol',
  'Panglao',
  'Dumaguete',
  'Malé',
  'Maldives',
  'Koror',
  'Palau',
  'Guam',
  'Saipan',
  'Chuuk',
  'Yap',
  'Hurghada',
  'Marsa Alam',
  'Sharm el-Sheikh',
  'Cairns',
  'Nadi',
  'Ishigaki',
  'Miyako',
  'Krabi',
  'Koh Samui',
  'Langkawi',
  'Cozumel',
  'Cancun',
  'Cancún',
  'Bonaire',
  'Galapagos',
  'Galápagos',
  'San Cristobal',
  'Roatan',
  'Roatán',
  'Belize',
  'Lombok',
  'Makassar',
  'Wakatobi',
  'Balikpapan',
  'Kaimana',
  'Triton Bay',
  'Phu Quoc',
  'Nha Trang',
  'Colombo',
  'Honiara',
  'Port Vila',
  'Seychelles',
  'Zanzibar',
  'Mauritius',
  'Pohnpei',
  'Kosrae',
  'Kupang',
  'Alor',
  'Maumere',
  'Banda Neira',
  'Ternate',
  'Tarakan',
  'Quito',
  'Guayaquil',
]

export function cityFromJapaneseAddress(address: string): string {
  const pref = address.match(/(北海道|東京都|京都府|大阪府|.+?県)/)
  const rest = pref ? address.slice((pref.index ?? 0) + pref[0].length) : address
  const town = rest.match(/([^\d\s郡]{1,8}[町村])/)
  if (town) return town[1]
  const city = rest.match(/([^\d\s]{1,8}市)/)
  if (city) return city[1]
  const ward = rest.match(/([^\d\s]{1,8}区)/)
  return ward?.[1] ?? ''
}

export interface CodeHit {
  code: string
  index: number
  fromName: boolean
}

export function findNamedAirports(text: string): CodeHit[] {
  const hits: CodeHit[] = []
  const lower = text.toLowerCase()
  let i = 0
  const names = [...AIRPORT_NAMES].sort((a, b) => b[0].length - a[0].length)
  while (i < text.length) {
    let matched = false
    for (const [name, code] of names) {
      const hay = lower.slice(i, i + name.length)
      if (hay === name.toLowerCase()) {
        const before = i > 0 ? lower[i - 1] : ''
        const after = lower[i + name.length] ?? ''
        const ascii = /^[a-z]/.test(name)
        if (ascii && /[a-z]/i.test(before)) break
        if (ascii && /[a-z]/i.test(after)) break
        hits.push({ code, index: i, fromName: true })
        i += name.length
        matched = true
        break
      }
    }
    if (!matched) i++
  }
  return hits
}

export function findAirportCodes(text: string): CodeHit[] {
  const hits: CodeHit[] = []
  for (const match of text.matchAll(/\(([A-Z]{3})\)/g)) {
    if (AIRPORTS.has(match[1])) hits.push({ code: match[1], index: match.index, fromName: false })
  }
  for (const match of text.matchAll(/\b([A-Z]{3})\b[^\n]{0,24}(?:→|->|⇒|—|–)\s*([A-Z]{3})\b/g)) {
    if (AIRPORTS.has(match[1]) && AIRPORTS.has(match[2])) {
      hits.push({ code: match[1], index: match.index, fromName: false })
      hits.push({ code: match[2], index: match.index + match[0].lastIndexOf(match[2]), fromName: false })
    }
  }
  for (const match of text.matchAll(/\b([A-Z]{3})\s*(?:→|->|⇒|—|–|-|\/|to)\s*([A-Z]{3})\b/gi)) {
    const a = match[1].toUpperCase()
    const b = match[2].toUpperCase()
    if (AIRPORTS.has(a) && AIRPORTS.has(b)) {
      hits.push({ code: a, index: match.index, fromName: false })
      hits.push({ code: b, index: match.index + match[0].length - b.length, fromName: false })
    }
  }
  hits.push(...findNamedAirports(text))
  return mergeCodeHits(hits)
}

function mergeCodeHits(hits: CodeHit[]): CodeHit[] {
  const sorted = [...hits].sort((a, b) => a.index - b.index)
  const byCode = new Map<string, CodeHit>()
  for (const hit of sorted) {
    const prev = byCode.get(hit.code)
    if (!prev) byCode.set(hit.code, hit)
    else if (prev.fromName && !hit.fromName) byCode.set(hit.code, { ...prev, fromName: false })
  }
  return [...byCode.values()].sort((a, b) => a.index - b.index)
}

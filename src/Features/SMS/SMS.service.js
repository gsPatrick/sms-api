/**
 * Serviço de SMS
 * 
 * Contém a lógica de negócio para gerenciamento de SMS.
 * Neste modelo, os países e serviços são buscados dinamicamente da API externa.
 */

const { SmsMessage, ActiveNumber, User, Setting } = require('../../models');
const smsActiveAPI = require('../../Utils/smsActive');
const CreditsService = require('../Credits/Credits.service');
const { Op, fn, col, literal } = require('sequelize');

// =========================================================================
// ✅ MAPEAMENTO COMPLETO DE PAÍSES E SERVIÇOS USANDO SEUS DADOS
// Estes mapas garantem que os nomes exibidos para o usuário sejam sempre corretos.
// =========================================================================
const countryNamesMap = {
  "0": "Russia", "1": "Ukraine", "2": "Kazakhstan", "3": "China", "4": "Philippines",
  "5": "Myanmar", "6": "Indonesia", "7": "Malaysia", "8": "Kenya", "9": "Tanzania",
  "10": "Vietnam", "11": "Kyrgyzstan", "13": "Israel", "14": "Hong Kong", "15": "Poland",
  "16": "United Kingdom", "17": "Madagascar", "18": "DR Congo", "19": "Nigeria", "20": "Macao",
  "21": "Egypt", "22": "India", "23": "Ireland", "24": "Cambodia", "25": "Laos",
  "26": "Haiti", "27": "Ivory Coast", "28": "Gambia", "29": "Serbia", "30": "Yemen",
  "31": "South Africa", "32": "Romania", "33": "Colombia", "34": "Estonia", "35": "Azerbaijan",
  "36": "Canada", "37": "Morocco", "38": "Ghana", "39": "Argentina", "40": "Uzbekistan",
  "41": "Cameroon", "42": "Chad", "43": "Germany", "44": "Lithuania", "45": "Croatia",
  "46": "Sweden", "47": "Iraq", "48": "Netherlands", "49": "Latvia", "50": "Austria",
  "51": "Belarus", "52": "Thailand", "53": "Saudi Arabia", "54": "Mexico", "55": "Taiwan",
  "56": "Spain", "57": "Iran", "58": "Algeria", "59": "Slovenia", "60": "Bangladesh",
  "61": "Senegal", "62": "Turkey", "63": "Czech", "64": "Sri Lanka", "65": "Peru",
  "66": "Pakistan", "67": "New Zealand", "68": "Guinea", "69": "Mali", "70": "Venezuela",
  "71": "Ethiopia", "72": "Mongolia", "73": "Brazil", "74": "Afghanistan", "75": "Uganda",
  "76": "Angola", "77": "Cyprus", "78": "France", "79": "Papua", "80": "Mozambique",
  "81": "Nepal", "82": "Belgium", "83": "Bulgaria", "84": "Hungary", "85": "Moldova",
  "86": "Italy", "87": "Paraguay", "88": "Honduras", "89": "Tunisia", "90": "Nicaragua",
  "91": "Timor-Leste", "92": "Bolivia", "93": "Costa Rica", "94": "Guatemala", "95": "UAE",
  "96": "Zimbabwe", "97": "Puerto Rico", "98": "Sudan", "99": "Togo", "100": "Kuwait",
  "101": "Salvador", "102": "Libya", "103": "Jamaica", "104": "Trinidad and Tobago", "105": "Ecuador",
  "106": "Swaziland", "107": "Oman", "108": "Bosnia", "109": "Dominican Republic", "110": "Syria",
  "111": "Qatar", "112": "Panama", "113": "Cuba", "114": "Mauritania", "115": "Sierra Leone",
  "116": "Jordan", "117": "Portugal", "118": "Barbados", "119": "Burundi", "120": "Benin",
  "121": "Brunei", "122": "Bahamas", "123": "Botswana", "124": "Belize", "125": "Central African Republic",
  "126": "Dominica", "127": "Grenada", "128": "Georgia", "129": "Greece", "130": "Guinea-Bissau",
  "131": "Guyana", "132": "Iceland", "133": "Comoros", "134": "Saint Kitts and Nevis", "135": "Liberia",
  "136": "Lesotho", "137": "Malawi", "138": "Namibia", "139": "Niger", "140": "Rwanda",
  "141": "Slovakia", "142": "Suriname", "143": "Tajikistan", "144": "Monaco", "145": "Bahrain",
  "146": "Reunion", "147": "Zambia", "148": "Armenia", "149": "Somalia", "150": "Congo",
  "151": "Chile", "152": "Burkina Faso", "153": "Lebanon", "154": "Gabon", "155": "Albania",
  "156": "Uruguay", "157": "Mauritius", "158": "Bhutan", "159": "Maldives", "160": "Guadeloupe",
  "161": "Turkmenistan", "162": "French Guiana", "163": "Finland", "164": "Saint Lucia", "165": "Luxembourg",
  "166": "Saint Vincent and the Grenadines", "167": "Equatorial Guinea", "168": "Djibouti", "169": "Antigua and Barbuda",
  "170": "Cayman Islands", "171": "Montenegro", "172": "Denmark", "173": "Switzerland", "174": "Norway",
  "175": "Australia", "176": "Eritrea", "177": "South Sudan", "178": "Sao Tome and Principe", "179": "Aruba",
  "180": "Montserrat", "181": "Anguilla", "182": "Japan", "183": "North Macedonia", "184": "Seychelles",
  "185": "New Caledonia", "186": "Cape Verde", "187": "USA", "188": "Palestine", "189": "Fiji",
  "196": "Singapore", "199": "Malta", "201": "Gibraltar", "203": "Kosovo", "204": "Niue"
};

const serviceNamesMap = {
  "ig": "Instagram+Threads", "go": "Google,youtube,Gmail", "fb": "facebook", "wa": "Whatsapp",
  "tg": "Telegram", "am": "Amazon", "mm": "Microsoft", "hw": "Alipay/Alibaba/1688", "ds": "Discord",
  "yw": "Grindr", "oi": "Tinder", "vi": "Viber", "mb": "Yahoo", "lf": "TikTok/Douyin",
  "tw": "Twitter", "wb": "WeChat", "ni": "Gojek", "ka": "Shopee", "fk": "BLIBLI",
  "ew": "Nike", "ot": "Any other", "vk": "vk.com", "abu": "BPJSTK", "nv": "Naver",
  "li": "Baidu", "jg": "Grab", "ev": "Picpay ", "bdp": "Kredito", "ub": "Uber",
  "sg": "OZON", "ue": "Onet", "vz": "Hinge", "xh": "OVO", "jr": "Samokat", "bw": "Signal",
  "nz": "Foodpanda", "da": "MTS CashBack", "ts": "PayPal", "uu": "Wildberries", "wx": "Apple",
  "ju": "Indomaret", "bnu": "Qpon", "tn": "LinkedIN", "pm": "AOL", "fr": "Dana",
  "abk": "GMX", "atu": "Sber/Cooper", "mg": "Magnit", "me": "Line messenger", "ok": "ok.ru",
  "qf": "RedBook", "acz": "Claude ", "bny": "Suno", "aez": "Shein", "ya": "Yandex/Uber",
  "bab": "Opera Mini", "dl": "Lazada", "ki": "99app", "cn": "Fiverr", "xm": "Letual",
  "qj": "Whoosh", "pf": "pof.com", "pc": "Casino/bet/gambling", "blz": "MiniPay", "vr": "MotorkuX",
  "bme": "myIM3", "dh": "eBay", "sn": "OLX", "xd": "Tokopedia", "bd": "X5ID", "nc": "Payoneer",
  "nf": "Netflix", "kc": "Vinted", "asy": "Fore Coffee", "aem": "AstraPay", "gp": "Ticketmaster",
  "aaa": "Nubank", "ve": "Dream11", "rr": "Wolt", "bnl": "Reddit", "ua": "BlaBlaCar",
  "fd": "Mamba", "qq": "Tencent QQ", "ada": "TRUTH SOCIAL", "kf": "Weibo", "aik": "ZUS Coffee",
  "yl": "Yalla", "awv": "Wallapop", "bxc": "DRIVE2", "tm": "Akulaku", "ep": "Temu", "im": "Imo",
  "bz": "Blizzard", "do": "Leboncoin", "aor": "OKX", "zk": "Deliveroo", "tl": "Truecaller",
  "agj": "Marktplaats", "aoy": "PLN Mobile", "bdg": "HUD", "bwe": "Immutable Play", "abn": "Bybit",
  "aug": "Magnit Market", "cq": "Mercado", "mo": "Bumble", "bcx": "Bantusaku", "gf": "GoogleVoice",
  "fv": "Vidio", "afo": "KION ", "mi": "Zupee", "bit": "Домклик", "ha": "My11Circle",
  "aka": "LinkAja", "za": "JDcom", "ws": "Feeld", "bhb": "Wuling", "xk": "DiDi", "ahl": "Maxim",
  "aiw": "Roblox", "kv": "Rush", "tx": "Bolt", "fu": "Snapchat", "wr": "Walmart", "pd": "IFood",
  "wh": "TanTan", "bex": "Whatnot", "ly": "Olacabs", "aql": "Xigua Video 西瓜视频", "sy": "Brahma",
  "ft": "Bookmakers", "agl": "Betano", "ir": "Chispa", "adw": "Profi", "afd": "Astra Otoshop",
  "azd": "Вплюсе", "avb": "Tealive", "bwv": "Manus", "ac": "DoorDash", "afz": "Klarna",
  "yx": "JTExpress", "vm": "OkCupid", "acm": "Razer", "hx": "AliExpress", "aff": "C6 Bank",
  "aq": "Glovo", "st": "Auchan", "awu": "MosGram", "kt": "KakaoTalk", "aqt": "Skrill",
  "xs": "GroupMe", "agm": "CMB", "bn": "Alfagift", "fz": "KFC", "agb": "Smiles",
  "dp": "ProtonMail", "asb": "YUEWEN 阅文集团", "cp": "Uklon", "mt": "Steam", "df": "Happn",
  "aqj": "BigBasket", "aup": "Botim", "atl": "Watsons MY", "bcq": "Mantan", "ajj": "Rebtel",
  "ma": "Mail.ru", "rl": "inDriver", "bwy": "Монетка", "acu": "CityMall", "gq": "Freelancer",
  "bls": "WeTV", "alp": "Mera Gaon", "rs": "Lotus", "aow": "Geekay", "bl": "BIGO LIVE",
  "als": "Greggs ", "ban": "BLINK by BonusLink", "agg": "OneForma", "qv": "Badoo",
  "uk": "Airbnb", "ajv": "ShareParty", "ahx": "Bitrue", "afm": "myboost", "lj": "Santander",
  "aha": "Angel One", "ahb": "Ubisoft", "bob": "Shell GO", "asf": "TextFree", "rd": "Lenta",
  "bvi": "Salams", "apq": "WePoker", "dj": "LUKOIL-AZS", "rj": "Detskiy mir", "re": "Coinbase",
  "bkd": "Sahibinden", "bo": "Wise", "aba": "Rappi", "lc": "Subito", "adc": "PlayOJO",
  "cw": "PaddyPower", "agd": "Grailed", "afu": "VseInstrumenty", "aeu": "TheFork", "kl": "kolesa.kz",
  "awq": "Atlas Earth", "aex": "Neon", "ij": "Revolut", "qh": "Oriflame", "bau": "FieldStar",
  "bsv": "AmarthaFin", "api": "KKTIX", "ff": "AVON", "btp": "Связь ON", "blm": "Epic Games ",
  "acr": "QwikCilver", "btr": "Duet", "bgt": "Alfamidi", "ajq": "MyValue", "ani": "Talabat",
  "co": "Rediffmail", "ama": "WooPlus", "acd": "Cloud.ru", "hz": "Drom", "vs": "WinzoGame",
  "bon": "RetailMeNot", "abg": "PagBank", "hb": "Twitch", "aje": "CupidMedia", "zs": "Bilibili",
  "zl": "Airtel", "auc": "TotalPass", "zm": "OfferUp", "bc": "GCash", "uz": "OffGamers",
  "aoh": "YooMoney", "aqm": "Tala", "ls": "Careem", "uf": "Eneba", "blp": "MEEFF",
  "axx": "Shopback", "bhl": "ati su", "et": "Clubhouse", "amz": "ImmoScout24", "btn": "Itau",
  "wd": "Столото", "ahc": "START", "awg": "Natura Avon", "amb": "Vercel", "apd": "2dehands",
  "awz": "PlayTime", "akp": "Her", "pu": "Justdating", "anx": "InfinitePay", "ber": "Gumtree",
  "mx": "SoulApp", "ano": "Shopify", "afn": "roomster", "nl": "Myntra", "ee": "Twilio",
  "vg": "ShellBox", "bwx": "Chagee", "cy": "PSA", "sb": "Lamoda", "kk": "Idealista",
  "btx": "Amap 高德地图", "adi": "Zepto", "blt": "INDOPAKET", "ti": "cryptocom", "yk": "SportMaster",
  "ie": "bet365", "ta": "Wink", "tu": "Lyft", "aox": "Aukro", "anm": "CaltexGO",
  "bre": "Лемана ПРО", "cb": "Bazos", "bnd": "КуулКлевер", "bfv": "Chocofamily", "te": "eFood",
  "vd": "Betfair", "yy": "Venmo", "yq": "mail.com", "tz": "Leyka", "auh": "KeeTa 美团",
  "abq": "Upwork", "adt": "willhaben", "amy": "Otzovik", "bou": "汇旺 Huione Pay", "sz": "Pivko24",
  "xx": "Joyride", "akd": " Feels", "ayc": "HungerStation", "nq": "Trip", "bhr": "Dil Mil",
  "zy": "Nttgame", "avj": "SumUp ", "alg": "Ankama", "em": "ZéDelivery", "abl": "gpnbonus",
  "avk": "Quoka ", "aiz": "Brevo", "aws": "7-Eleven", "app": "ClassPass", "rn": "neftm",
  "bii": "MEXC", "apg": "Damai", "aok": "NETELLER", "bxw": "Credinex", "zb": "FreeNow",
  "arp": "Continente", "jq": "Paysafecard", "sd": "dodopizza", "qx": "WorldRemit", "we": "DrugVokrug",
  "mj": "Zalo", "bej": "KERETAKU ", "afs": "Privalia", "ajy": "All Access", "arf": "Enjoei",
  "beo": "BigPay", "ex": "Linode", "of": "urent/jet/RuSharing", "bsj": "Pagaleve", "baq": "Redbubble",
  "ang": "TOMORO COFFEE", "xt": "Flipkart", "bcg": "2ГИС", "ais": "DiDiFood", "avy": "BV",
  "bni": "Pets4Homes", "axp": "ChargePoint", "blr": "DocuSign", "alo": "Profee", "es": "iQIYI",
  "aua": "同程旅行 Tongcheng Travel", "ov": "Beget", "hc": "MOMO", "axr": "Match", "bgi": "SuperLive",
  "fw": "99acres", "gr": "Astropay", "ahr": "This Fate", "akc": "Paybis", "wu": "PrivetMir",
  "alb": "Guiche Web", "bgy": "Astro", "ms": "NovaPoshta", "ael": "Cloud Manager", "ank": "Garena",
  "abc": "Taptap Send", "beh": "LUUP", "ahv": "Curve", "hp": "Meesho", "apl": "Sideline",
  "bwa": "Hostinger", "gi": "Hotline", "rk": "Fotka", "bui": "OKbet", "lm": "FarPost",
  "bgn": "Veeka", "gt": "Gett", "ng": "FunPay", "sr": "Starbucks", "gj": "Carousell",
  "xr": "Tango", "aon": "Binance", "bfd": "Kalodata ", "fh": "Lalamove", "ns": "Oldubil",
  "alt": "Segari", "akj": "Easycash", "axn": "FastMoss", "brr": "LemFi", "blc": "Дикси",
  "dg": "Mercari", "sh": "Vkusvill", "zh": "Zoho", "bwu": "SkyBet", "ajb": "Beri zaryad",
  "abo": "WEBDE", "asp": "PhonePe", "yh": "hh", "biy": "TaDa", "acw": "YouDo",
  "btv": "Radiate", "jc": "IVI", "axb": "TrueID", "bsl": "Oskelly", "bxj": "Quero-Quero PAG",
  "ait": "FeetFinder", "brl": "Paperspace", "btl": "D4", "bvy": "Waje", "abh": "UOL Host",
  "bbu": "InternationalCupid", "wc": "Craigslist", "acb": "Spark Driver", "aej": "Autoru", "apb": "eToro",
  "bcy": "Finplus", "tr": "Paysend", "blh": "Winner", "aag": "Pockit", "aub": "Smitten",
  "bdo": "AdaModal", "bmd": "VooV Meeting", "bpf": "Fix Price", "brm": "Locanto", "ef": "Nextdoor",
  "ip": "Burger King", "aol": "Paysera", "bkx": "Mi Gente", "bja": "QuackQuack Dating App", "bra": "Touch n Go TNG",
  "bbk": "FilipinoCupid", "brv": "999 md", "bfr": "Dott", "adj": "RummyCircle", "bsf": "Rupiah Cepat",
  "ako": "Ryde", "anl": "AttaPoll", "dt": "Delivery Club", "ash": "Pinjam Yuk", "rt": "hily",
  "vy": "Meta", "bss": "Trade Republic", "bv": "Metro", "ke": "Eldorado", "anw": "Premmia",
  "brq": "Фармленд", "mv": "Fruitz", "adp": "Cabify", "azi": "TheL", "buj": "ASVLA",
  "qe": "GG", "agk": "Ipsos iSay", "blx": "2ememain", "bow": "Affirm", "ko": "AdaKami",
  "zg": "Setel", "abe": "Foodora", "awr": "KCEX", "bwt": "Stanleybet", "gx": "Hepsiburadacom",
  "nh": "AlloBank", "ane": "Supercell", "bxs": "LikeCard", "ht": "Bitso", "un": "humblebundle",
  "aat": "TamTam", "alj": "Spotify", "apo": "Netmarble", "auf": "PREMIER", "bpt": "SerpApi ",
  "bih": "Indosaku", "jv": "Consultant", "akr": "Voi", "avx": "Zazzle", "brg": "Letgo",
  "ayx": "C24 Bank ", "aeg": "Flowwow", "aoz": "ReclameAQUI", "acv": "A23", "bmm": "Hey Cash",
  "bwi": "CIMB", "zp": "Pinduoduo", "bqo": " Caffe Nero", "bp": "GoFundMe", "brk": "Indeed",
  "bvu": "SwaRail ", "bbq": "Chime", "bku": "NL International", "pw": "SellMonitor", "aeh": "Apteka Aprel",
  "bxv": "PAPER", "aaz": "Ozan", "afc": "Bunda", "ajc": "Pochta Rossii", "ao": "UU163"
};

class SMSService {

  /**
   * Obtém a lista de países disponíveis da API SMS Active, usando nosso mapeamento de nomes.
   * @returns {Promise<Array>} - Lista de países formatada e ordenada.
   */
  async getAvailableCountries() {
    try {
      const countriesFromApi = await smsActiveAPI.getCountries();
      
      const formattedCountries = Object.keys(countriesFromApi)
        .filter(id => countryNamesMap[id]) // Garante que só incluímos países que temos nome
        .map(id => ({
            id: id,
            name: countryNamesMap[id], 
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return formattedCountries;
    } catch (error) {
      console.error('Erro ao buscar países da API externa:', error);
      throw new Error('Não foi possível obter a lista de países.');
    }
  }

  /**
   * Obtém a lista de serviços com preços para um país específico.
   * @param {string} countryId - O ID do país.
   * @returns {Promise<Array>} - Lista de serviços com preço e quantidade.
   */
  async getServicesByCountry(countryId) {
    try {
      const pricesFromApi = await smsActiveAPI.getPrices(countryId);

      if (!pricesFromApi[countryId]) {
        return [];
      }

      const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
      const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;

      const formattedServices = Object.entries(pricesFromApi[countryId])
        .filter(([_, details]) => details.price !== null && !isNaN(details.price))
        .map(([serviceCode, details]) => {
            const cost = parseFloat(details.price);
            const sellPrice = cost * margin;

            return {
                code: serviceCode,
                name: serviceNamesMap[serviceCode] || serviceCode, // Usa o mapa de nomes, ou o código como fallback
                cost: cost,
                sellPrice: sellPrice.toFixed(2),
                count: details.count,
            };
        });

      return formattedServices;
    } catch (error) {
      console.error(`Erro ao buscar serviços para o país ${countryId}:`, error);
      throw new Error(`Não foi possível obter os serviços para o país selecionado.`);
    }
  }
  
  /**
   * Obtém estatísticas de uso de SMS para o usuário.
   * @param {string} userId - ID do usuário.
   * @param {string} period - 'daily' ou 'monthly'.
   * @param {number} days - Número de dias para o período.
   * @returns {Promise<Array>} - Dados estatísticos.
   */
  async getSmsUsageStats(userId, period = 'daily', days = 30) {
    let groupByFormat;
    let startDate = new Date();

    if (period === 'daily') {
      groupByFormat = "TO_CHAR(\"created_at\", 'DD/MM')";
      startDate.setDate(startDate.getDate() - days);
    } else if (period === 'monthly') {
      groupByFormat = "TO_CHAR(\"created_at\", 'MM/YYYY')";
      startDate.setMonth(startDate.getMonth() - 6);
      startDate.setDate(1);
    } else {
      throw new Error('Período inválido. Use "daily" ou "monthly".');
    }

    const whereClause = {
      user_id: userId,
      created_at: { [Op.gte]: startDate },
    };

    const stats = await SmsMessage.findAll({
      attributes: [
        [literal(groupByFormat), 'date'],
        [fn('COUNT', col('id')), 'total_sms'],
        [fn('SUM', literal("CASE WHEN status = 'received' THEN 1 ELSE 0 END")), 'delivered_sms'],
        [fn('SUM', literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'failed_sms'],
      ],
      where: whereClause,
      group: [literal(groupByFormat)],
      order: [literal(groupByFormat)],
      raw: true,
    });
    
    return stats.map(item => ({
      date: item.date,
      total_sms: parseInt(item.total_sms || 0),
      delivered_sms: parseInt(item.delivered_sms || 0),
      failed_sms: parseInt(item.failed_sms || 0),
    }));
  }

  /**
   * Solicita um número para recebimento de SMS OTP
   * @param {string} userId - ID do usuário
   * @param {Object} requestData - Dados da solicitação { service_code, country_code }
   * @returns {Object} - Número ativo criado
   */
  async requestNumber(userId, requestData) {
    const { service_code, country_code, operator = '' } = requestData;
    if (!service_code || country_code === undefined) { throw new Error("Código do serviço e do país são obrigatórios."); }
    
    const sellPrice = await this.getSellPrice(country_code, service_code);

    const user = await User.findByPk(userId);
    if (!user) throw new Error('Usuário não encontrado');
    if (parseFloat(user.credits) < sellPrice) { throw new Error('Créditos insuficientes para realizar esta operação.'); }

    try {
      const numberData = await smsActiveAPI.getNumber(service_code, country_code, operator);
      const costPrice = await this.getCostPrice(country_code, service_code);

      await CreditsService.debitCredits(userId, sellPrice, {
        type: 'sms_received',
        description: `Ativação para ${serviceNamesMap[service_code] || service_code} (${countryNamesMap[country_code] || 'País ' + country_code})`,
        metadata: { service_code, country_code, api_activation_id: numberData.id, phone_number: numberData.number, cost_price: costPrice, sell_price: sellPrice }
      });

      const activeNumber = await ActiveNumber.create({
        user_id: userId,
        sms_service_id: null,
        phone_number: numberData.number,
        api_activation_id: numberData.id,
        country_code,
        operator,
        cost: sellPrice,
        status: 'active',
        metadata: { service_code, requested_at: new Date() }
      });

      await SmsMessage.create({
        user_id: userId, type: 'received', to_number: numberData.number,
        status: 'pending', api_message_id: numberData.id, cost: sellPrice, service_code,
        metadata: { active_number_id: activeNumber.id }
      });

      setTimeout(() => this.checkAndCancelIfNoMessage(activeNumber.id), 2 * 60 * 1000);

      return { active_number: activeNumber };

    } catch (error) {
      throw new Error(`Erro ao solicitar número: ${error.message}`);
    }
  }

  /**
   * Helper para buscar e calcular o preço de venda de um serviço.
   * @param {string} countryCode - Código do país
   * @param {string} serviceCode - Código do serviço
   * @returns {Promise<number>} Preço de venda.
   */
  async getSellPrice(countryCode, serviceCode) {
    const costPrice = await this.getCostPrice(countryCode, serviceCode);
    const marginSetting = await Setting.findByPk('SMS_PRICE_MARGIN');
    const margin = marginSetting ? parseFloat(marginSetting.value) : 1.2;
    return costPrice * margin;
  }

  /**
   * Helper para buscar o preço de custo de um serviço na API.
   * @param {string} countryCode - Código do país
   * @param {string} serviceCode - Código do serviço
   * @returns {Promise<number>} Preço de custo.
   */
  async getCostPrice(countryCode, serviceCode) {
    const pricesFromApi = await smsActiveAPI.getPrices(countryCode, serviceCode);
    const serviceDetails = pricesFromApi?.[countryCode]?.[serviceCode];
    if (!serviceDetails || serviceDetails.price === null || isNaN(parseFloat(serviceDetails.price))) {
        throw new Error('Preço para o serviço não encontrado ou inválido.');
    }
    return parseFloat(serviceDetails.price);
  }

  // O restante do arquivo (checkAndCancelIfNoMessage, checkSmsStatus, etc.)
  // Nenhuma outra alteração é necessária aqui.
  async checkAndCancelIfNoMessage(activeNumberId) { try { const activeNumber = await ActiveNumber.findByPk(activeNumberId); if (!activeNumber || activeNumber.status !== 'active') { return; } if (!activeNumber.last_message_received_at) { await this.cancelNumber(activeNumber.user_id, activeNumberId, 'Cancelamento automático - tempo esgotado.'); } } catch (error) { console.error('Erro ao verificar cancelamento automático:', error); } }
  async checkSmsStatus(userId, activeNumberId) { const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId } }); if (!activeNumber) { throw new Error('Número ativo não encontrado'); } try { const status = await smsActiveAPI.getStatus(activeNumber.api_activation_id); if (status.status === 'completed' && status.code) { await this.processSmsReceived(activeNumber, status.code); } else if (status.status === 'cancelled') { await activeNumber.markAsCancelled(); } return { active_number: activeNumber, status: status.status, code: status.code, service_code: activeNumber.metadata.service_code }; } catch (error) { throw new Error(`Erro ao verificar status: ${error.message}`); } }
  async processSmsReceived(activeNumber, code) { if (activeNumber.status === 'completed') return; await activeNumber.updateLastMessageReceived(); await activeNumber.markAsCompleted(); const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } }); if (smsMessage) { await smsMessage.update({ message_body: code, status: 'received' }); } await smsActiveAPI.completeActivation(activeNumber.api_activation_id); }
  async reactivateNumber(userId, activeNumberId) { const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId } }); if (!activeNumber) throw new Error('Número ativo não encontrado'); if (activeNumber.status === 'cancelled') throw new Error('Não é possível reativar um número cancelado'); const { service_code } = activeNumber.metadata; const { country_code } = activeNumber; const reactivatePrice = await this.getSellPrice(country_code, service_code); const user = await User.findByPk(userId); if (parseFloat(user.credits) < reactivatePrice) { throw new Error('Créditos insuficientes para reativação'); } try { await smsActiveAPI.requestAnotherSms(activeNumber.api_activation_id); await CreditsService.debitCredits(userId, reactivatePrice, { type: 'sms_received', description: `Reativação para ${service_code}`, metadata: { reactivation: true, active_number_id: activeNumber.id } }); const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } }); if (smsMessage) { await smsMessage.incrementReactivation(); await smsMessage.update({ cost: literal(`cost + ${reactivatePrice}`) }); } await activeNumber.update({ status: 'active', cost: literal(`cost + ${reactivatePrice}`) }); return activeNumber; } catch (error) { throw new Error(`Erro ao reativar número: ${error.message}`); } }
  async cancelNumber(userId, activeNumberId, reason = 'Cancelado pelo usuário') { const activeNumber = await ActiveNumber.findOne({ where: { id: activeNumberId, user_id: userId }}); if (!activeNumber) throw new Error('Número ativo não encontrado'); if (activeNumber.status === 'cancelled') throw new Error('Número já foi cancelado'); try { await smsActiveAPI.cancelActivation(activeNumber.api_activation_id); await activeNumber.markAsCancelled(); const smsMessage = await SmsMessage.findOne({ where: { api_message_id: activeNumber.api_activation_id } }); if (smsMessage) { await smsMessage.markAsCancelled(); } return activeNumber; } catch (error) { throw new Error(`Erro ao cancelar número: ${error.message}`); } }
  /**
   * Obtém o histórico de SMS do usuário
   * @param {string} userId - ID do usuário
   * @param {Object} options - Opções de paginação e filtros
   * @returns {Object} - Lista de mensagens paginada
   */
  async getSmsHistory(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      service_code,
      startDate,
      endDate
    } = options;

    const offset = (page - 1) * limit;
    const where = { user_id: userId };

    // Filtros opcionais
    if (status) {
      where.status = status;
    }

    if (service_code) {
      where.service_code = service_code;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.created_at[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows } = await SmsMessage.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    return {
      messages: rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(count / limit),
        total_items: count,
        items_per_page: parseInt(limit)
      }
    };
  }  async getActiveNumbers(userId) { return ActiveNumber.findAll({ where: { user_id: userId, status: 'active' }, order: [['created_at', 'DESC']] }); }
}

module.exports = new SMSService();
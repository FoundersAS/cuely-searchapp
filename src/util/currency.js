import request from 'superagent';

const currency_symbols = [
  'EUR',
  'USD',
  'JPY',
  'GBP',
  'CHF',
  'DKK',
  'SEK',
  'NOK',
  'HUF',
  'CAD',
  'AUD',
  'CNY',
  'BGN',
  'BRL',
  'CZK',
  'HKD',
  'HRK',
  'IDR',
  'ILS',
  'INR',
  'KRW',
  'MXN',
  'MYR',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'RUB',
  'SGD',
  'THB',
  'TRY',
  'ZAR',
]

class CurrencyConverter {
  constructor() {
    this.rates = {};
    let self = this;
    this.initTimeout = setTimeout(() => { self._init() }, 5000); // run after 5s
  }

  _init() {
    request
      .get('https://api.fixer.io/latest')
      .timeout(10000)
      .then(response => {
        console.log("Fetched new currency rates", response.body.rates);
        this.rates = response.body.rates;
        this.rates.EUR = 1.0;
      }).catch(err => {
        console.log(err);
      });

    let self = this;
    this.timeout = setTimeout(() => { self._init() }, 7200000); // run again after 7200s=2h
  }

  parseQuery(q) {
    // try to parse the string, e.g. '500 dkk', '333 usd', ...
    if (!q) {
      return null;
    }
    // check if first element is number and second known currency
    let value = parseFloat(q, 10);
    if (isNaN(value)) {
      return null;
    }
    let curr = q.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (this.rates[curr] === undefined) {
      return null;
    }

    let rate = 1.0;
    if (curr !== 'EUR') {
      rate = this.rates[curr];
    }
    let euro_value = value / rate;

    return currency_symbols.filter(x => x !== curr).map(key => ({
      currency: key,
      value: parseFloat((this.rates[key] * euro_value).toFixed(2)).toLocaleString()
    }));
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
    }
  }  
}

let Currency;

export function initCurrency() {
  if (!Currency) {
    Currency = new CurrencyConverter();
  }
  return Currency;
}

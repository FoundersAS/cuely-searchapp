import request from 'superagent';

const currency_symbols = [
  'EUR',
  'USD',
  'GBP',
  'CHF',
  'DKK',
  'SEK',
  'NOK',
  'HUF',
  'CAD',
  'JPY',
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
    // check if second part is 'dkk' or 'dkk to cad'
    q = q.replace(/[^a-zA-Z]/g, '').toUpperCase();
    let from_curr = q.substr(0, 3);
    if (this.rates[from_curr] === undefined) {
      return null;
    }
    let to_curr = null;
    if (q.indexOf('TO') > -1 || q.indexOf('IN') > -1) {
      to_curr = q.slice(-3);
      if (this.rates[to_curr] === undefined) {
        to_curr = null;
      }
    }

    let rate = 1.0;
    if (from_curr !== 'EUR') {
      rate = this.rates[from_curr];
    }
    let euro_value = value / rate;

    let result = currency_symbols.filter(x => x !== from_curr);
    if (to_curr !== null) {
      // move target currency to first position
      result.splice(result.indexOf(to_curr), 1);
      result.unshift(to_curr);
    }

    return result.map(key => ({
      currency: key,
      value: parseFloat((this.rates[key] * euro_value).toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2 })
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

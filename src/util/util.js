import moment from 'moment';
import request from 'superagent';
import { API_ROOT } from './const.js';
import Baby from 'babyparse';

// ---- API CALLS
export function getAlgoliaCredentials(csrfToken, sessionId) {
  return callApi('/home/algolia_key', csrfToken, sessionId);
}

export function getSyncStatus(csrfToken, sessionId, provider) {
  return callApi('/home/sync_status', csrfToken, sessionId, { provider });
}

export function startSync(csrfToken, sessionId, provider) {
  return callApi('/home/sync', csrfToken, sessionId, { provider }, 'POST', 'text/html');
}

export function setSegmentStatus(csrfToken, sessionId, identified) {
  return callApi('/home/update_segment', csrfToken, sessionId, { identified }, 'POST');
}

export function getUserInitials(username) {
  return username.split(' ').map(x => x[0]).slice(0, 2).join('');
}

function callApi(endpoint, csrfToken, sessionId, params = {}, method = 'GET', accept = 'application/json') {
  console.log("calling api: " + API_ROOT + endpoint);
  const call_fn = (method == 'POST') ? request.post : request.get;

  return call_fn(API_ROOT + endpoint)
    .set('Accept', accept)
    .set('X-CSRFToken', csrfToken)
    .set('Cookie', `csrftoken=${csrfToken}; sessionid=${sessionId}`)
    .query(params)
    .timeout(20000)
    .then(response => {
      return [response.body, null];
    }).catch(err => {
      console.log(err);
      // return [null, err.response ? err.response.error : err];
      return [null, err];
    });
}

// ---- DATE/TIME
export function fromIsoDateToElapsed(isoDate) {
  const {duration, formatted} = fromIsoDateToNow(isoDate);
  let elapsed = formatted + ' ago';
  if (duration.seconds > 0 || (duration.minutes > 0 && duration.minutes < 3)) {
    elapsed = 'Just now';
  }
  return elapsed;
}

export function fromIsoDateToNow(isoDate) {
  // Calcuate the difference between now and iso date (in the past), e.g. '2016-09-14T15:41:56.019Z',
  // and return the result in seconds, minutes, hours, days.
  let duration = { seconds: 0, minutes: 0, hours: 0, days: 0 }
  let formatted = '';

  const now = moment(Date.now());
  const iso = moment(isoDate);

  const seconds = now.diff(iso, 'seconds');
  if (seconds < 60) {
    duration.seconds = seconds;
    formatted = fromTimeUnit('second', seconds);
  } else {
    const minutes = now.diff(iso, 'minutes');
    if (minutes < 60) {
      duration.minutes = minutes;
      formatted = fromTimeUnit('minute', minutes);
    } else {
      const hours = now.diff(iso, 'hours');
      if (hours < 24) {
        duration.hours = hours;
        formatted = fromTimeUnit('hour', hours);
      } else {
        const days = now.diff(iso, 'days');
        duration.days = days;
        formatted = fromTimeUnit('day', days);
      }
    }
  }

  return {
    duration: duration,
    formatted: formatted
  }
}

function fromTimeUnit(unitName, unitValue) {
  return unitValue + ' ' + unitName + (unitValue !== 1 ? 's' : '');
}

// ---- STRINGS
export function substringCount(s, sub) {
  return (s.match(new RegExp(sub, 'ig')) || []).length;
}

/**
 * Cut a string to desired length and accounting for possible html tag.
 * For example: 'This is a <em>string</em' with maxLen param of 15 should produce 'This is a <em>strin…</em>'
 *
 * Note that this function doesn't account for more complicated structure, such as e.g. nested tags or broken/missing tags
 */
export function cutStringWithTags(s, maxLen, tagName, ellipsis='…') {
  if (!s || s.length < maxLen) {
    return s;
  }
  let count = 0;
  let rawCount = 0;
  let openTag = false;
  for(let c of s) {
    if(count >= maxLen) {
      break;
    }
    rawCount = rawCount + 1;
    if (c == '<') {
      openTag = true;
    }
    
    if (!openTag) {
      count = count + 1;
    }

    if (c == '>') {
      openTag = false;
    }
  }
  const tag = '<' + tagName + '>';
  const tagEnd = '</' + tagName + '>';
  let cut = s.substring(0, rawCount);
  const tagCount = substringCount(cut, tag);
  const tagEndCount = substringCount(cut, tagEnd);
  const appendEllipsis = ellipsis && cut.length < s.length;
  // assuming at most 1 difference in count. If there's more, then we probably have nested or broken/missing tags and we give up.
  const appendEndTag = tagCount === tagEndCount || Math.abs(tagCount - tagEndCount) > 1;

  return cut + (appendEllipsis ? ellipsis : '') + (appendEndTag ? tagEnd : '');
}

export function parseCsv(csvOrTsv) {
  const rows = Baby.parse(csvOrTsv).data;
  // skip all empty rows
  const idx = rows.findIndex((row, index, array) => row.filter(value => value.length > 0).length > 0);
  return idx < 0 ? [] : rows.slice(idx);
}

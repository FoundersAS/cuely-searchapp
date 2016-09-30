import moment from 'moment';

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


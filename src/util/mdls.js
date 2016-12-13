import { execSync } from 'child_process';
/*
 * Only works for one line key/value pairs (arrays are ignored).
 * Tries to convert string values to javascript types, e.g. dates, numbers.. If unsuccessful, then it will keep original string value.
 */
export function mdls(filePath) {
  let output = execSync(`mdls "${filePath}"`, { timeout: 2000 });
  if (output instanceof Buffer) {
    output = output.toString();
  }
  let data = {};

  for (let line of output.split('\n')) {
    if (line.indexOf('=') < 0) {
      continue;
    }
    const tokens = line.split('=');
    let value = tokens[1].trim();
    if (value.startsWith('"')) {
      // string
      value = value.slice(1, -1);
    } else if (value == '(null)') {
      // null
      value = null;
    } else if (value == '(') {
      // array, not handled yet (TODO)
      continue;
    } else {
      // date or number
      let n = Number(value);
      if (isNaN(n)) {
        // assume Date, keep string value if not parseable
        let d = new Date(value);
        if (!isNaN(d)) {
          value = d
        }
      } else {
        // number
        value = n;
      }
    }
    data[tokens[0].trim()] = value;
  }
  return data;
}

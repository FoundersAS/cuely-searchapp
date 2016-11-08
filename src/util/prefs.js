import { readFileSync, writeFileSync, existsSync } from 'fs';

const settingsDefaults = {
  account: {},
  globalShortcut: 'Cmd+Backspace',
  showTrayIcon: true,
  showDockIcon: true
}

class Preferences {
  constructor(path) {
    this.file = `${path}/.cuely_prefs.json`;
    this._init();
  }

  _init() {
    if (existsSync(this.file)) {
      this.settings = JSON.parse(readFileSync(this.file, 'utf8'));
      for (let prop in settingsDefaults) {
        if (!(prop in this.settings)) {
          this.settings[prop] = settingsDefaults[prop];
        }
      }
    } else {
      this.saveAll(settingsDefaults);
    }
  }

  getAll() {
    return this.settings;
  }

  getAccount() {
    return this.settings.account;
  }

  saveAll(settings) {
    writeFileSync(this.file, JSON.stringify(settings, null, 2), 'utf8');
    this.settings = settings;
  }

  saveAccount(account) {
    this.settings.account = account;
    this.saveAll(this.settings);
  }
}

let Prefs;

function initPrefs(path) {
  if (!Prefs) {
    Prefs = new Preferences(path);
  }
  return Prefs;
}

export { Prefs, initPrefs }

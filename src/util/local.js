/* This works ONLY on OSX! */
import { readFile, readFileSync, writeFile, writeFileSync, existsSync, readdirSync, rmdir, unlinkSync } from 'fs';
import { homedir } from 'os';
import { readFile as readPlist } from 'simple-plist';
import { execSync, exec } from 'child_process';

class LocalApps {
  constructor(path) {
    let fsName = 'local_apps';
    this.file = `${path}/.cuely_${fsName}.json`;
    this.iconDir = `${path}/.${fsName}_icons`;
    this._init();
  }

  _init() {
    console.log("Running local apps sync");
    let apps = this.getApps('/Applications');
    apps = apps.concat(this.getApps(homedir() + '/Applications'));

    let appsWithIcons = this.loadAll();
    let counter = 0;
    for (let app of apps) {
      // parse the app name from its location, i.e. /Users/xyz/Applications/pgAdmin3.app -> pgAdmin3
      const appName = app.split('/').slice(-1)[0].split('.')[0];
      const appKey = appName.toLowerCase();
      if (appsWithIcons[appKey] === undefined || appsWithIcons[appKey].location !== app) {
        const filename = `${app}/Contents/Info.plist`;
        if (existsSync(filename)) {
          counter = counter + 1;
          readPlist(`${app}/Contents/Info.plist`, (err, data) => {
            counter = counter - 1;
            if (err) {
              console.log('Could not read/parse Info.plist for app ' + appName, err);
              return;
            }
            let iconsFile = `${app}/Contents/Resources/${data.CFBundleIconFile}`;
            if (!existsSync(iconsFile)) {
              iconsFile = iconsFile + '.icns';
            }

            if (existsSync(iconsFile)) {
              appsWithIcons[appKey] = {
                iconset: iconsFile,
                cachedIcon: null,
                location: app,
                name: appName
              }
            }
            if (counter < 1) {
              this.saveIcons(appsWithIcons);
            }
          });
        }
      }
    }
    if (counter < 1) {
      // happens on re-runs, when apps have already been synced
      this.saveIcons(appsWithIcons);
    }
  }

  getApps(path) {
    return readdirSync(path).filter(x => x.indexOf('.app') > 0).map(x => path + '/' + x);
  }

  saveIconInternal(apps, appKey) {
    let app = apps[appKey];
    const outPath = `${this.iconDir}/${app.name}.iconset`;
    exec(`iconutil --convert iconset "${app.iconset}" --output "${outPath}"`, { timeout: 1000 }, (err) => {
      if(err) {
        console.log(`Could not extract icons from app '${app.name}' iconset`);
      } else {
        const icons = readdirSync(outPath);
        let filtered = icons.filter(x => x.indexOf('32x32@2x.') > -1);
        if (filtered.length < 1) {
          filtered = icons.filter(x => x.indexOf('128x128.') > -1);
        }
        if (filtered.length < 1) {
          // just take whatever icons are there
          filtered = icons;
        }
        if (filtered.length > 0) {
          const iconPath = outPath + '/' + filtered[0];
          apps[appKey].cachedIcon = this.iconDir + '/' + app.name + '.' + filtered[0].split('.').slice(-1)[0];
          // copy the chosen icon and remove cache dir
          readFile(iconPath, (err, data) => {
            if (err) {
              console.log('Could not read file ' + iconPath, err);
              return;
            }
            writeFile(apps[appKey].cachedIcon, data, (err) => {
              if (err) {
                console.log('Could not write file ' + apps[appKey].cachedIcon, err);
                return;
              }
              for (let iconFile of icons) {
                unlinkSync(outPath + '/' + iconFile);
              }

              rmdir(outPath, (err) => {
                if(err) {
                  console.log(err);
                }
              });
            });
          });
        }
        let shouldSave = true;
        for(let an in apps) {
          if (apps[an].cachedIcon === null) {
            shouldSave = false;
          }
        }
        if (shouldSave) {
          this.saveAll(apps);
        }
      }
    });
  }

  saveIcons(apps) {
    let self = this;
    let counter = 0;
    for(let appKey in apps) {
      let app = apps[appKey];
      if (app.cachedIcon === null && app.iconset) {
        counter = counter + 1;
        // To avoid IO errors when running multiple iconutils instances in parallel, we use setTimeout() hack.
        setTimeout(() => { self.saveIconInternal(apps, appKey) }, counter * 500);
      }
    }
    this.timeout = setTimeout(() => { self._init() }, Math.max(counter * 550, 90000)); // run again after 90s
  }

  saveAll(apps) {
    writeFileSync(this.file, JSON.stringify(apps, null, 2), 'utf8');
    this.currenApps = apps;
  }

  loadAll() {
    if (!existsSync(this.file)) {
      return {};
    }
    this.currentApps = JSON.parse(readFileSync(this.file, 'utf8'));
    return this.currentApps;
  }

  stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
}

let Local;

function initLocal(path) {
if (!Local) {
    Local = new LocalApps(path);
  }
  return Local;
}

export { Local, initLocal }

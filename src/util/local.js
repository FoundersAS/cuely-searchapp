/* This works ONLY on OSX! */
import { readFile, readFileSync, writeFile, writeFileSync, existsSync, readdirSync, rmdir, unlinkSync, statSync } from 'fs';
import { homedir } from 'os';
import { readFile as readPlist } from 'simple-plist';
import { exec } from 'child_process';
import { mdls } from './mdls.js';

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
    // special case for Finder.app
    apps = apps.concat(this.getApps('/System/Library/CoreServices').filter(x => x.endsWith('Finder.app')));

    let appsWithIcons = this.loadAll();
    let counter = 0;
    let appKeys = [];
    for (let app of apps) {
      // parse the app name from its location, i.e. /Users/xyz/Applications/pgAdmin3.app -> pgAdmin3
      let appName = app.split('/').slice(-1)[0].split('.')[0];
      let appKey = appName.toLowerCase();
      appKeys.push(appKey);
      if (appsWithIcons[appKey] === undefined
          || appsWithIcons[appKey].location !== app
          || appsWithIcons[appKey].editorFor === undefined) {
        const filename = `${app}/Contents/Info.plist`;
        if (existsSync(filename)) {
          counter = counter + 1;
          readPlist(filename, (err, data) => {
            counter = counter - 1;
            if (err) {
              console.log('Could not read/parse Info.plist for app ' + appName, err);
              return;
            }

            // some vendors, such as Google for their 'web' apps, install apps with
            // auto-generated names (e.g. 'coobgpohoikkiipiblmjeljniedjpjpf') and the human-readable name is in the plist file
            if (data.CrAppModeShortcutName && data.CrAppModeShortcutName.length > 0) {
              appName = data.CrAppModeShortcutName;
              appKey = appName.toLowerCase();
              appKeys.push(appKey);
            }
            if (!appsWithIcons[appKey]) {
              appsWithIcons[appKey] = {
                iconset: null,
                cachedIcon: null,
                location: app,
                name: appName
              }
            }
            if (!appsWithIcons[appKey].cachedIcon) {
              let iconsFile = `${app}/Contents/Resources/${data.CFBundleIconFile}`;
              if (!existsSync(iconsFile)) {
                iconsFile = iconsFile + '.icns';
              }
              if (existsSync(iconsFile)) {
                appsWithIcons[appKey].iconset = iconsFile;
              }
            }

            if (appsWithIcons[appKey].editorFor === undefined) {
              let editorFor = [];
              let viewerFor = [];

              if (data.CFBundleDocumentTypes) {
                for (let docType of data.CFBundleDocumentTypes) {
                  let exts = []
                  if (docType.CFBundleTypeExtensions) {
                    exts = exts.concat(docType.CFBundleTypeExtensions.map(x => x.toLowerCase()));
                  }
                  if (docType.LSItemContentTypes) {
                    exts = exts.concat(docType.LSItemContentTypes.map(x => x.toLowerCase()));
                  }

                  if (docType.CFBundleTypeRole === 'Editor') {
                    editorFor = editorFor.concat(exts);
                  } else {
                    viewerFor = viewerFor.concat(exts);
                  }
                }
              }

              appsWithIcons[appKey].editorFor = editorFor;
              appsWithIcons[appKey].viewerFor = viewerFor;
              let metadata = mdls(app);
              appsWithIcons[appKey].created = metadata.kMDItemFSCreationDate ? metadata.kMDItemFSCreationDate.getTime() : 0;
              appsWithIcons[appKey].opened = metadata.kMDItemLastUsedDate ? metadata.kMDItemLastUsedDate.getTime() : 0;
            }

            if (counter < 1) {
              this.saveIcons(appsWithIcons);
            }
          });
        }
      }
    }

    if (counter < 1) {
      // happens on re-runs, when apps have already been synced ...
      // check if an app was deleted
      let removed = false;
      for(let cachedAppKey in appsWithIcons) {
        if (!appKeys.includes(cachedAppKey)) {
          removed = true;
          console.log(`Removing app ${cachedAppKey} from app cache`);
          if (appsWithIcons[cachedAppKey].cachedIcon) {
            unlinkSync(appsWithIcons[cachedAppKey].cachedIcon);
          }
          delete appsWithIcons[cachedAppKey];
        }
      }
      if (removed) {
        this.saveAll(appsWithIcons);
      }
      this.saveIcons(appsWithIcons);
    }
  }

  getApps(path, level = 0) {
    let result = [];
    if (existsSync(path) && statSync(path).isDirectory()) {
      let apps = readdirSync(path).filter(x => !(x.startsWith('.') || x.indexOf('Cuely') > -1));
      result = apps.filter(x => x.endsWith('.app')).map(x => path + '/' + x);
      // add possible apps in subdir
      if (level < 1) {
        for (let subdir of apps.filter(x => !x.endsWith('.app'))) {
          result = result.concat(this.getApps(path + '/' + subdir, 1));
        }
      }
    }

    return result;
  }

  _saveIconInternal(apps, appKey) {
    let app = apps[appKey];
    const outPath = `${this.iconDir}/${app.name}.iconset`;
    console.log("getting icon for app", appKey);
    exec(`iconutil --convert iconset "${app.iconset}" --output "${outPath}"`, { timeout: 2000 }, (err) => {
      if(err) {
        console.log(`Could not extract icons from app '${app.name}' iconset`);
        console.log(err);
        delete apps[appKey];
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
        setTimeout(() => { self._saveIconInternal(apps, appKey) }, counter * 500);
      }
    }
    this.timeout = setTimeout(() => { self._init() }, Math.max(counter * 550, 300000)); // run again after 300s=5min
  }

  saveAll(apps) {
    writeFileSync(this.file, JSON.stringify(apps, null, 2), 'utf8');
    this.loadAll();
  }

  loadAll() {
    if (!existsSync(this.file)) {
      return {};
    }
    this.currentApps = JSON.parse(readFileSync(this.file, 'utf8'));
    this.currentAppsAssociations = {};
    for (let app in this.currentApps) {
      if ('editorFor' in this.currentApps[app]) {
        for (let mime of this.currentApps[app].editorFor) {
          if (this._shouldOverride(app, mime, true)) {
            this.currentAppsAssociations[mime] = this.currentApps[app];
          }
        }
        for (let mime of this.currentApps[app].viewerFor) {
          if (this._shouldOverride(app, mime, false)) {
            this.currentAppsAssociations[mime] = this.currentApps[app];
          }
        }
      }
    }
    // Finder is special case, so we override any other mime association for 'public.folder'
    if ('finder' in this.currentApps) {
      this.currentAppsAssociations['public.folder'] = this.currentApps['finder']
    }
    return this.currentApps;
  }

  _shouldOverride(app, mime, editor) {
    let existing = this.currentAppsAssociations[mime];
    if (!existing) {
      return true;
    }

    let existingEditor = existing.editorFor.indexOf(mime) > -1;

    if (existingEditor !== editor) {
      return editor;
    }
    // if both are either viewers (or editors), then check last opened date
    if (existing.opened !== this.currentApps[app].opened) {
      return this.currentApps[app].opened > existing.opened;
    }

    // finally, check created timestamp
    return this.currentApps[app].created > existing.created;
  }

  getIconForMime(mime) {
    if (mime && this.currentAppsAssociations) {
      let mimeLower = mime.toLowerCase();
      if (mimeLower in this.currentAppsAssociations) {
        return this.currentAppsAssociations[mimeLower].cachedIcon;
      }
    }
    return null;
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

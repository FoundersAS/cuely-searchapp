/* This works ONLY on OSX! */
import { readFile, readFileSync, writeFile, writeFileSync, existsSync, readdirSync, rmdir, unlinkSync, statSync } from 'fs';
import { homedir } from 'os';
import { readFile as readPlist } from 'simple-plist';
import { exec } from 'child_process';
import { mdls } from './mdls.js';
import { hash } from './util.js';

export const PREFERENCE_PREFIX = 'pref:';

class LocalApps {
  constructor(path) {
    let fsName = 'local_apps';
    this.file = `${path}/.cuely_${fsName}.json`;
    this.iconDir = `${path}/.${fsName}_icons`;
    this.plistCounter = 0;
    this.iconsCounter = 0;
    this.genericFolderIcon = null;
    this._init();
  }

  _init() {
    console.log("Running local apps sync");
    this.plistCounter = 0;
    let apps = this.getApps('/Applications');
    apps = apps.concat(this.getApps('/System/Library/PreferencePanes').map(x => PREFERENCE_PREFIX + x));
    apps = apps.concat(this.getApps(homedir() + '/Applications'));
    apps = apps.concat(this.getApps(homedir() + '/Library/PreferencePanes').map(x => PREFERENCE_PREFIX + x));
    // special case for Finder.app
    apps = apps.concat(this.getApps('/System/Library/CoreServices').filter(x => x.endsWith('Finder.app')));

    let appsWithIcons = this.loadAll();
    let counter = 0;
    let appKeys = [];
    for (let app of apps) {
      // parse the app name from its location, i.e. /Users/xyz/Applications/pgAdmin3.app -> pgAdmin3
      let appName = app.split('/').slice(-1)[0].split('.')[0];
      let appKey = appName.toLowerCase();
      let isPref = app.startsWith(PREFERENCE_PREFIX);
      if (isPref) {
        app = app.split(PREFERENCE_PREFIX)[1];
        appKey = PREFERENCE_PREFIX + appKey;
      }
      appKeys.push(appKey);
      if (appsWithIcons[appKey] === undefined
          || appsWithIcons[appKey].location !== app
          || appsWithIcons[appKey].created === undefined
          || !this.checkIcon(appsWithIcons[appKey])) {
        const filename = `${app}/Contents/Info.plist`;
        if (existsSync(filename)) {
          this.plistCounter = this.plistCounter + 1;
          // run with intervals to avoid blocking the app (spin wheel)
          setTimeout(() => {
            readPlist(filename, (err, data) => {
              this.plistCounter = this.plistCounter - 1;
              if (err) {
                console.log('Could not read/parse Info.plist for app ' + appName, err);
                return;
              }

              if (data.CFBundleName) {
                appName = data.CFBundleName;
              }
              // some vendors, such as Google for their 'web' apps, install apps with
              // auto-generated names (e.g. 'coobgpohoikkiipiblmjeljniedjpjpf') and the human-readable name is in the plist file
              if (data.CrAppModeShortcutName && data.CrAppModeShortcutName.length > 0) {
                appName = data.CrAppModeShortcutName;
              }

              if (isPref) {
                if (data.NSPrefPaneIconLabel) {
                  appName = data.NSPrefPaneIconLabel;
                }
                appName = PREFERENCE_PREFIX + appName;
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

              if (appsWithIcons[appKey].created === undefined) {
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

              if (this.plistCounter < 1) {
                console.log("Done reading plist files");
                this.saveIcons(appsWithIcons);
              }
            })
          }, this.plistCounter * 200);
        }
      }
    }

    if (this.plistCounter < 1) {
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
    this._loadGenericFolderIcon();
  }

  checkIcon(appData) {
    if (!appData || !appData.cachedIcon) {
      // has no icon
      return false;
    }
    let exists = existsSync(appData.cachedIcon);
    if (!exists) {
      appData.cachedIcon = null;
    }
    return exists;
  }

  getApps(path, level = 0) {
    let result = [];
    if (existsSync(path) && statSync(path).isDirectory()) {
      let apps = readdirSync(path).filter(x => !(x.startsWith('.') || x.indexOf('Cuely') > -1));
      result = apps.filter(x => x.endsWith('.app') || x.endsWith('.prefPane')).map(x => path + '/' + x);
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
    const filename = hash(app.name);
    const outPath = `${this.iconDir}/${filename}.iconset`;
    exec(`iconutil --convert iconset "${app.iconset}" --output "${outPath}"`, { timeout: 2000 }, (err) => {
      this.iconsCounter = this.iconsCounter - 1;
      if(err) {
        console.log(`Could not extract icons from app '${app.name}' iconset`);
        delete apps[appKey];
      } else {
        this._handleIconsetDir(outPath, null, filename, (iconPath) => {
          if (iconPath && appKey in apps) {
            apps[appKey].cachedIcon = iconPath;
          }
          if (this.iconsCounter < 1) {
            console.log("Done storing icons");
            this.saveAll(apps);
          }
        });
      }
    });
  }

  _loadGenericFolderIcon() {
    if (this.genericFolderIcon !== null) {
      return;
    }
    const iconPath = `${this.iconDir}/genericFolder.png`;
    if (existsSync(iconPath)) {
      this.genericFolderIcon = iconPath;
      return;
    }
    const iconsetPath = '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericFolderIcon.icns';
    const outPath = `${this.iconDir}/GenericFolder.iconset`;
    if (existsSync(iconsetPath)) {
      exec(`iconutil --convert iconset "${iconsetPath}" --output "${outPath}"`, { timeout: 2000 }, (err) => {
        if(err) {
          console.log(`Could not extract icons for generic folder`);
          console.log(err);
        } else {
          this._handleIconsetDir(outPath, iconPath, null, () => {
            this.genericFolderIcon = iconPath;
            console.log("Found and loaded generic folder icon");
          });
        }
      })
    }
  }

  _handleIconsetDir(iconsetPath, destIconPath, iconName, cb) {
    if (!existsSync(iconsetPath)) {
      cb(null);
      return;
    }

    const icons = readdirSync(iconsetPath);
    let filtered = icons.filter(x => x.indexOf('32x32@2x.') > -1);
    if (filtered.length < 1) {
      filtered = icons.filter(x => x.indexOf('128x128.') > -1);
    }
    if (filtered.length < 1) {
      // just take whatever icons are there
      filtered = icons;
    }
    if (filtered.length > 0) {
      const iconPath = iconsetPath + '/' + filtered[0];
      if (!destIconPath) {
        destIconPath = this.iconDir + '/' + iconName + '.' + filtered[0].split('.').slice(-1)[0];
      }
      readFile(iconPath, (err, data) => {
        if (err) {
          console.log('Could not read file ' + iconPath, err);
          return;
        }
        if (destIconPath) {
          writeFile(destIconPath, data, (err) => {
            if (err) {
              console.log('Could not write file ' + destIconPath, err);
              return;
            }
            cb(destIconPath);
            for (let iconFile of icons) {
              let rmPath = iconsetPath + '/' + iconFile;
              if (existsSync(rmPath)) {
                unlinkSync(rmPath);
              }
            }

            rmdir(iconsetPath, (err) => {
              if(err) {
                console.log(err);
              }
            });
          });
        }
      });
    }
  }

  saveIcons(apps) {
    let self = this;
    this.iconsCounter = 0;
    for(let appKey in apps) {
      let app = apps[appKey];
      if (app.cachedIcon === null && app.iconset) {
        this.iconsCounter = this.iconsCounter + 1;
        // To avoid IO errors when running multiple iconutils instances in parallel, we use setTimeout() hack.
        setTimeout(() => { self._saveIconInternal(apps, appKey) }, this.iconsCounter * 500);
      }
    }
    this.timeout = setTimeout(() => { self._init() }, Math.max(this.iconsCounter * 550, 300000)); // run again after 300s=5min
  }

  saveAll(apps) {
    let seen = [];
    // check for duplicates, and remove them ...
    for (let key in apps) {
      let app = apps[key];
      if (seen.indexOf(app.name) > -1) {
        delete apps[key];
      }
      seen.push(app.name);
      // also, check icons for preference panes/apps, because some don't have them and
      // then we assign them default Sytem preferences icon
      if (app.cachedIcon === null && app.name.startsWith(PREFERENCE_PREFIX)) {
        let sysApp = apps['system preferences'];
        app.cachedIcon = sysApp.cachedIcon;
        app.iconset = sysApp.iconset;
      }
    }

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
    if (mime) {
      let mimeLower = mime.toLowerCase();
      if ((mimeLower === 'public.folder' || mimeLower === "folder") && this.genericFolderIcon !== null) {
        return this.genericFolderIcon;
      }

      if (this.currentAppsAssociations) {
        if (mimeLower in this.currentAppsAssociations) {
          return this.currentAppsAssociations[mimeLower].cachedIcon;
        }
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

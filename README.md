`NOTE`: Cuely was a startup idea that was part of [Founders](https://founders.as) incubator. Unfortunately, idea failed to gain traction, so it never went
past prototype/discovery phase. If you want to do anything with the code, use it or extend it, feel free to contact me [@jangnezda](https://twitter.com/@jangnezda) or open a Github issue.

# Cuely search app
This repo contains the code and configurations to run Cuely frontend/desktop app. Currently, it only works well on macOS.

## Overview
Cuely is a service that indexes your cloud app accounts (Goggle Drive, Github, Trello, ...) and makes all the indexed data available in one place.
Aim is to have the searches as fast as possible, while still having a structured view of the data. Therefore, the client(s) can be made fast,
informative and showing the data that is up to date.

Cuely search app is an [Electron](https://electron.atom.io/) app that can be used as a search bar (similarly to Spotlight or Alfred). In theory, an Electron app
can be run on all major operating system (Windows, Linux, macOS), however there are hard macOS dependencies in the Cuely code as well as building, signing and updating mechanisms.
It would need some work to make it run properly on Windows or Linux.

The search app connects to Cuely backend for logging in, adding integrations, and so on, but uses [Algolia](https://www.algolia.com) to perform searches. While it would be pretty trivial to replace Algolia
dependency with something else on the backend, it would be considerably harder to do it in this Electron app.

## Development
Make sure that you have NodeJs installed (tested with v6.3.1) along with `npm`, then run `npm install` to get all the dependencies. For development the configuration is a bit complicated, because we want
to have hot-reload of changed code/html/css. Luckily, all is hidden away in the `package.json` file, so to run the app just type: `npm run dev`.

## Production builds
Making an app installable/usable at users' computers involves a bit more work. First, one needs to be a member of [Apple Developer Program](https://developer.apple.com/programs/)
to get the certificate used for signing the app. Self signed certificates or certificates issued by other non-official authorities are useless, e.g. macOS will reject running such apps.
There are different certificates needed, depending on intended use of the app. Simplest variant, installing and running the app outside of app store, requires `Developer ID Application`
certificate. To have the app present in the app store involves other certificates as well as app review process by Apple, which is outside the scope of this README.

To find out if there are any valid code signing certificates present, use `security find-identity` command::
```
$ security find-identity -v -p codesigning
97387061A6DC060551BCC82123810ADC16E9ED18 "Developer ID Application: My company ltd. (D1273L56AC)"
```
If there is a `Developer ID` certificate listed, then you can use it to sign the Cuely app. Remember to use the long id (`97387061A6DC060551BCC82123810ADC16E9ED18`) to replace the 'certificate_id' in `build` directive in `package.json`.

To build and sign the app, run:
```
npm run build
```
After build is done, check if signature is correct by using `codesign` tool:
```
$ codesign -dv Cuely-darwin-x64/Cuely.app
Executable=/Users/jang/projects/cuely-search/Cuely-darwin-x64/Cuely.app/Contents/MacOS/Cuely
Identifier=com.cuely.search
Format=app bundle with Mach-O thin (x86_64)
CodeDirectory v=20200 size=272 flags=0x0(none) hashes=3+3 location=embedded
Signature size=8909
Timestamp=20 Mar 2017, 13.26.38
Info.plist entries=20
TeamIdentifier=DRD73LRQEC
Sealed Resources version=2 rules=13 files=10427
Internal requirements count=1 size=176
```
Output shows correctly signed app details. If the output is something like `bundle format unrecognized, invalid, or unsuitable` or `code object is not signed at all`, then signing of the app failed.

# Deploys/updates
Updating the app once it's been installed at a user's machine is a multi-step process:
1. One needs to setup `update` server, which must be capable of returning a proper response (either url to new version or nothing if version is unchanged)
2. Cuely app then periodically pings this server for new updates.
3. If a new update is available, then Cuely will download new version and restart.

See sibling repository `cuely-updates` to see how the update server works. To make all pieces work, one needs also a place to upload new versions. `package.json` contains `deploy` directive
which uses Amazon S3 to deploy the zipped build. Tailor this solution to your needs, if necessary. At the very least, you must change S3 bucket in the `deploy` directive.

To deploy a new version:
1. Bump the version in `package.json`
2. Run command: `npm run deploy`

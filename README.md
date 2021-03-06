# YouTube Playlist Player [![Beta](https://img.shields.io/badge/status-beta-blue.svg?style=flat)]() [![travis](http://img.shields.io/travis/sidneys/youtube-playlist-player.svg?style=flat)](http://travis-ci.org/sidneys/youtube-playlist-player) [![appveyor](https://ci.appveyor.com/api/projects/status/d69sb6iav7tnrldq?svg=true)](https://ci.appveyor.com/project/sidneys/youtube-playlist-player) [![npm](https://img.shields.io/npm/v/youtube-playlist-player.svg?style=flat)](https://npmjs.com/package/youtube-playlist-player) [![dependencies](https://img.shields.io/david/sidneys/youtube-playlist-player.svg?style=flat-square)](https://npmjs.com/package/youtube-playlist-player) [![devDependencies](https://img.shields.io/david/dev/sidneys/youtube-playlist-player.svg?style=flat-square)](https://npmjs.com/package/youtube-playlist-player)

<p align="center">
  <img height="250px" src="https://raw.githubusercontent.com/sidneys/youtube-playlist-player/release/resources/graphics/icon.png"/><br><br>
  <b>Watch & edit your YouTube playlist on the desktop.</b><br>
  Available for macOS, Windows and Linux.
</p>


## Features

> **Multiple Viewing Modes**

Supports regular Playback as well as YouTube TV (Leanback) viewing modes.

> **Unobstrusive**

Watch videos without browser chrome.

> **Efficient**

Enables hardware-accelerated h264 YouTube playback across platforms.

> **Simple**

Copy & paste a YouTube playlist URL to get started. Login to edit playlists.

> **Adblocker**

Filters on-page and in-stream ads.


## Contents

1. [Installation](#installation)
2. [Developers](#development)
3. [Continuous Integration](#continuous-integration)
5. [Contact](#contact)
6. [Author](#author)


## <a name="installation"/></a> Installation

### Standard Installation

Download the latest version of YouTube Playlist Player on the [Releases](https://github.com/sidneys/youtube-playlist-player/releases) page.

### Installation as Commandline Tool

```bash
npm install --global youtube-playlist-player		# Installs the node CLI module
youtube-playlist-player							# Runs it
```


## <a name="developers"/></a> Developers

### Sources

Clone the repo and install dependencies.

```shell
git clone https://github.com/sidneys/youtube-playlist-player.git youtube-playlist-player
cd youtube-playlist-player
npm install
```

### Scripts

#### npm run **start**

Run the app with integrated Electron.

```bash
npm run start
npm run start:dev 					# with Debugging Tools
npm run start:livereload 			# with Debugging Tools and Livereload
```

#### npm run **localsetup**

Install the app in the System app folder and start it.

```bash
npm run localsetup
npm run localsetup:rebuild			# Build before installation
npm run localsetup:rebuild:dev 		# Build before installation, use Developer Tools
```

#### npm run **build**

Build the app and create installers (see [requirements](#build-requirements)).

```bash
npm run build					# build all available platforms
npm run build macos windows		# build specific platforms (macos/linux/windows)
```

### Build Requirements

* Building for Windows requires [`wine`](https://winehq.org) and [`mono`](https://nsis.sourceforge.net/Docs/Chapter3.htm) (on macOS, Linux)
* Building for Linux requires  [`fakeroot`](https://wiki.debian.org/FakeRoot) and [`dpkg `](https://wiki.ubuntuusers.de/dpkg/) (on macOS, Windows)
* Only macOS can build for other platforms.

#### macOS Build Setup

Install [Homebrew](https://brew.sh), then run:

```bash
brew install wine mono fakeroot dpkg
```

#### Linux  Build Setup

```bash
sudo apt-get install wine mono fakeroot dpkg
```


## <a name="continuous-integration"/></a> Continuous Integration

> Turnkey **build-in-the-cloud** for Windows 10, macOS and Linux.

The process is managed by a custom layer of node scripts and Electron-optimized configuration templates.
Completed Installation packages are deployed to [GitHub Releases](https://github.com/sidneys/youtube-playlist-player/releases). Builds for all platforms and architectures take about 5 minutes.
Backed by the open-source-friendly guys at [Travis](http://travis-ci.org/) and AppVeyor](https://ci.appveyor.com/) and running [electron-packager](https://github.com/electron-userland/electron-packager) under the hood.

### Setup

1.  [Fork](https://github.com/sidneys/youtube-playlist-player/fork) the repo
2.  Generate your GitHub [Personal Access Token](https://github.com/settings/tokens) using "repo" as scope. Copy it to the clipboard.
3.  **macOS + Linux**
     1. Sign in to [Travis](http://travis-ci.org/) using GitHub.
     2. Open your [Travis Profile](https://travis-ci.org/profile), click "Sync Account" and wait for the process to complete.
     3. Find this repository in the list, enable it and click "⚙" to open its settings.
     4. Create a new Environment Variable named **GITHUB_TOKEN**. Paste your Token from step 2 as *value*. 
4.  **Windows**
     1. Sign in to [AppVeyor](https://ci.appveyor.com/) using GitHub.
     2. Click on ["New Project"](https://ci.appveyor.com/projects/new), select "GitHub", look up this repo in the list and click "Add".
     3. After import navigate to the *Settings* > *Environment* subsection
     4. Select "Add Variable", insert **GITHUB_TOKEN** for *name*, paste your Token as *value*. Save.

### Triggering Builds

1. Add a new Tag to start the build process:

   ```shell
   git tag -a v1.0.1
   git push --tags
   ```
   The builds are started in parallel and added to the "Releases" page of the GitHub repo (in draft mode).

2. Use the editing feature to publish the new app version.

3. There is no step 3


## <a name="contribute"/></a> Contact ![Contributions Wanted](https://img.shields.io/badge/contributions-wanted-red.svg?style=flat)

* [Gitter](http://gitter.im/sidneys/youtube-playlist-player) Developer Chat
* [Issues](http;//github.com/sidneys/youtube-playlist-player/issues) File, track and discuss features and issues
* [Wiki](http;//github.com/sidneys/youtube-playlist-player/wiki) Read or contribute to the project Wiki


## <a name="author"/></a> Author

[sidneys](http://sidneys.github.io) 2016

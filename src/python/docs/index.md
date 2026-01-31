<p align="center">
    <img src="https://user-images.githubusercontent.com/12875506/85908858-c637a100-b7cb-11ea-8ab3-75c0c0ddf756.png" alt="SeedSync" />
</p>

<p align="center">
  <a href="https://github.com/thejuran/seedsync">
    <img src="https://img.shields.io/github/stars/thejuran/seedsync" alt="Stars">
  </a>
  <a href="https://github.com/thejuran/seedsync/releases/latest">
    <img src="https://img.shields.io/github/v/release/thejuran/seedsync" alt="Release">
  </a>
  <a href="https://ghcr.io/thejuran/seedsync">
    <img src="https://img.shields.io/badge/ghcr.io-thejuran%2Fseedsync-blue" alt="GHCR">
  </a>
  <a href="https://github.com/thejuran/seedsync/blob/master/LICENSE.txt">
    <img src="https://img.shields.io/github/license/thejuran/seedsync" alt="License">
  </a>
</p>

# SeedSync

**Fast file syncing from remote servers with a web UI, powered by LFTP.**

SeedSync is a tool to sync files from a remote Linux server (like your seedbox) to a local machine. It uses [LFTP](http://lftp.tech/) for blazing fast parallel transfers and provides a modern web interface for tracking and controlling your downloads.

---

## Features

- **Lightning Fast Transfers** - Built on LFTP, the fastest file transfer program, with parallel segment downloads
- **Modern Web UI** - Track and control your transfers from any device with a responsive web interface
- **Auto-Extract** - Automatically extract archives (zip, rar, etc.) after download completes
- **Auto-Queue** - Pattern-based matching to automatically queue files you want
- **Easy File Management** - Delete files locally or remotely with a single click
- **No Remote Installation** - Only requires SSH access to your remote server
- **Cross-Platform** - Native support for Linux, Docker support for Windows and macOS

---

## Quick Start

### Using Docker (Recommended)

```bash
docker run -d \
  --name seedsync \
  -p 8800:8800 \
  -v /path/to/downloads:/downloads \
  -v /path/to/config:/config \
  ghcr.io/thejuran/seedsync
```

Then open [http://localhost:8800](http://localhost:8800) in your browser.

For detailed installation instructions, see the [Installation Guide](install.md).

---

## Supported Platforms

| Platform | Installation Method |
|----------|---------------------|
| Linux/Ubuntu (64-bit) | Docker or Deb Package |
| Raspberry Pi (v2, v3, v4, v5) | Docker |
| Windows | Docker |
| macOS | Docker |

---

## Screenshot

<p align="center">
    <img src="https://user-images.githubusercontent.com/12875506/37031587-3a5df834-20f4-11e8-98a0-e42ee764f2ea.png" alt="SeedSync Dashboard" />
</p>

---

## Links

- **GitHub**: [thejuran/seedsync](https://github.com/thejuran/seedsync)
- **Docker Image**: [ghcr.io/thejuran/seedsync](https://github.com/thejuran/seedsync/pkgs/container/seedsync)
- **Issues**: [Report a Bug](https://github.com/thejuran/seedsync/issues)
- **License**: [Apache 2.0](https://github.com/thejuran/seedsync/blob/master/LICENSE.txt)
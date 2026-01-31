# Changelog

All notable changes to SeedSync are documented here.

---

## [1.0.0] - 2026-01-30

This is the first release of the maintained fork by [thejuran](https://github.com/thejuran).

### Added
- Re-enabled ARM64 support for Raspberry Pi and Apple Silicon

### Changed
- Modernized Angular frontend (upgraded to Angular 19)
- Upgraded Bootstrap 4 to Bootstrap 5
- Improved thread safety and memory management
- Modernized Debian packaging
- Moved Docker images to GitHub Container Registry (ghcr.io)

---

## [0.8.6] - 2020-12-30

### Fixed
- Fixed broken rar extraction in previous release

---

## [0.8.5] - 2020-12-30

### Fixed
- Fixed errors caused by non-utf8 characters in file names

### Changed
- Reduced docker image size by switching to a slim base

---

## [0.8.4] - 2020-08-19

### Added
- Support for Raspberry Pi (armv7 and armv8 architectures)

### Fixed
- Fixed more LFTP parser errors

---

## [0.8.3] - 2020-06-29

### Fixed
- Ignore non-consecutive LFTP parser errors

---

## [0.8.2] - 2020-06-26

### Fixed
- Fixed more LFTP parser errors

---

## [0.8.1] - 2020-06-17

### Fixed
- Fixed another LFTP parser error

---

## [0.8.0] - 2020-06-09

### Changed
- Remote server disconnections no longer stop the app
- Remote server connection error messages are more descriptive

### Fixed
- Fixed an LFTP parser error

---

## [0.7.3] - 2020-05-31

### Fixed
- Fixed docker image scp error with unknown user

---

## [0.7.2] - 2020-05-31

### Fixed
- Fixed docker image ssh directory path

---

## [0.7.1] - 2020-05-30

### Added
- Support for Ubuntu 20.04 (debian package)
- Support for arbitrary host uid in Docker image

### Fixed
- Fixed some LFTP parsing errors

---

## [0.7.0] - 2019-02-01

### Added
- Show file created and modified timestamps in UI
- Added UI option to sort list of files by name
- Support for wildcards in auto-queue patterns
- Added a notification for newer releases of SeedSync

### Changed
- Improved filtering UI
- Improved settings UI on mobile devices
- Improved logging UI
- Remember some UI preferences
- Faster startup by skipping remote scanfs installation when possible
- Docker application is now architecture independent

### Fixed
- Fixed 100% CPU utilization when idle
- Fixed file permission issues with Docker application
- Various other bugfixes

---

## [0.6.0] - 2018-03-21

### Added
- Added support for password-based SSH login

### Fixed
- Fixed some SSH errors

---

## [0.5.1] - 2018-03-14

### Added
- Added (hidden) setting to enable verbose logging

### Fixed
- Fixed LFTP timeout errors crashing the app

---

## [0.5.0] - 2018-03-09

### Added
- Added LFTP option to rename downloading/unfinished files

---

## [0.4.0] - 2018-03-08

### Added
- Docker image released

### Fixed
- Fixed auto-queue not working when patterns list empty
- Fixed zombie lftp process after exit

---

## [0.3.0] - 2018-03-06

### Added
- Added ability to extract archive files
- Added ability to delete files on local and remote server
- Added ability to automatically extract auto-queued files
- Shiny new icons
- Added UI notification when waiting for remote server to respond

### Fixed
- Fixed service exiting on 'text file is busy' error
- Various UI improvements

---

## [0.2.0] - 2018-01-04

### Added
- Added option for remote SSH port
- Added ability to view log in web GUI
- Added option to enable/disable pattern-restricted AutoQueue
- Added option to enable/disable AutoQueue entirely

### Fixed
- Fixed AutoQueue not re-queuing file when it changes on remote server
- Minor UI improvements

---

## [0.1.0] - 2017-12-23

### Added
- Initial Release

# Installation

SeedSync requires installation on a local machine.
Nothing needs to be installed on the remote server.

## Requirements

### Remote Server

Requirements for the remote server are:

* Linux-based system (64-bit)
* SSH access

### Local Machine

The following table describes the installation method supported for each platform.

|  | Docker Image | Deb Package |
| ------------ | :-------------: | :------------: |
| Linux/Ubuntu (amd64) | &#9989;️  | &#9989; |
| Linux/Ubuntu (arm64) | &#9989;️  | &#9989; |
| Raspberry Pi (v3, v4, v5) | &#9989;  | &#9989; |
| Windows | &#9989;  | |
| macOS | &#9989;  | |

Select the section for your platform:

* [Docker Image (Linux/Ubuntu, Raspberry Pi, macOS)](#install-docker)
* [Docker Image (Windows)](#install-windows)
* [Deb Package (Linux/Ubuntu, Raspberry Pi)](#install-ubuntu)


## <a name="install-docker"></a> Docker Image (Linux/Ubuntu, Raspberry Pi, macOS)

Docker images are published to GitHub Container Registry and support both `amd64` and `arm64` architectures. Docker will automatically pull the correct image for your platform.

### Choosing a tag

| Tag | Description |
|-----|-------------|
| `ghcr.io/thejuran/seedsync:latest` | Latest stable release (recommended) |
| `ghcr.io/thejuran/seedsync:1.3.1` | Pinned to a specific version |
| `ghcr.io/thejuran/seedsync:dev` | Latest master build (may be unstable) |

### Running the container

1. Run the docker image with the following command:

        :::bash
        docker run \
           -p 8800:8800 \
           -v <downloads directory>:/downloads \
           -v <config directory>:/config \
           ghcr.io/thejuran/seedsync

    where

    * `<downloads directory>` refers to the location on host machine where downloaded files will be placed
    * `<config directory>` refers to the location on host machine where config files will be placed
    * both these directories must already exist

    By default the docker image is run under the default user (uid=1000).
    To run as a different user, include the option `--user <uid>:<gid>`.

    If you receive errors related to locale when connecting to the remote server, then also include
    the following options.

    ```
    -e LC_ALL=en_US.UTF-8
    -e LANG=en_US.UTF-8
    ```

2. Access application GUI by going to [http://localhost:8800](http://localhost:8800) in your browser.

3. Go to the Settings page and fill out the required information.
   Under the Local Directory setting, enter `/downloads`.

4. **While password-based login is supported, key-based authentication is highly recommended!**
   See the [Key-Based Authentication Setup](#key-auth) section for details.

### Docker Compose

You can also use Docker Compose for easier management:

```yaml
services:
  seedsync:
    image: ghcr.io/thejuran/seedsync:latest
    container_name: seedsync
    ports:
      - "8800:8800"
    volumes:
      - /path/to/downloads:/downloads
      - /path/to/config:/config
      - ~/.ssh:/home/seedsync/.ssh:ro
    restart: unless-stopped
```


## <a name="install-windows"></a> Docker Image (Windows)

SeedSync supports Windows via Docker.

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/).

2. Make sure Docker Desktop is running and you can successfully run the [Hello World](https://docs.docker.com/get-started/) container.

3. Open a terminal (PowerShell or Command Prompt) and run the SeedSync image:

        :::bash
        docker run \
           -p 8800:8800 \
           -v <downloads directory>:/downloads \
           -v <config directory>:/config \
           ghcr.io/thejuran/seedsync

    where

    * `<downloads directory>` refers to the location on host machine where downloaded files will be placed
    * `<config directory>` refers to the location on host machine where config files will be placed
    * both these directories must already exist

    !!! note
        Windows paths should use forward slashes, e.g. `/c/Users/yourname/Downloads`

4. Access application GUI by going to [http://localhost:8800](http://localhost:8800) in your browser.

5. Go to the Settings page and fill out the required information.
   Under the Local Directory setting, enter `/downloads`.

6. **While password-based login is supported, key-based authentication is highly recommended!**
   See the [Key-Based Authentication Setup](#key-auth) section for details.


## Post-Install Setup

SeedSync's web-based GUI can be accessed at [http://localhost:8800](http://localhost:8800).
Or in case of docker, whatever host port you specified in the `-p <port>:8800` option.

You may also access it from another device by replacing 'localhost' with the IP address or hostname of the machine where it is installed.

### <a name="key-auth"></a> Password-less/Key-based Authentication Setup

Password-based access to your remote server is highly unsecure.
It is strongly recommended that you set up key-based authentication.

1. You will need to generate a public-private key pair.
   Here is a [simple tutorial](https://www.tecmint.com/ssh-passwordless-login-using-ssh-keygen-in-5-easy-steps/)
   that walks you through this process.

    !!! note
        Make sure the access is set up for the user under which SeedSync is running.

    !!! note
        If you're using docker, also see the [Using SSH Keys with Docker](#keys-inside-docker) section.


2. Before continuing, verify the password-less access by SSH'ing into your remote server in a terminal:

        :::bash
        ssh <remote user>@<remote server>

    You should be able to log in to the remote server without being prompted for a password


3. Update the settings

    1. Access the web GUI and choose the Settings page from the menu.
    2. Replace your password in the "Server Password" field with anything else (it can't be empty).
    3. Select "Use password-less key-based authentication".
    4. Restart SeedSync


### <a name="keys-inside-docker"></a> Using SSH Keys with Docker

1. Generate a SSH private/public key pair if you haven't already.
   Here is a [simple tutorial](https://www.tecmint.com/ssh-passwordless-login-using-ssh-keygen-in-5-easy-steps/)
   that walks you through this process.

2. Include the following option with your docker command:

        :::bash
        -v <path to .ssh directory>:/home/seedsync/.ssh

    Most commonly this should be:

        :::bash
        -v ~/.ssh:/home/seedsync/.ssh


!!! note
    If you are running the docker guest with a non-standard user using the `--user` option,
    then you must make sure that your `.ssh` directory is also readable by that user.


## <a name="install-ubuntu"></a> Deb Package (Linux/Ubuntu, Raspberry Pi)

Deb packages are available for both `amd64` and `arm64` architectures.

1. Download the deb package for your architecture from the [latest release](https://github.com/thejuran/seedsync/releases/latest)

2. Install the deb package:

        :::bash
        sudo dpkg -i <deb file>

3. During the first install, you will be prompted for a user name:
   ![Install prompt for username](images/install_1.png)
   This is the user under which the SeedSync service will run. The transferred files will be owned by this user.
   It is recommended that you set this to your user (and NOT root).

4. After the installation is complete, verify that the application is running by going to [http://localhost:8800](http://localhost:8800) in your browser.

5. Go to the Settings page and fill out the required information.
   **While password-based login is supported, key-based authentication is highly recommended!**
   See the [Key-Based Authentication Setup](#key-auth) section for details.

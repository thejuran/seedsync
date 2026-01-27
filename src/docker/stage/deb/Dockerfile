ARG BASE_IMAGE=ubuntu:22.04

FROM $BASE_IMAGE

# Install dependencies (including curl for healthcheck)
RUN apt-get update && apt-get install -y \
    sudo \
    libssl-dev \
    libexpat1 \
    expect \
    lftp \
    openssh-client \
    curl

# Create non-root user
RUN useradd --create-home -s /bin/bash user && \
    echo "user:user" | chpasswd && adduser user sudo

# Create directory for downloaded files
RUN mkdir /downloads && \
    chown user:user /downloads

USER user

# Add ssh keys for user, as user
ADD --chown=user:user src/docker/stage/deb/id_rsa.pub /home/user/.ssh/
ADD --chown=user:user src/docker/stage/deb/id_rsa /home/user/.ssh/
RUN chmod 600 /home/user/.ssh/id_rsa

USER root


# Let user run sudo without password
RUN echo "user ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers

WORKDIR /scripts

ADD src/docker/stage/deb/install_seedsync.sh /scripts/
ADD src/docker/stage/deb/expect_seedsync.exp /scripts/
ADD src/docker/stage/deb/entrypoint.sh /scripts/

# Run seedsync directly (no systemd needed)
ENTRYPOINT ["/scripts/entrypoint.sh"]

EXPOSE 8800

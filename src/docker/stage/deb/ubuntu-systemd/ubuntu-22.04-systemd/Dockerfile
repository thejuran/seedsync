# Copied from:
# https://github.com/solita/docker-systemd/blob/master/Dockerfile
# https://hub.docker.com/r/solita/ubuntu-systemd/
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y systemd

ENV container docker

# Don't start any optional services except for the few we need.
RUN find /etc/systemd/system \
         /lib/systemd/system \
         -path '*.wants/*' \
         -not -name '*journald*' \
         -not -name '*systemd-tmpfiles*' \
         -not -name '*systemd-user-sessions*' \
         -exec rm \{} \;

RUN systemctl set-default multi-user.target

# Mask services that don't work well in containers
RUN systemctl mask systemd-resolved.service systemd-networkd.service

# Make network-online.target immediately reachable in containers
RUN mkdir -p /etc/systemd/system/network-online.target.d && \
    printf '[Unit]\nDefaultDependencies=no\nRequires=\nWants=\nAfter=\n' > /etc/systemd/system/network-online.target.d/override.conf

COPY setup /sbin/

STOPSIGNAL SIGRTMIN+3

# Workaround for docker/docker#27202, technique based on comments from docker/docker#9212
CMD ["/bin/bash", "-c", "exec /lib/systemd/systemd --log-target=journal 3>&1"]

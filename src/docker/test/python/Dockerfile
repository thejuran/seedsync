FROM seedsync/run/python/devenv AS seedsync_test_python

RUN ls -l /app/python

# Install dependencies
# Note: The base image (seedsync_run_python_env) already has non-free repos enabled via DEB822 format
RUN apt-get update && \
    apt-get install -y \
        openssh-server \
        rar \
        unrar

ADD src/docker/test/python/entrypoint.sh /app/

# setup sshd
RUN mkdir -p /var/run/sshd
RUN ssh-keygen -t rsa -N "" -f /root/.ssh/id_rsa && \
    cat /root/.ssh/id_rsa.pub >> /root/.ssh/authorized_keys
# Disable the known hosts prompt
RUN echo "StrictHostKeyChecking no\nUserKnownHostsFile /dev/null\nLogLevel=quiet" > /root/.ssh/config
# Enable password authentication in sshd (required for OpenSSH 9.x in Debian Bookworm)
# Also enable keyboard-interactive for compatibility
RUN echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config && \
    echo "KbdInteractiveAuthentication yes" >> /etc/ssh/sshd_config && \
    echo "UsePAM yes" >> /etc/ssh/sshd_config

# create the seedsynctest user, add root's public key to seedsynctest
RUN useradd --create-home -s /bin/bash seedsynctest && \
    echo "seedsynctest:seedsyncpass" | chpasswd
RUN usermod -a -G root seedsynctest
RUN cp /root/.ssh/id_rsa.pub /home/seedsynctest/ && \
    chown seedsynctest:seedsynctest /home/seedsynctest/id_rsa.pub
USER seedsynctest
RUN  mkdir -p /home/seedsynctest/.ssh && \
    cat /home/seedsynctest/id_rsa.pub >> /home/seedsynctest/.ssh/authorized_keys
USER root

EXPOSE 22

# src needs to be mounted on /src/
WORKDIR /src/
ENV PYTHONPATH=/src

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["pytest", "-v"]

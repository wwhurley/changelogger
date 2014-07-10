#!/bin/bash
LIBRARIAN_PUPPET_VERSION="1.0.3"
VAGRANT_CORE_FOLDER="/vagrant"

OS=$(/bin/bash "${VAGRANT_CORE_FOLDER}/puppet/shell/os-detect.sh" ID)
CODENAME=$(/bin/bash "${VAGRANT_CORE_FOLDER}/puppet/shell/os-detect.sh" CODENAME)

# Directory in which librarian-puppet should manage its modules directory
PUPPET_DIR=/etc/puppet/
OPT_DIR=/opt/puppet

$(which git > /dev/null 2>&1)
FOUND_GIT=$?

if [ "${FOUND_GIT}" -ne '0' ] && [ ! -f /.puphpet-stuff/librarian-puppet-installed ]; then
    $(which apt-get > /dev/null 2>&1)
    FOUND_APT=$?
    $(which yum > /dev/null 2>&1)
    FOUND_YUM=$?

    echo 'Installing git'

    if [ "${FOUND_YUM}" -eq '0' ]; then
        yum -q -y makecache
        yum -q -y install git
    else
        apt-get -q -y install git-core >/dev/null
    fi

    echo 'Finished installing git'
fi

if [[ ! -d "${OPT_DIR}" ]]; then
    mkdir -p "${OPT_DIR}"
fi

if [[ ! -d "${PUPPET_DIR}" ]]; then
    mkdir -p "${PUPPET_DIR}"
    echo "Created directory ${PUPPET_DIR}"
fi

cp "${VAGRANT_CORE_FOLDER}/puppet/Puppetfile" "${PUPPET_DIR}"
cp "${VAGRANT_CORE_FOLDER}/puppet/Puppetfile.lock" "${PUPPET_DIR}"

echo "Copied Puppetfile"

if [ "${OS}" == 'debian' ] || [ "${OS}" == 'ubuntu' ]; then
    if [[ ! -f "${OPT_DIR}/librarian-base-packages" ]]; then
        echo 'Installing base packages for librarian'
        apt-get install -y build-essential ruby-dev >/dev/null
        echo 'Finished installing base packages for librarian'

        touch "${OPT_DIR}/librarian-base-packages"
    fi
fi

if [ "${OS}" == 'ubuntu' ]; then
    if [[ ! -f "${OPT_DIR}/librarian-libgemplugin-ruby" ]]; then
        echo 'Updating libgemplugin-ruby (Ubuntu only)'
        apt-get install -y libgemplugin-ruby >/dev/null
        echo 'Finished updating libgemplugin-ruby (Ubuntu only)'

        touch "${OPT_DIR}/librarian-libgemplugin-ruby"
    fi

    if [ "${CODENAME}" == 'lucid' ] && [ ! -f "${OPT_DIR}/librarian-rubygems-update" ]; then
        echo 'Updating rubygems (Ubuntu Lucid only)'
        echo 'Ignore all "conflicting chdir" errors!'
        gem install rubygems-update >/dev/null
        /var/lib/gems/1.8/bin/update_rubygems >/dev/null
        echo 'Finished updating rubygems (Ubuntu Lucid only)'

        touch "${OPT_DIR}/librarian-rubygems-update"
    fi
fi

if [[ ! -f "${OPT_DIR}/librarian-puppet-installed" ]]; then
    echo 'Installing librarian-puppet'
    gem install librarian-puppet -v "${LIBRARIAN_PUPPET_VERSION}" >/dev/null
    echo 'Finished installing librarian-puppet'

    echo 'Running initial librarian-puppet'
    cd "${PUPPET_DIR}" && librarian-puppet install --clean >/dev/null
    echo 'Finished running initial librarian-puppet'

    touch "${OPT_DIR}/librarian-puppet-installed"
else
    echo 'Running update librarian-puppet'
    cd "${PUPPET_DIR}" && librarian-puppet update >/dev/null
    echo 'Finished running update librarian-puppet'
fi




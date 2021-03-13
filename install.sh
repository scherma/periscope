#!/bin/bash

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root"
    exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
fail=0

echo -e "${GREEN}Preparing to install...${NC}"

read -p "Specify the user which the URL sandbox will run as: " LABUSER

if [ -z "$(getent passwd "$LABUSER")" ]; then
    echo -e "${RED}Please create user $LABUSER before running this script${NC}"
    exit 1
fi

read -s -p "Set database password: " DBPASS
read -p "If your environment requires a proxy, please provide the address (e.g. http://192.168.14.4:3128): " LABPROXY
echo -e "${GREEN}Proceeding with URL sandbox installation${NC}"

SCRIPTDIR=$(dirname "$(realpath "$0")")

function install_periscope_dependencies() {
	echo -e "${GREEN}Running basic updates...${NC}"
    dnf update -y

    # install basic tools
    dnf install -y nginx tcpdump wget net-tools curl epel-release yum-utils rsync nodejs postgresql-server postgresql-contrib 
    # install chrome dependencies
    dnf install -y GraphicsMagick atk gtk3 alsa-lib-devel libXScrnSaver libXtst libXdamage libxComposite libX11 mesa-libgbm libxshmfence
    
}

function prep_directories() {
    mkdir /usr/local/unsafehex
    mkdir /usr/local/unsafehex/periscope
    mkdir /usr/local/unsafehex/periscope/data
	rsync -r --info=progress2 "$SCRIPTDIR/src/"* "/usr/local/unsafehex/periscope/"

    echo "{
        \"dbname\": \"periscope\",
        \"dbuser\": \"$LABUSER\",
        \"dbpass\": \"$DBPASS\"
    }" > /usr/local/unsafehex/periscope/api/lib/options.json

    if [ -z "$LABPROXY" ]; then
        npm config set proxy $LABPROXY
        npm config set https-proxy $LABPROXY
    fi

    # install nodejs dependencies
    npm i sass pm2 -g --save

    chown -R $LABUSER:$LABUSER /usr/local/unsafehex

    cd /usr/local/unsafehex/periscope
    su -c "npm i --save" $LABUSER
    # install UI JS dependencies
    cd /usr/local/unsafehex/periscope/api/public
    su -c "npm i --save" $LABUSER
    # install dfpm dependencies
    cd /usr/local/unsafehex/periscope/api/lib
    su -c "git clone https://github.com/freethenation/DFPM/" $LABUSER
    su -c "npm i --save" $LABUSER

    # build CSS
    su -c "/usr/local/bin/sass /usr/local/unsafehex/periscope/api/public/main.scss /usr/local/unsafehex/periscope/api/public/stylesheets/style.css" $LABUSER

}

function configure_periscope_db() {
    echo -e "${GREEN}Configuring database...${NC}"
    postgresql-setup --initdb --unit postgresql
    
    # set postgres to use tcp socket auth with password instead of unix socket (needed by knex/pg)
    mv /var/lib/pgsql/data/pg_hba.conf /var/lib/pgsql/data/pg_hba.conf.default
    sed -e 's/\(host.*127.0.0.1\/32.*\) ident/\1 md5/' /var/lib/pgsql/data/pg_hba.conf.default | sed -e 's/\(host.*::1\/128.*\) ident/\1 md5/' > /var/lib/pgsql/data/pg_hba.conf

    systemctl enable --now postgresql
    systemctl restart postgresql

    su -c "psql -c \"CREATE USER $LABUSER WITH PASSWORD '$DBPASS';\"" postgres
    su -c "psql -c \"CREATE DATABASE periscope;\"" postgres
    su -c "psql -q periscope < $SCRIPTDIR/schema.sql" postgres
}

function start_periscope() {
    su -c "/usr/local/bin/pm2 start /usr/local/unsafehex/periscope/api/bin/www --name periscope --time" $LABUSER
}

install_periscope_dependencies
configure_periscope_db
prep_directories
start_periscope


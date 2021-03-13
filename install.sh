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
read -p "Enter the URL your app will be accessed at (needed for setting up websocket connection)" APPURL
echo -e "${GREEN}Proceeding with URL sandbox installation${NC}"

SCRIPTDIR=$(dirname "$(realpath "$0")")

function install_periscope_dependencies() {
    echo -e "${GREEN}Running basic updates...${NC}"
    dnf update -y

    # install basic tools
    dnf install -y nginx tcpdump wget net-tools curl epel-release yum-utils rsync nodejs postgresql-server postgresql-contrib 
    # install chrome dependencies
    dnf install -y GraphicsMagick atk gtk3 alsa-lib-devel libXScrnSaver libXtst libXdamage libXcomposite libX11 mesa-libgbm libxshmfence
    dnf install -y libnss3 libatk-1.0.so.0 libatk-bridge-2.0.so.0 libcups.so.2 libXcomposite.so.1 libXdamage.so.1 libXext.so.6
    dnf install -y libcups.so.2 libXcomposite.so.1 libXdamage.so.1 libXrandr.so.2 libgbm.so.1 libgtk-3.so.0 libgdk-3.so.0 libpango-1.0.so.0 
    dnf install -y libcairo.so.2 libasound.so.2 libxshmfence.so.1 alsa-lib.x86_64 atk.x86_64 cups-libs.x86_64 gtk3.x86_64 libXcomposite.x86_64 
    dnf install -y libXcursor.x86_64 libXdamage.x86_64 libXext.x86_64 libXi.x86_64 libXrandr.x86_64 libXScrnSaver.x86_64 libXtst.x86_64 
    dnf install -y pango.x86_64 xorg-x11-fonts-100dpi xorg-x11-fonts-75dpi xorg-x11-fonts-cyrillic xorg-x11-fonts-misc xorg-x11-fonts-Type1 
    dnf install -y xorg-x11-utils mesa-libgbm libxshmfence-1.3-2.el8.x86_64

    
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

    sed -e "s/yourdomain/$APPURL/" "$SCRIPTDIR/src/api/public/index.html" > /usr/local/unsafehex/periscope/api/public/index.html

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
    su -c "psql -c \"ALTER DATABASE periscope OWNER TO $LABUSER;\"" postgres
    su -c "psql -q periscope < $SCRIPTDIR/schema.sql" $LABUSER
}

function start_periscope() {
    su -c "/usr/local/bin/pm2 start /usr/local/unsafehex/periscope/api/bin/www --name periscope --time" $LABUSER
}

install_periscope_dependencies
configure_periscope_db
prep_directories
start_periscope


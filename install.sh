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
echo -e "${GREEN}Proceeding with URL sandbox installation${NC}"

SCRIPTDIR=$(dirname "$(realpath "$0")")

function install_periscope_dependencies() {
	echo -e "${GREEN}Running basic updates...${NC}"
    dnf update -y

    # install basic tools
    dnf install -y nginx tcpdump wget net-tools curl epel-release yum-utils rsync nodejs postgresql-server postgresql-contrib 
    # install chrome dependencies
    dnf install -y GraphicsMagick atk gtk3 alsa-lib-devel libXScrnSaver libXtst libXdamage libxComposite libX11
    
    # set postgres to use tcp socket auth with password instead of unix socket (needed by knex/pg)
    sed -r 's/^(host.*127.0.0.1\/32\s+) ident/\1 md5/' /var/lib/pgsql/data/pg_hba.conf > /var/lib/pgsql/9.6/data/pg_hba.conf
    sed -r 's/^(host.*::1\/128\s+) ident/\1 md5/' /var/lib/pgsql/data/pg_hba.conf > /var/lib/pgsql/9.6/data/pg_hba.conf

    systemctl enable --now postgresql
    systemctl restart postgresql
}

function prep_directories() {
    mkdir /usr/local/unsafehex
    mkdir /usr/local/unsafehex/periscope
    mkdir /usr/local/unsafehex/periscope/data
	rsync -r --info=progress2 "$SCRIPTDIR/src/periscope/"* "/usr/local/unsafehex/periscope/"

    echo "{
        \"dbname\": \"periscope\",
        \"dbuser\": \"$LABUSER\",
        \"dbpass\": \"$DBPASS\"
    }" > /usr/local/unsafehex/periscope/api/lib/options.json

    # install nodejs dependencies
    cd /usr/local/unsafehex/periscope
    npm i --save

    chown -R $LABUSER:$LABUSER /usr/local/unsafehex
}

function configure_periscope_db() {
	echo -e "${GREEN}Configuring database...${NC}"
    postgresql-setup initdb
	su -c "psql -c \"CREATE USER $LABUSER WITH PASSWORD '$DBPASS';\"" postgres
	su -c "psql -c \"CREATE DATABASE periscope;\"" postgres
	su -c "psql -q periscope < $SCRIPTDIR/schema.sql" $LABUSER
}

function start_periscope() {
    su -c "pm2 start  /usr/local/unsafehex/periscope/api/bin/www --name periscope"
}

INSTALL_CMDS=["install_periscope_dependencies", "configure_periscope_db", "prep_directories", "start_periscope"]

for cmd in "${INSTALL_CMDS[@]}"; do
	cmd
	if [ fail -eq 1 ]; then
		echo -e "${RED}Errors occurred and the installation has failed. See previous output for details. Aborting.${NC}"
		exit 1
	fi
done

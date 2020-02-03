if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root"
    exit 1
fi

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
fail=0

PGVERSION=12

echo -e "${GREEN}Preparing to install...${NC}"

read -p "Specify the user which the URL sandbox will run as: " LABUSER

if [ -z "$(getent passwd "$LABUSER")" ]; then
    echo -e "${RED}Please create user $LABUSER before running this script${NC}"
    exit 1
fi

#echo "Please specify a name and password for the URL sandbox"

#read -p "URL sandbox name: " SBXNAME
read -s -p "Set database password: " DBPASS
#echo ""
#echo "You have specified the following settings:"
#echo "Sandbox user: 			$LABUSER"
#echo "Sandbox name: 			$SBXNAME"
#read -p "Press enter to accept these settings and install the sandbox" CONTINUE
echo -e "${GREEN}Proceeding with URL sandbox installation${NC}"

SCRIPTDIR=$(dirname "$(realpath "$0")")

function install_periscope_dependencies() {
	echo -e "${GREEN}Running basic updates...${NC}"
    yum update -y
    yum install nginx tcpdump wget net-tools curl epel-release yum-utils rsync ImageMagick GraphicsMagick

    mkdir /tmp/periscope/install
    cd /tmp/periscope/install

    echo "${RED}WARNING: nodesource repos will be added by a script downloaded from https://rpm.nodesource.com${NC}" 

    read -p "If you do not trust this site, exit the script NOW." CONTINUE

    curl -sL https://rpm.nodesource.com/setup_10.x | bash -

    yum install -y nodejs npm

    yum-config-manager --setopt=base.exclude=postgresql\* --save base
    yum-config-manager --setopt=updates.exclude=postgresql\* --save updates

    wget https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm
    rpm -i pgdg-redhat-repo-latest.noarch.rpm

    yum install -y postgresql$PGVERSION-server
    
    #sed -r 's/^(host.*127.0.0.1\/32\s+) ident/\1 md5/' /var/lib/pgsql/9.6/data/pg_hba.conf > /var/lib/pgsql/9.6/data/pg_hba.conf
    #sed -r 's/^(host.*::1\/128\s+) ident/\1 md5/' /var/lib/pgsql/9.6/data/pg_hba.conf > /var/lib/pgsql/9.6/data/pg_hba.conf

    su -c "/usr/pgsql-$PGVERSION/bin/initdb -D /var/lib/pgsql/$PGVERSION/data" postgres

    service postgresql-$PGVERSION restart
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

    cd /usr/local/unsafehex/periscope
    npm i --save
    cd /usr/local/unsafehex/periscope/api
    npm i --save

    chown -R $LABUSER:$LABUSER /usr/local/unsafehex
}

function configure_periscope_db() {
	#test postgres install here
	echo -e "${GREEN}Configuring database...${NC}"
	su -c "psql -c \"CREATE USER $LABUSER WITH PASSWORD '$DBPASS';\"" postgres
	su -c "psql -c \"CREATE DATABASE periscope;\"" postgres
	su -c "psql -q periscope < $SCRIPTDIR/schema.sql" $LABUSER
}

INSTALL_CMDS=["install_periscope_dependencies", "configure_periscope_db", "prep_directories"]

for cmd in "${INSTALL_CMDS[@]}"; do
	cmd
	if [ fail -eq 1 ]; then
		echo -e "${RED}Errors occurred and the installation has failed. See previous output for details. Aborting.${NC}"
		exit 1
	fi
done

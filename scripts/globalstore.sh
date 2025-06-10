#!/bin/bash 

case `uname -s` in
    Linux*)     CODEPATH=~/.config/Code;;
    Darwin*)    CODEPATH=~/Library/Application\ Support/Code;;
    *)          CODEPATH=~/.config/Code;;
esac

OLDSTATE=`sqlite3 "${CODEPATH}/User/globalStorage/state.vscdb" 'select value from ItemTable where key = "atlassian.atlascode";'`

if [ -z `command -v jq` ]
then
	echo "$0 requires the jq application to be installed"
	echo "On Mac:"
	echo "  brew install jq"
	echo "On Ubuntu:"
	echo "  apt-get install jq"
	if [ ! -z $1 ]
	then
		exit 0
	fi
	echo ""
fi

if [ -z $1 ]
then
	echo "Commands:"
	echo "--list"
	echo "  List keys currently in global store."
	echo "--print"
	echo "  Display current state of the global store."
	echo "--delete k"
	echo "  Removes the given key from the global store."
	echo "--update k v"
	echo "  Replaces the key k with the value v"
	exit 0
fi

if [ $1 = "--list" ]
then
	echo "Existing keys in global store:"
	echo $OLDSTATE | jq 'keys[]'
	exit 0
fi

if [ $1 = "--print" ]
then
	echo $OLDSTATE | jq '.'
	exit 0
fi

if [ $1 = "--delete" ]
then
	echo "Previous contents of global store $OLDSTATE"

	NEWSTATE=`echo $OLDSTATE | jq -c "del(.$2)"`
	sqlite3 "${CODEPATH}/User/globalStorage/state.vscdb" "UPDATE ItemTable SET value = '$NEWSTATE' WHERE key = \"atlassian.atlascode\";"

	ACTUALNEWSTATE=`sqlite3 "${CODEPATH}/User/globalStorage/state.vscdb" 'select value from ItemTable where key = "atlassian.atlascode";' | jq '.'`

	echo "New contents of global store $ACTUALNEWSTATE"
fi

if [ $1 = "--update" ]
then
	echo "Previous contents of global store $OLDSTATE"

	NEWSTATE=`echo $OLDSTATE | jq -c ".$2 = $3"`
	sqlite3 ${CODEPATH}/User/globalStorage/state.vscdb "UPDATE ItemTable SET value = '$NEWSTATE' WHERE key = \"atlassian.atlascode\";"

	ACTUALNEWSTATE=`sqlite3 ${CODEPATH}/User/globalStorage/state.vscdb 'select value from ItemTable where key = "atlassian.atlascode";' | jq '.'`

	echo "New contents of global store $ACTUALNEWSTATE"
fi

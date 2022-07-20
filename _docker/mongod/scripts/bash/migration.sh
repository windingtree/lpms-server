#!/bin/bash

ADMIN_PSWD="u45y38r3h2jt803urhj30892r3htr0"

function create_admin {
  echo "Creating admin user..."

  mongo --quiet \
    admin \
    /data/scripts/js/admin/admin.js
}

function create_users {
  echo "Creating users..."

  declare -a USER_SCRIPTS=(
    "01_app"
  )

  for script in ${USER_SCRIPTS[@]}; do
    mongo --quiet \
      -u admin \
      -p $ADMIN_PSWD \
      --authenticationDatabase admin \
      win \
      "/data/scripts/js/users/${script}.js"
  done
}

function create_collections {
  echo "Creating collections..."

  declare -a COLLECTION_SCRIPTS=(
    "01_app_config"
    "02_users"
    "03_tokens"
  )

  for script in ${COLLECTION_SCRIPTS[@]}; do
    mongo --quiet \
      -u admin \
      -p $ADMIN_PSWD \
      --authenticationDatabase admin \
      win \
      "/data/scripts/js/collections/${script}.js"
  done
}

/data/scripts/bash/wait-for-db.sh

create_admin
create_users
create_collections

echo "[done]"

exit 0

#!/bin/bash

red=`tput setaf 1`
green=`tput setaf 2`
reset=`tput sgr0`

TIMEOUT=60
END=$((SECONDS+TIMEOUT))
ATTEMPT=0
while [ ${SECONDS} -lt ${END} ];
do
  ATTEMPT=$((ATTEMPT+1))
  RESPONSE=$(curl -s --connect-timeout 5 myapp:8800/server/status 2>&1)
  SERVER_UP=$(echo "${RESPONSE}" | python3 ./parse_seedsync_status.py)
  if [[ "${SERVER_UP}" == 'True' ]]; then
    break
  fi
  echo "E2E Test is waiting for Seedsync server to come up (attempt ${ATTEMPT}, status: ${SERVER_UP})..."
  sleep 2
done


if [[ "${SERVER_UP}" == 'True' ]]; then
  echo "${green}E2E Test detected that Seedsync server is UP after ${ATTEMPT} attempts${reset}"
  npx playwright test
else
  echo "${red}E2E Test failed to detect Seedsync server after ${TIMEOUT} seconds${reset}"
  echo "${red}Last response: ${RESPONSE}${reset}"
  echo "${red}Parsed status: ${SERVER_UP}${reset}"
  exit 1
fi

#!/bin/bash

function jsonval {
    temp=`cat $json | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w $prop | cut -d":" -f2| sed -e 's/^ *//g' -e 's/ *$//g' `
    version=${temp##*|}
}

json=package.json
prop='version'

jsonval

if [[ "$TRAVIS_PULL_REQUEST" != "false" ]] && [[ "$TRAVIS_REPO_SLUG" == 1c-syntax* ]]; then
    sonar-scanner \
      -Dsonar.projectKey=vsc-language-bsl-plugin \
      -Dsonar.organization=1c-syntax \
      -Dsonar.host.url=https://sonarcloud.io \
      -Dsonar.pullrequest.provider=github \
      -Dsonar.pullrequest.github.repository=$TRAVIS_REPO_SLUG \
      -Dsonar.pullrequest.github.endpoint=https://api.github.com \
      -Dsonar.pullRequest.branch=$TRAVIS_PULL_REQUEST_BRANCH \
      -Dsonar.pullRequest.key=$TRAVIS_PULL_REQUEST \
      -Dsonar.pullRequest.base=$TRAVIS_BRANCH \
      -Dsonar.scanner.skip=false

elif [[ "$TRAVIS_BRANCH" == "develop" ]] && [[ "$TRAVIS_PULL_REQUEST" == "false" ]]; then
    sonar-scanner \
    -Dsonar.projectKey=vsc-language-bsl-plugin \
    -Dsonar.organization=1c-syntax \
    -Dsonar.host.url=https://sonarcloud.io \
    -Dsonar.projectVersion=$version \
    -Dsonar.branch.name=$TRAVIS_BRANCH
    -Dsonar.scanner.skip=false
fi

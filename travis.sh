#!/bin/bash

npm test --silent

function jsonval {
    temp=`cat $json | sed 's/\\\\\//\//g' | sed 's/[{}]//g' | awk -v k="text" '{n=split($0,a,","); for (i=1; i<=n; i++) print a[i]}' | sed 's/\"\:\"/\|/g' | sed 's/[\,]/ /g' | sed 's/\"//g' | grep -w $prop | cut -d":" -f2| sed -e 's/^ *//g' -e 's/ *$//g' `
    version=${temp##*|}
}

json=package.json
prop='version'

jsonval

if [ "$TRAVIS_PULL_REQUEST" != "false" ] && [ "$TRAVIS_REPO_SLUG" == 1c-syntax* ]; then
    sonar-scanner \
      -Dsonar.projectKey=vsc-language-bsl-plugin \
      -Dsonar.organization=1c-syntax \
      -Dsonar.host.url=https://sonarcloud.io \
      -Dsonar.analysis.mode=issues \
      -Dsonar.github.pullRequest=$TRAVIS_PULL_REQUEST \
      -Dsonar.github.repository=$TRAVIS_REPO_SLUG \
      -Dsonar.github.oauth=$GITHUB_TOKEN \
      -Dsonar.login=$SONAR_OAUTH \
      -Dsonar.branch.name=$TRAVIS_PULL_REQUEST_BRANCH \
      -Dsonar.branch.target=$TRAVIS_BRANCH \
      -Dsonar.scanner.skip=false

elif [ "$TRAVIS_BRANCH" == "develop" ] && [ "$TRAVIS_PULL_REQUEST" == "false" ]; then
    sonar-scanner \
    -Dsonar.projectKey=vsc-language-bsl-plugin \
    -Dsonar.organization=1c-syntax \
    -Dsonar.host.url=https://sonarcloud.io \
    -Dsonar.projectVersion=$version \
    -Dsonar.login=$SONAR_OAUTH \
    -Dsonar.branch.name=$TRAVIS_BRANCH \
    -Dsonar.scanner.skip=false
fi

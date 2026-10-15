#!/bin/sh
source ./VERSION
cd node
docker build -t docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/node:$VERSION .
docker push docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/node:$VERSION
echo "Backend Complete"
read -n 1 -s
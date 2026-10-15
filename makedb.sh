#!/bin/sh
source ./VERSION
cd database
docker build -t docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/database:$VERSION .
docker push docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/database:$VERSION
read -n 1 -s

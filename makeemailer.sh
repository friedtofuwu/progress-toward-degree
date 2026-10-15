#!/bin/sh
source ./VERSION
cd emailer
docker build -t docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/emailer:$VERSION .
docker push docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/emailer:$VERSION
read -n 1 -s
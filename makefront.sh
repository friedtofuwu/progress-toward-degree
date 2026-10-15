#!/bin/sh
source ./VERSION
cd react
docker build -t docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/react:$VERSION .
docker push docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/react:$VERSION
echo "Frontend Complete"
read -n 1 -s
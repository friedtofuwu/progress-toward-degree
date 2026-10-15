#!/bin/sh
cd ttupdater
docker build -t docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/ttupdater:test9 .
docker push docker.cs.vt.edu/83586f25-quattro/progress-toward-degree/ttupdater:test9
read -n 1 -s
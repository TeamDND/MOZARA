#!/bin/bash

# MOZARA 프로젝트 배포 스크립트 (루트)
# docker 폴더의 실제 배포 스크립트를 호출합니다.

echo "📁 Docker 폴더로 이동하여 배포를 시작합니다..."

# docker 폴더의 deploy.sh 실행
cd docker && ./deploy.sh
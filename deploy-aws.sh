#!/bin/bash

# MOZARA 프로젝트 AWS 배포 스크립트 (루트)
# docker 폴더의 AWS 배포 스크립트를 호출합니다.

echo "☁️ AWS 배포를 시작합니다..."

# docker 폴더의 deploy-aws.sh 실행
cd docker && ./deploy-aws.sh

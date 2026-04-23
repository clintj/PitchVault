#!/bin/bash
set -e

# Configuration
PROJECT_NAME="pitchvault"
REGION=$(aws configure get region)
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Parameters (Change these or pass as env vars)
DOMAIN_NAME=${DOMAIN_NAME:-"pitchvault.example.com"}
CERTIFICATE_ARN=${CERTIFICATE_ARN:-""}

if [ -z "$CERTIFICATE_ARN" ]; then
    echo "ERROR: CERTIFICATE_ARN is required. Please provide an ACM Certificate ARN."
    exit 1
fi

echo "--- Preparing ECR Repositories ---"
aws ecr create-repository --repository-name ${PROJECT_NAME}-backend --region ${REGION} || true
aws ecr create-repository --repository-name ${PROJECT_NAME}-frontend --region ${REGION} || true

echo "--- Logging into ECR ---"
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

echo "--- Building and Pushing Backend ---"
docker build -t ${PROJECT_NAME}-backend ./backend
docker tag ${PROJECT_NAME}-backend:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-backend:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-backend:latest

echo "--- Building and Pushing Frontend ---"
docker build -t ${PROJECT_NAME}-frontend -f ./frontend/Dockerfile.prod ./frontend
docker tag ${PROJECT_NAME}-frontend:latest ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-frontend:latest
docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-frontend:latest

echo "--- Deploying CloudFormation Stack ---"
aws cloudformation deploy \
    --stack-name ${PROJECT_NAME}-stack \
    --template-file aws/cloudformation.json \
    --parameter-overrides \
        ProjectName=${PROJECT_NAME} \
        DomainName=${DOMAIN_NAME} \
        CertificateArn=${CERTIFICATE_ARN} \
    --capabilities CAPABILITY_IAM

echo "--- Deployment Complete ---"
ALB_DNS=$(aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-stack --query "Stacks[0].Outputs[?OutputKey=='ALBDNSName'].OutputValue" --output text)
ADMIN_PASSWORD_ARN=$(aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-stack --query "Stacks[0].Outputs[?OutputKey=='AdminPasswordArn'].OutputValue" --output text)

echo "--------------------------------------------------------"
echo "Application URL: https://${DOMAIN_NAME}"
echo "ALB DNS Name: ${ALB_DNS}"
echo "Admin Password Secret ARN: ${ADMIN_PASSWORD_ARN}"
echo "--------------------------------------------------------"
echo "Next Steps:"
echo "1. Create a CNAME record in your DNS provider:"
echo "   ${DOMAIN_NAME} -> ${ALB_DNS}"
echo "2. Retrieve your random admin password:"
echo "   aws secretsmanager get-secret-value --secret-id ${ADMIN_PASSWORD_ARN} --query SecretString --output text"
echo "--------------------------------------------------------"

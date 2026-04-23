#!/bin/bash

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_NAME="PitchVault"
REGION=${AWS_REGION:-"us-east-1"}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

# Parameters
DOMAIN_NAME=${1:-""}
CERTIFICATE_ARN=${2:-""}
ENVIRONMENT=${3:-"production"}

# Validation
if [ -z "$DOMAIN_NAME" ] || [ -z "$CERTIFICATE_ARN" ]; then
    echo -e "${RED}Usage: ./deploy.sh <domain-name> <certificate-arn> [environment]${NC}"
    echo -e "${YELLOW}Example:${NC} ./deploy.sh pitchvault.example.com arn:aws:acm:us-east-1:123456789012:certificate/xxx production"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         PitchVault AWS Deployment Script              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${GREEN}Configuration:${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Domain: $DOMAIN_NAME"
echo "  Environment: $ENVIRONMENT"
echo "  Region: $REGION"
echo "  Account: $ACCOUNT_ID"

# Step 1: ECR repositories
echo -e "\n${YELLOW}[1/7] Creating ECR repositories...${NC}"
for repo in pitchvault-backend pitchvault-frontend; do
    aws ecr create-repository \
        --repository-name "$repo" \
        --region "$REGION" \
        --image-scanning-configuration scanOnPush=true 2>/dev/null || echo "  ✓ $repo already exists"
done

# Step 2: ECR login
echo -e "\n${YELLOW}[2/7] Logging in to ECR...${NC}"
aws ecr get-login-password --region "$REGION" | \
    docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Step 3: Backend
echo -e "\n${YELLOW}[3/7] Building and pushing backend image...${NC}"
cd "$(dirname "$0")/../backend"
docker build -t pitchvault-backend:latest .
docker tag pitchvault-backend:latest "${ECR_REGISTRY}/pitchvault-backend:latest"
docker push "${ECR_REGISTRY}/pitchvault-backend:latest"

# Step 4: Frontend
echo -e "\n${YELLOW}[4/7] Building and pushing frontend image...${NC}"
cd "$(dirname "$0")/../frontend"
docker build -f Dockerfile.prod -t pitchvault-frontend:latest .
docker tag pitchvault-frontend:latest "${ECR_REGISTRY}/pitchvault-frontend:latest"
docker push "${ECR_REGISTRY}/pitchvault-frontend:latest"

# Step 5: CloudFormation
cd "$(dirname "$0")"
echo -e "\n${YELLOW}[5/7] Deploying CloudFormation stack...${NC}"

STACK_NAME="${PROJECT_NAME}-${ENVIRONMENT}"

if aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" 2>/dev/null; then
    echo "  Updating existing stack..."
    aws cloudformation update-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://cloudformation.json \
        --parameters \
            ParameterKey=DomainName,ParameterValue="$DOMAIN_NAME" \
            ParameterKey=CertificateArn,ParameterValue="$CERTIFICATE_ARN" \
            ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
            ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
else
    echo "  Creating new stack..."
    aws cloudformation create-stack \
        --stack-name "$STACK_NAME" \
        --template-body file://cloudformation.json \
        --parameters \
            ParameterKey=DomainName,ParameterValue="$DOMAIN_NAME" \
            ParameterKey=CertificateArn,ParameterValue="$CERTIFICATE_ARN" \
            ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
            ParameterKey=ProjectName,ParameterValue="$PROJECT_NAME" \
        --capabilities CAPABILITY_NAMED_IAM \
        --region "$REGION"
fi

# Step 6: Wait for completion
echo -e "\n${YELLOW}[6/7] Waiting for stack deployment (5-10 minutes)...${NC}"
for i in {1..60}; do
    STATUS=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$REGION" \
        --query 'Stacks[0].StackStatus' \
        --output text 2>/dev/null || echo "")

    if [[ "$STATUS" == *"COMPLETE"* ]] && [[ "$STATUS" != *"IN_PROGRESS"* ]]; then
        break
    fi
    echo -n "."
    sleep 10
done
echo ""

# Step 7: Get outputs
echo -e "\n${YELLOW}[7/7] Retrieving deployment information...${NC}"

STACK_INFO=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION")

ALB_DNS=$(echo "$STACK_INFO" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="ALBDNSName") | .OutputValue')
ADMIN_SECRET=$(echo "$STACK_INFO" | jq -r '.Stacks[0].Outputs[] | select(.OutputKey=="AdminPasswordArn") | .OutputValue')

# Summary
echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              DEPLOYMENT SUCCESSFUL! 🎉                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${BLUE}Application Details:${NC}"
echo "  URL: https://${DOMAIN_NAME}"
echo "  ALB DNS: ${ALB_DNS}"
echo "  Stack: ${STACK_NAME}"

echo -e "\n${BLUE}Next Steps:${NC}"
echo "  1. Add DNS CNAME record:"
echo "     ${YELLOW}${DOMAIN_NAME} CNAME ${ALB_DNS}${NC}"
echo ""
echo "  2. Retrieve admin password:"
echo "     ${YELLOW}aws secretsmanager get-secret-value --secret-id ${ADMIN_SECRET} --region ${REGION} --query SecretString --output text${NC}"
echo ""
echo "  3. Monitor logs:"
echo "     ${YELLOW}aws logs tail /ecs/${PROJECT_NAME}-Backend --follow --region ${REGION}${NC}"

echo -e "\n${BLUE}Documentation:${NC}"
echo "  See DEPLOYMENT.md for detailed instructions and troubleshooting"
echo ""

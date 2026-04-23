# PitchVault AWS Deployment Guide

## Option 1: Simple One-Click Deployment (Recommended for Quick Setup)

### Use AWS Amplify (Easiest)
**Best for**: Simple setup, CI/CD built-in, static frontend hosting

```bash
# 1. Connect your GitHub repo to AWS Amplify
# Go to: https://console.aws.amazon.com/amplify/

# 2. Select "New app" → "Host web app"
# 3. Choose GitHub, connect account
# 4. Select PitchVault repository
# 5. Amplify auto-detects your frontend

# 6. Add backend environment variables:
# GEMINI_API_KEY=your_key
# DATABASE_URL=your_db_url
```

**Pros**: Automatic deployments on git push, free SSL, built-in CDN
**Cons**: Limited backend customization

---

## Option 2: CloudFormation Full Stack (Recommended for Production)

### Prerequisites
```bash
# Install AWS CLI v2
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Configure AWS credentials
aws configure
# Enter: AWS Access Key ID, Secret Access Key, Region (us-east-1), Output (json)
```

### Step 1: Build and Push Docker Images to ECR

```bash
# 1. Create ECR repositories
aws ecr create-repository --repository-name pitchvault-backend
aws ecr create-repository --repository-name pitchvault-frontend

# 2. Login to ECR
aws ecr get-login-password --region us-east-1 | docker login \
  --username AWS \
  --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com

# 3. Build backend image
cd backend
docker build -t pitchvault-backend:latest .
docker tag pitchvault-backend:latest \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/pitchvault-backend:latest
docker push \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/pitchvault-backend:latest
cd ..

# 4. Build frontend image
cd frontend
docker build -f Dockerfile.prod -t pitchvault-frontend:latest .
docker tag pitchvault-frontend:latest \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/pitchvault-frontend:latest
docker push \
  $(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/pitchvault-frontend:latest
cd ..
```

### Step 2: Create ACM Certificate (for HTTPS)

```bash
# Request a certificate for your domain
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS \
  --region us-east-1

# Note the Certificate ARN from the output
# You'll need to validate it by adding DNS records (AWS guides you)
```

### Step 3: Deploy CloudFormation Stack

```bash
# Create the stack
aws cloudformation create-stack \
  --stack-name pitchvault-stack \
  --template-body file://aws/cloudformation.json \
  --parameters \
    ParameterKey=DomainName,ParameterValue=yourdomain.com \
    ParameterKey=CertificateArn,ParameterValue=arn:aws:acm:... \
    ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# Wait for completion (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name pitchvault-stack \
  --region us-east-1

# Get the Load Balancer DNS name
aws cloudformation describe-stacks \
  --stack-name pitchvault-stack \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[0].OutputValue'
```

### Step 4: Configure Domain DNS

```bash
# Point your domain to the ALB
# Add a CNAME record to your domain registrar:
# Type: CNAME
# Name: yourdomain.com (or www.yourdomain.com)
# Value: <ALB-DNS-Name-from-output>

# Wait 5-15 minutes for DNS propagation
nslookup yourdomain.com
```

### Step 5: Get Admin Password

```bash
aws secretsmanager get-secret-value \
  --secret-id PitchVault/production/AdminPassword \
  --region us-east-1 \
  --query SecretString \
  --output text
```

**Done!** Your app is live at `https://yourdomain.com`

---

## Option 3: Docker Compose (Local/Testing)

```bash
# 1. Set environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 2. Start all services
docker-compose up -d

# 3. Access the app
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# Docs: http://localhost:8000/docs

# 4. Stop services
docker-compose down
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet (HTTPS)                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────▼─────────────┐
        │  AWS ALB (Load Balancer) │ (1 unit)
        └────────────┬─────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
   ┌────▼─────┐              ┌────▼─────┐
   │ Frontend  │              │ Backend   │
   │ ECS Srv   │              │ ECS Srv   │
   │ (1 task)  │              │ (1 task)  │
   └────┬─────┘              └────┬─────┘
        │                         │
   ┌────▼─────────────────────┴──┐│
   │  VPC (Virtual Network)       │
   │  ├─ Public Subnets (2)       │
   │  └─ Private Subnets (2)      │
   │     ├─ RDS PostgreSQL        │
   │     └─ Redis ElastiCache     │
   └──────────────────────────────┘
```

---

## Monitoring & Logs

```bash
# View ECS logs
aws logs tail /ecs/PitchVault-Backend --follow
aws logs tail /ecs/PitchVault-Frontend --follow

# Check ECS service status
aws ecs describe-services \
  --cluster PitchVault-production \
  --services backend frontend

# Scale services (if needed)
aws ecs update-service \
  --cluster PitchVault-production \
  --service backend \
  --desired-count 2
```

---

## Cost Estimation (Monthly)

- **ALB**: ~$16
- **ECS Fargate** (256 CPU, 512 MB): ~$5 per task × 2 = $10
- **RDS (db.t3.micro)**: ~$10
- **ElastiCache (cache.t3.micro)**: ~$3
- **NAT Gateway**: ~$32
- **Data Transfer**: ~$5

**Total**: ~$76/month (minimal usage)

---

## Cleanup (Delete Stack)

```bash
# Delete the CloudFormation stack
aws cloudformation delete-stack \
  --stack-name pitchvault-stack \
  --region us-east-1

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name pitchvault-stack \
  --region us-east-1

# Delete ECR repositories
aws ecr delete-repository \
  --repository-name pitchvault-backend \
  --force

aws ecr delete-repository \
  --repository-name pitchvault-frontend \
  --force
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Tasks failing to start | Check ECS logs: `aws logs tail /ecs/PitchVault-*` |
| Database connection error | Verify RDS security group allows ECS traffic on port 5432 |
| Frontend not loading | Check ALB listener rules, ensure frontend health check passing |
| Certificate validation failed | Add DNS record to domain registrar |
| High costs | Scale down to 1 task, switch to db.t3.micro |

---

## Next Steps

1. **For Development**: Use Docker Compose (Option 3)
2. **For Production**: Use CloudFormation (Option 2)
3. **For Quick Demo**: Use Amplify (Option 1)

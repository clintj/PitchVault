# AWS Deployment

This directory contains files for deploying PitchVault to AWS.

## Quick Start

### Prerequisites
- AWS CLI v2 installed and configured
- Docker installed
- A domain name
- An ACM Certificate ARN (see steps below)

### One-Command Deploy

```bash
# Get your certificate ARN first
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS

# Then run deploy script
./deploy.sh yourdomain.com arn:aws:acm:region:account:certificate/id production
```

The script will:
1. Create ECR repositories
2. Build and push Docker images
3. Deploy CloudFormation stack
4. Output deployment information

## Files

- **cloudformation.json** - Infrastructure as Code template (ECS, RDS, Redis, ALB)
- **cloudformation.yml** - Same template in YAML format
- **deploy.sh** - Automated deployment script
- **README.md** - This file

## Manual Deployment

If you prefer to deploy manually, see [DEPLOYMENT.md](../DEPLOYMENT.md) for step-by-step instructions.

## Architecture

The CloudFormation template deploys:

```
┌──────────────────┐
│   Internet (443) │
└────────┬─────────┘
         │
    ┌────▼──────────┐
    │  ALB + HTTPS  │
    └────┬──────────┘
         │
    ┌────┴───────────────┐
    │                    │
 ┌──▼──┐            ┌──▼──┐
 │Front│            │Back │
 │  -  │            │  -  │
 │ end │            │ end │
 └────┬┘            └──┬──┘
      │                │
   ┌──┴────────────────┴─┐
   │  VPC + Subnets      │
   │  ├─ RDS PostgreSQL  │
   │  └─ Redis Cache     │
   └─────────────────────┘
```

## Costs

Approximate monthly costs:
- ALB: $16
- ECS Fargate: $10
- RDS: $10
- ElastiCache: $3
- NAT: $32
- Data Transfer: ~$5

**Total: ~$76/month** (minimal usage)

## Environment Variables

The deployment sets these automatically:

```
POSTGRES_SERVER    -> RDS endpoint
POSTGRES_USER      -> postgres
POSTGRES_DB        -> pitchvault
REDIS_URL          -> ElastiCache endpoint
BACKEND_URL        -> Your domain
FRONTEND_URL       -> Your domain
```

Secrets are stored in AWS Secrets Manager:
- `PitchVault/production/DBPassword`
- `PitchVault/production/AdminPassword`

## Monitoring

```bash
# View backend logs
aws logs tail /ecs/PitchVault-Backend --follow

# View frontend logs
aws logs tail /ecs/PitchVault-Frontend --follow

# Check service status
aws ecs describe-services \
  --cluster PitchVault-production \
  --services backend frontend
```

## Cleanup

```bash
# Delete the entire stack
aws cloudformation delete-stack --stack-name PitchVault-production

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name PitchVault-production

# Delete ECR repositories
aws ecr delete-repository --repository-name pitchvault-backend --force
aws ecr delete-repository --repository-name pitchvault-frontend --force
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Images failing to push | Check Docker login: `docker info` |
| Stack creation fails | Review CloudFormation events: `aws cloudformation describe-stack-events --stack-name PitchVault-production` |
| App won't start | Check logs: `aws logs tail /ecs/PitchVault-Backend` |
| High costs | Scale down: `aws ecs update-service --cluster PitchVault-production --service backend --desired-count 1` |

## Support

For detailed instructions, see [DEPLOYMENT.md](../DEPLOYMENT.md)

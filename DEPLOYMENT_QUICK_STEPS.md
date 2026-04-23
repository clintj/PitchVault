# PitchVault Deployment - Quick Steps

## 🚀 Choose Your Deployment Method

### Option A: **Fastest (Amplify) - 5 minutes**
Best for demos and quick testing
```bash
1. Go to: https://console.aws.amazon.com/amplify/
2. Click "New app" → "Host web app"
3. Connect GitHub, select PitchVault repo
4. Amplify auto-configures frontend
5. Done! Auto-deploys on git push
```
**Cost**: Free tier includes free builds and hosting

---

### Option B: **Production Ready (CloudFormation) - 15 minutes**
Best for real applications with backend + database

```bash
# Step 1: Install AWS CLI (if not already installed)
# https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html

# Step 2: Configure AWS credentials
aws configure
# Enter: Access Key, Secret Key, Region (us-east-1), Output (json)

# Step 3: Get your certificate ARN
aws acm request-certificate \
  --domain-name yourdomain.com \
  --subject-alternative-names www.yourdomain.com \
  --validation-method DNS

# Note the Certificate ARN from the output

# Step 4: Run the deployment script
cd PitchVault/aws
./deploy.sh yourdomain.com arn:aws:acm:us-east-1:123456789012:certificate/xxx

# Step 5: Add DNS CNAME record (shown in script output)
# In your domain registrar, add:
# Type: CNAME
# Name: yourdomain.com
# Value: <ALB-DNS-from-script-output>

# Step 6: Get admin password
aws secretsmanager get-secret-value \
  --secret-id PitchVault/production/AdminPassword \
  --region us-east-1 \
  --query SecretString --output text

# 🎉 Done! Your app is live at https://yourdomain.com
```

**Cost**: ~$76/month (ALB, ECS, RDS, Redis, NAT)

---

### Option C: **Local Testing (Docker Compose) - 2 minutes**
For development and testing

```bash
# Step 1: Setup environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Step 2: Start services
docker-compose up -d

# Step 3: Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# API Docs: http://localhost:8000/docs

# Stop services
docker-compose down
```

**Cost**: Free (local only)

---

## 📋 Comparison

| Feature | Amplify | CloudFormation | Docker Compose |
|---------|---------|-----------------|-----------------|
| Time to Deploy | 5 min | 15 min | 2 min |
| Best For | Demos/Quick | Production | Development |
| Cost | Free tier | ~$76/mo | Free |
| Database | Optional | PostgreSQL ✓ | PostgreSQL ✓ |
| Cache | No | Redis ✓ | Redis ✓ |
| SSL/HTTPS | ✓ | ✓ | No |
| Auto-scaling | ✓ | Manual | No |
| Monitoring | ✓ | CloudWatch | Docker |

---

## 🔍 What Gets Deployed (CloudFormation)

```
✓ VPC with public & private subnets
✓ ALB (Application Load Balancer) with HTTPS
✓ ECS Fargate containers for frontend & backend
✓ RDS PostgreSQL database
✓ ElastiCache Redis for caching
✓ Secrets Manager for passwords
✓ IAM roles for security
✓ Auto-generated admin password
```

---

## ⚠️ Important Reminders

1. **SSL Certificate**: You need an ACM certificate before deploying
   - Domain must be verified via DNS
   - Takes 5-15 minutes to validate

2. **DNS Setup**: After deployment, add a CNAME record
   - Without it, your domain won't point to the app

3. **Credentials**: Keep your AWS credentials secure
   - Never commit `.aws/credentials` to git
   - Use `aws configure` to set credentials

4. **Costs**: Monitor your AWS bill
   - NAT Gateway is the biggest cost (~$32/mo)
   - Scale down to save money if needed

---

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Certificate not found" | Create certificate with `aws acm request-certificate` |
| Images won't push | Check Docker: `docker login` to ECR first |
| App won't start | Check logs: `aws logs tail /ecs/PitchVault-Backend` |
| Can't access domain | Wait for DNS propagation (5-15 min) |
| High AWS bills | Scale down ECS tasks or remove unused resources |

---

## 📞 Need Help?

1. **Detailed Guide**: See `DEPLOYMENT.md`
2. **AWS CLI Setup**: See `aws/README.md`
3. **Architecture Diagram**: See `DEPLOYMENT.md`
4. **Cost Calculator**: AWS Pricing Calculator

---

## ✅ Verification Checklist

After deployment:
- [ ] AWS account is configured
- [ ] Docker images are built and pushed to ECR
- [ ] CloudFormation stack is created
- [ ] DNS CNAME record is added
- [ ] App is accessible at https://yourdomain.com
- [ ] Admin password has been retrieved
- [ ] Backend health check is passing
- [ ] Database connection is working

---

**Recommended**: Start with Option A (Amplify) for quick testing, then move to Option B (CloudFormation) for production.

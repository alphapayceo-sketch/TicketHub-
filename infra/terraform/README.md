Quick Terraform skeleton for testing deployment (ECR, ECS/Fargate, Secrets)

Prerequisites
- AWS CLI configured (`aws configure`)
- Terraform installed
- Your AWS account must have permissions to create ECR, ECS, IAM, Secrets Manager, CloudWatch, and security groups.

Steps
1. Initialize Terraform
```bash
cd infra/terraform
terraform init
```

2. Review plan
```bash
terraform plan -out plan.tfplan
```

3. Apply
```bash
terraform apply "plan.tfplan"
```

4. Build and push Docker image to ECR
- Get the ECR URL from `terraform output ecr_repository_url`
- Build and push (replace <account> and <region> accordingly):
```bash
docker build -t tickethub-backend:latest .
aws ecr get-login-password --region ${AWS_REGION:-us-east-1} | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker tag tickethub-backend:latest <account>.dkr.ecr.<region>.amazonaws.com/tickethub-backend:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/tickethub-backend:latest
```

5. Set secret values
- Create a Secrets Manager secret for the Firebase service account JSON. Example CLI:
```bash
aws secretsmanager create-secret --name tickethub/firebase --secret-string file://path/to/serviceAccountKey.json
```
- Update the `tickethub/app` secret with DB host/creds and `JWT_SECRET` (you can use `aws secretsmanager put-secret-value`)

6. Update ECS service
- After pushing image, update the Terraform variable `image_tag` or update the ECS task definition image and redeploy (terraform apply).

Notes
- This is a minimal skeleton for testing. For production you should provision a private RDS, configure subnet groups, enable secure networking, and restrict ingress rules.
- If you want, I can expand this to create RDS automatically and wire the DB secret into Secrets Manager.

# tools-website Docker Deployment

This project is a static site served by `nginx` in Docker.

## 1. Build locally

```bash
cd /Users/chethan/Desktop/projects/tools-website
docker build -t tools-website:latest .
```

## 2. Run locally

```bash
docker run --rm -p 8080:80 tools-website:latest
```

Open: `http://localhost:8080`

## 3. Deploy to EC2 (direct image transfer)

### On your local machine

```bash
docker save tools-website:latest | gzip > tools-website.tar.gz
scp -i /path/to/your-key.pem tools-website.tar.gz ec2-user@<EC2_PUBLIC_IP>:/home/ec2-user/
```

### On EC2

```bash
gunzip -c /home/ec2-user/tools-website.tar.gz | docker load
docker stop tools-website || true
docker rm tools-website || true
docker run -d \
  --name tools-website \
  --restart unless-stopped \
  -p 80:80 \
  tools-website:latest
```

## 4. Optional: Deploy via ECR

```bash
aws ecr get-login-password --region <AWS_REGION> | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com
docker tag tools-website:latest <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/tools-website:latest
docker push <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/tools-website:latest
```

Then pull and run on EC2:

```bash
docker pull <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/tools-website:latest
docker stop tools-website || true
docker rm tools-website || true
docker run -d \
  --name tools-website \
  --restart unless-stopped \
  -p 80:80 \
  <ACCOUNT_ID>.dkr.ecr.<AWS_REGION>.amazonaws.com/tools-website:latest
```

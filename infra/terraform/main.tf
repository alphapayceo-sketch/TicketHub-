resource "aws_ecr_repository" "app" {
  name = var.ecr_repository_name
}

resource "aws_ecs_cluster" "this" {
  name = "tickethub-cluster"
}

# Task execution role
resource "aws_iam_role" "ecs_task_execution" {
  name = "tickethub-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_assume_role.json
}

data "aws_iam_policy_document" "ecs_task_assume_role" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_policy" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Secrets for the app and firebase JSON (set values locally with terraform or via console)
resource "aws_secretsmanager_secret" "app_secret" {
  name = "tickethub/app"
}

resource "aws_secretsmanager_secret_version" "app_secret_version" {
  secret_id     = aws_secretsmanager_secret.app_secret.id
  secret_string = jsonencode({
    JWT_SECRET = "${random_password.jwt.result}",
    DB_HOST    = "",
    DB_PORT    = "",
    DB_USER    = "",
    DB_PASSWORD= "",
    DB_NAME    = ""
  })
}

resource "random_password" "jwt" {
  length  = 24
  special = true
}

resource "aws_secretsmanager_secret" "firebase_secret" {
  name = "tickethub/firebase"
}

# You should create a secret version with the service account JSON (string) via console or CLI,
# or set `aws_secretsmanager_secret_version.firebase_secret_version` by importing your JSON.

# ECS task definition
data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

resource "aws_ecs_task_definition" "app" {
  family                   = "tickethub-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "tickethub"
      image     = "${aws_ecr_repository.app.repository_url}:${var.image_tag}"
      portMappings = [ { containerPort = var.container_port, protocol = "tcp" } ]
      essential = true
      environment = []
      secrets = [
        { name = "FIREBASE_SERVICE_ACCOUNT_JSON", valueFrom = aws_secretsmanager_secret.firebase_secret.arn },
        { name = "APP_SECRETS", valueFrom = aws_secretsmanager_secret.app_secret.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/tickethub"
          awslogs-region        = data.aws_region.current.name
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/tickethub"
  retention_in_days = 7
}

# ECS service (assumes you will create or provide a VPC + subnets)
resource "aws_ecs_service" "app" {
  name            = "tickethub-service"
  cluster         = aws_ecs_cluster.this.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.service_desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = data.aws_subnets.default.ids
    assign_public_ip = true
    security_groups = [aws_security_group.ecs_sg.id]
  }

  depends_on = [aws_cloudwatch_log_group.ecs]
}

# Use default VPC/subnets for quick testing
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "ecs_sg" {
  name   = "tickethub-ecs-sg"
  vpc_id = data.aws_vpc.default.id

  ingress {
    from_port   = var.container_port
    to_port     = var.container_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

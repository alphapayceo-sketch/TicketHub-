output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.this.name
}

output "ecs_task_definition" {
  value = aws_ecs_task_definition.app.arn
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app_secret.arn
}

output "firebase_secret_arn" {
  value = aws_secretsmanager_secret.firebase_secret.arn
}

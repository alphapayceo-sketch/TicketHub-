variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "ecr_repository_name" {
  description = "ECR repository name"
  type        = string
  default     = "tickethub-backend"
}

variable "container_port" {
  description = "Port the container exposes"
  type        = number
  default     = 3000
}

variable "image_tag" {
  description = "Image tag to deploy (push image to ECR and set this)"
  type        = string
  default     = "latest"
}

variable "service_desired_count" {
  type    = number
  default = 1
}

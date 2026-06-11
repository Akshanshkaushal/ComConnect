variable "aws_region" {
  description = "AWS region for the deployment."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "production"
}

variable "image_tag" {
  description = "Container image tag deployed by ECS."
  type        = string
  default     = "latest"
}

variable "desired_count" {
  description = "Desired task count for each service."
  type        = number
  default     = 1
}

variable "mongo_uri" {
  description = "MongoDB Atlas connection URI."
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "LLM provider API key used by the LangChain AI service."
  type        = string
  sensitive   = true
  default     = ""
}

variable "kafka_broker" {
  description = "Comma-separated external Kafka bootstrap brokers."
  type        = string
  sensitive   = true
}

variable "kafka_username" {
  description = "Kafka SASL username."
  type        = string
  sensitive   = true
  default     = ""
}

variable "kafka_password" {
  description = "Kafka SASL password."
  type        = string
  sensitive   = true
  default     = ""
}

variable "firebase_service_account_json" {
  description = "Firebase service account JSON."
  type        = string
  sensitive   = true
  default     = ""
}

variable "cors_origin" {
  description = "Additional allowed frontend origin. CloudFront is always the primary origin."
  type        = string
  default     = "*"
}

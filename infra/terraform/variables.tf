variable "aws_region" {
  description = "AWS region for deployment"
  default     = "ap-south-1"
}

variable "ami_id" {
  description = "Ubuntu 22.04 AMI ID for ap-south-1"
  default     = "ami-0dee22c13ea7a9a67"
}

variable "instance_type" {
  description = "EC2 instance type"
  default     = "t2.micro"
}

variable "key_name" {
  description = "Name of the key pair (already uploaded to AWS)"
  default     = "revuhub.pem"
}

pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        AWS_ACCOUNT_ID = credentials('aws_account_id')
        AWS_ACCESS_KEY_ID = credentials('aws_access_key_id')
        AWS_SECRET_ACCESS_KEY = credentials('aws_secret_access_key')
        SSH_KEY = credentials('revuhub-key') // Your EC2 key
    }

    stages {
        stage('Terraform Apply') {
            steps {
                dir('infra/terraform') {
                    sh 'terraform init'
                    sh 'terraform apply -auto-approve'
                    script {
                        // Get EC2 public IP dynamically
                        env.EC2_IP = sh(script: "terraform output -raw ec2_public_ip", returnStdout: true).trim()
                        echo "EC2 IP: ${env.EC2_IP}"
                    }
                }
            }
        }

        stage('Prepare Ansible Inventory') {
            steps {
                script {
                    sh """
                        mkdir -p infra/ansible
                        echo "[web]" > infra/ansible/hosts.ini
                        echo "${env.EC2_IP} ansible_user=ubuntu ansible_ssh_private_key_file=${SSH_KEY} ansible_ssh_common_args='-o StrictHostKeyChecking=no'" >> infra/ansible/hosts.ini
                        cat infra/ansible/hosts.ini
                    """
                }
            }
        }

        stage('Build & Push Docker Images') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                    # create repos if they don't exist
                    aws ecr describe-repositories --repository-names node-app || aws ecr create-repository --repository-name node-app --region ${AWS_REGION}
                    aws ecr describe-repositories --repository-names nginx-custom || aws ecr create-repository --repository-name nginx-custom --region ${AWS_REGION}
                    
                    docker build -t node-app .
                    docker tag node-app:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/node-app:latest
                    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/node-app:latest

                    docker build -t nginx-custom ./nginx
                    docker tag nginx-custom:latest ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/nginx-custom:latest
                    docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/nginx-custom:latest
                """
            }
        }

        stage('Deploy via Ansible') {
            steps {
                sh """
                    ansible-playbook infra/ansible/install-docker.yml -i infra/ansible/hosts.ini \
                    --extra-vars "aws_region=${AWS_REGION} aws_account_id=${AWS_ACCOUNT_ID} node_repo_name=node-app nginx_repo_name=nginx-custom"
                """
            }
        }
    }
}

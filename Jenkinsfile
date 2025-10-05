pipeline {
    agent any

    environment {
        AWS_REGION = "ap-south-1"
        AWS_ACCOUNT_ID = credentials('aws_account_id')
        AWS_ACCESS_KEY_ID = credentials('aws_access_key_id')
        AWS_SECRET_ACCESS_KEY = credentials('aws_secret_access_key')
        NODE_REPO_NAME = "node-app"
        NGINX_REPO_NAME = "nginx-custom"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Terraform Apply') {
            steps {
                dir('infra/terraform') {
                    sh '''
                    terraform init
                    terraform apply -auto-approve

                    # Save EC2 public IP to a temporary file
                    terraform output -raw public_ip > ../../ansible/ec2_ip.txt
                    '''
                }
            }
        }

        stage('Prepare Ansible Inventory') {
            steps {
                script {
                    def ec2_ip = readFile('ansible/ec2_ip.txt').trim()

                    // Inject SSH key from Jenkins credentials
                    withCredentials([sshUserPrivateKey(credentialsId: 'revuhub-key', keyFileVariable: 'SSH_KEY')]) {
                        sh """
                        echo "[web]" > ansible/hosts.ini
                        echo "${ec2_ip} ansible_user=ubuntu ansible_ssh_private_key_file=${SSH_KEY}" >> ansible/hosts.ini
                        cat ansible/hosts.ini
                        """
                    }
                }
            }
        }

        stage('Build and Push Docker Images to ECR') {
            steps {
                sh '''
                # Login to ECR
                aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

                # Build and push Node app
                docker build -t $NODE_REPO_NAME .
                docker tag $NODE_REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$NODE_REPO_NAME:latest
                docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$NODE_REPO_NAME:latest

                # Build and push Nginx
                docker build -t $NGINX_REPO_NAME ./nginx
                docker tag $NGINX_REPO_NAME:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$NGINX_REPO_NAME:latest
                docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$NGINX_REPO_NAME:latest
                '''
            }
        }

        stage('Deploy via Ansible') {
            steps {
                sh '''
                ansible-playbook ansible/install-docker.yml \
                    -i ansible/hosts.ini \
                    --extra-vars "aws_region=$AWS_REGION aws_account_id=$AWS_ACCOUNT_ID node_repo_name=$NODE_REPO_NAME nginx_repo_name=$NGINX_REPO_NAME"
                '''
            }
        }
    }

    post {
        always {
            echo "Pipeline finished"
        }
    }
}

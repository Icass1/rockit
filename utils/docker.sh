# docker buildx build -t rockit-backend -f backend/Dockerfile .
# docker run --name RockitBackend --user $(id -u icass):$(id -g icass) -p 9090:8000 rockit-backend:latest
# docker rm RockitBackend


# docker buildx build -t rockit -f Dockerfile .
# docker run --name Rockit --user $(id -u icass):$(id -g icass) -p 8080:4321 rockit:latest
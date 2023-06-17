#!/bin/bash
docker run -d -p "27017:27017" --name mongo mongo:latest
export DATABASE_URL=mongodb://localhost/travel-log-api
export DATABASE_NAME=travel-log-api
export SECRET=alskdhiazsdf234234
export CORS=true
npm run dev

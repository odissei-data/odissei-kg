#!/usr/bin/env bash

# Get your TRIPLYDB_TOKEN from your .env file (please do not commit)
USER=odissei
source .env

DATASET="odissi-kg-acceptance" && [[ "$ENV" == "Production" ]] && DATASET="odissei-kg"
API_URI=https://api.kg.odissei.nl/datasets/$USER/$DATASET/jobs

SKOS_FILE=./data/test/skos.rdf 

echo "Uploading to $API_URI"
curl -H "Authorization: Bearer $TRIPLYDB_TOKEN" $API_URI -F file=@$SKOS_FILE

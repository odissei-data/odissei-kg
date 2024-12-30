#!/usr/bin/env bash

# This shell script is no longer used, since it is replaced by
# ./src/reuse_existing_graphs.ts to run it automatically in the gitlab ci/cd pipeline.
#
# To run this script, please clone https://github.com/odissei-data/vocabularies
# in the same parent folder as this repo.
VOCAB_FOLDER=../vocabularies

# Get your TRIPLYDB_TOKEN from your .env file (please do not commit)
source .env

DATASET="odissei-kg-acceptance" && [[ "$ENV" == "Production" ]] && DATASET="odissei-kg"
API_URI=https://api.kg.odissei.nl/datasets/$USER/$DATASET/jobs

SKOS_FILE=$VOCAB_FOLDER/w3c/skos.rdf

echo "Uploading to $API_URI"
curl -H "Authorization: Bearer $TRIPLYDB_TOKEN" $API_URI -F file=@$SKOS_FILE

# sshoc-nl-ontology.github.io
SSHOC-NL ontology

## How the owl file is generated:

1. Run the SPARQL query (https://github.com/firmao/sshoc-nl-ontology/blob/main/ontologyGen.sparql).

2. Save the results in a JSON file.

3. Upload this file to GitHub.

4. You can just run the Python script (https://github.com/firmao/sshoc-nl-ontology/blob/main/GenerateOWLfile.py) with the URL to the JSON file as an input parameter.

The output from the script will be your owl file.

Then you can use it with WIDOCO to generate the ontology documentation.

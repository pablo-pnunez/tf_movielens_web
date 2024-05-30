import pandas as pd
import json

# Cargar los datos de MovieLens
ratings = pd.read_csv('ml-latest-small/ratings.csv').drop(columns=["timestamp"]).sample(frac=.25)


# Convertir a JSON
ratings_json = ratings.to_json(orient='records')

# Guardar en un archivo JSON
with open('ratings.json', 'w') as f:
    f.write(ratings_json)
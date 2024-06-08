import pandas as pd
import json


def pandas_to_json(data, filename):
    # Convertir a JSON
    ratings_json = data.to_dict(orient="list")
    # Guardar en un archivo JSON
    with open(f'{filename}.json', 'w') as f:
        json.dump(ratings_json, f)
    
# Para regresión
# ratings = pd.read_csv('ml-latest-small/ratings.csv').drop(columns=["timestamp"])
# ratings = ratings.rename(columns={"movieId":"m", "userId":"u", "rating":"r"}).sample(frac=.1)
# pandas_to_json(ratings, "data/regression/ratings_train")

# Para ranking
train_ranking = pd.read_csv('data/ranking/pj_train.csv', header=None, names=["u", "b", "w"])
train_ranking = train_ranking -1 # Adaptamos los IDS
pandas_to_json(train_ranking, "data/ranking/train")

test_ranking = pd.read_csv('data/ranking/pj_test.csv', header=None, names=["u", "b", "w"])
test_ranking = test_ranking -1 # Adaptamos los IDS
pandas_to_json(test_ranking, "data/ranking/test")

movies = pd.read_csv('data/ranking/movies.csv')
movies["ID"] = movies["ID"] -1 # Adaptamos los IDS
pandas_to_json(movies, "data/ranking/movies")

info = pd.DataFrame([[train_ranking["u"].max()+1, movies["ID"].max()+1]], columns=["numUsers", "numItems"])
pandas_to_json(info, "data/ranking/info")
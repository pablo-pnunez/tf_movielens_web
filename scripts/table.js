import {console_log} from './console.js';

export const addMoviesToTable = (movies, userData) => {
    const tableBody = document.getElementById('new-user-table-content');
    tableBody.innerHTML = ''; // Limpiar la tabla antes de añadir nuevas filas

    movies.Title.forEach((title, index) => {
        const row = document.createElement('tr');

        const cellIndex = document.createElement('td');
        cellIndex.scope = 'row';
        cellIndex.textContent = index + 1;

        const cellScore = document.createElement('td');
        const scoreSelect = document.createElement('select');
        scoreSelect.className = 'form-select';

        const optionNulo = document.createElement('option');
        optionNulo.value = 0;
        optionNulo.textContent = "No";
        scoreSelect.appendChild(optionNulo);

        for (let i = 1; i <= 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            scoreSelect.appendChild(option);
        }

        // Buscar la puntuación del usuario para esta película
        const movieIndex = userData.movie.indexOf(index);
        if (movieIndex !== -1) {
            scoreSelect.value = userData.score[movieIndex];
        }

        cellScore.appendChild(scoreSelect);

        const cellTitle = document.createElement('td');
        cellTitle.textContent = title;

        const cellPrediction = document.createElement('td');
        cellPrediction.textContent = 'N/D';

        row.appendChild(cellIndex);
        row.appendChild(cellScore);
        row.appendChild(cellTitle);
        row.appendChild(cellPrediction);

        tableBody.appendChild(row);
    });
};    

export const addUserRatingsToTrainingData = (numUsers, trainData) => {
    const tableBody = document.getElementById('new-user-table-content');
    const rows = tableBody.getElementsByTagName('tr');
    let ratings = [];  // formato [(pelicula, valoración), ... ]

    console_log("ESTO NO VALE; HAY QUE CREAR ALGÜN TIPO DE VARIABLE GLOBAL O ALGO; POR QUE SOLO PILLA LA PRIMERA PÄGINA DE LA TABLA");

    for (let row of rows) {
        const movieIndex = row.getElementsByTagName('td')[0].textContent - 1;
        const score = parseInt(row.getElementsByTagName('select')[0].value);
        if (score !== 0) {  // Filtrar puntuaciones nulas
            ratings.push([movieIndex, score]);
        }
    }

    // Si no hay valoraciones, devolver null
    if (ratings.length === 0) {
        console_log("No hay valoraciones para añadir.");
        return { "trainProcessed": trainData, "newUserIndex": null };
    }

    let bestMovies = [];
    let worstMovies = [];
    const newUserIndex = numUsers;  // Nuevo usuario

    for (let i = 0; i < ratings.length - 1; i++) {
        for (let j = i + 1; j < ratings.length; j++) {
            const movie_i = ratings[i][0];
            const score_i = ratings[i][1];
            const movie_j = ratings[j][0];
            const score_j = ratings[j][1];
            if (score_i > score_j) {
                bestMovies.push(movie_i);
                worstMovies.push(movie_j);
            } else if (score_i < score_j) {
                bestMovies.push(movie_j);
                worstMovies.push(movie_i);
            }
        }
    }

    // Crear el nuevo DataFrame
    const newTrainData = {
        u: Array(bestMovies.length).fill(newUserIndex),
        b: bestMovies,
        w: worstMovies
    };

    // Crear la nueva variable combinando los datos originales con los del nuevo usuario
    const combinedTrainData = {
        u: trainData.u.concat(newTrainData.u),
        b: trainData.b.concat(newTrainData.b),
        w: trainData.w.concat(newTrainData.w)
    };

    console_log(`Se añadieron ${ratings.length} valoraciones del usuario ${newUserIndex}.`);

    return { "trainProcessed": combinedTrainData, "newUserIndex": newUserIndex };
};

export const updatePredictions = async (predictions) => {
    console_log("ESTO NO VALE; HAY QUE CREAR ALGÜN TIPO DE VARIABLE GLOBAL O ALGO");

    const tableBody = document.getElementById('new-user-table-content');
    const rows = tableBody.getElementsByTagName('tr');

    for (let row of rows) {
        const movieIndex = row.getElementsByTagName('td')[0].textContent - 1;
        const prediction = predictions[movieIndex].toFixed(2);
        row.getElementsByTagName('td')[3].textContent = prediction;
    }
};

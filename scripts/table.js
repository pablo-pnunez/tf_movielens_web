import {console_log} from './console.js';

const new_user_table_data = { data: [], columns: [ { title: "#" }, { title: "Nota" }, { title: "Título" }, { title: "Predicción" } ] };
let new_user_table = null;

const createDataTable = (disabled=false) => {
    // Crear o recargar el DataTable con los datos actualizados
    if (new_user_table !== null) {
        new_user_table.clear();
        new_user_table.rows.add(new_user_table_data.data);
        new_user_table.draw();
    } else {
        // Crear datatable por primera vez
        new_user_table = $('#new-user-table').DataTable({
            data: new_user_table_data.data,
            columns: new_user_table_data.columns,
            //columnDefs: [{ orderable: false, targets: 1 }],
            dom: 'frtp',
            pagingType: 'simple_numbers',
            responsive: true,
            language: { url: 'es-ES.json' },
            stateSave: true
        });
    }

    // Desactivar o no los inputs
    $('#new-user-table input').prop('disabled', disabled);

    // Agregar eventos de escucha a los inputs
    $('#new-user-table').on('input', 'input', handleInputUpdate);
};

export const addMoviesToTable = (movies, userData) => {
    // Limpiar los datos existentes en new_user_table
    new_user_table_data.data = [];

    // Llenar new_user_table con los datos de las películas y las puntuaciones
    movies.Title.forEach((title, index) => {
        // Buscar la puntuación del usuario para esta película
        const movieIndex = userData.movie.indexOf(index);
        const scoreValue = movieIndex !== -1 ? userData.score[movieIndex] : -1;

        // Crear un input numérico para la puntuación
        const scoreInput = `<span style="display:none">${String(scoreValue).padStart(3, '0')}</span><input type="number" min="-1" max="10" value="${scoreValue}" class="form-control" data-index="${index}"/>`;

        // Crear la fila de datos para la tabla
        new_user_table_data.data.push([ index + 1, scoreInput, title, 'N/D' ]);
    });

    createDataTable();

};

const handleInputUpdate = (event) => {
    const $input = $(event.target);
    const index = $input.closest('tr').find('td:first').text() - 1; // Obtener el índice de la fila
    const newValue = parseInt($input.val());
    const row = new_user_table_data.data[index];

    const span = `<span style="display:none">${String(newValue).padStart(3, "0")}</span>`;

    if (!isNaN(newValue)) {  // Verificar que el valor es un número válido
        row[1] = `${span}<input type="number" min="-1" max="10" value="${newValue}" class="form-control" data-index="${index}"/>`;
    } else {
        row[1] = `${span}<input type="number" min="-1" max="10" value="-1" class="form-control" data-index="${index}"/>`;
    }

    // Actualizar la celda en el DataTable sin recrearlo
    const cell = new_user_table.cell($input.closest('td'));
    cell.data(row[1]).draw(false); // Actualizar la celda y no redibujar toda la tabla
};

export const addUserRatingsToTrainingData = (numUsers, trainData) => {
    let ratings = []; 

    // Recorrer los datos de new_user_table_data para obtener las puntuaciones
    new_user_table_data.data.forEach((row) => {
        const movieIndex = row[0] - 1;
        const scoreInputHtml = row[1];
        const parser = new DOMParser();
        const doc = parser.parseFromString(scoreInputHtml, 'text/html');
        const score = parseInt(doc.querySelector('input').value);

        if (score !== -1) {  // Filtrar puntuaciones nulas
            ratings.push([movieIndex, score]);
        }
    });

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
    // Actualizar las predicciones en new_user_table_data
    new_user_table_data.data.forEach((row, index) => {
        const movieIndex = row[0] - 1;
        if (predictions[movieIndex] !== undefined) {
            row[3] = predictions[movieIndex].toFixed(2);
        }
    });

    createDataTable(true);
};

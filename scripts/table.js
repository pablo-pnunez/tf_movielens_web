import {console_log} from './console.js';

const new_user_table_data = { data: [], columns: [ { title: "#" }, { title: "Nota" }, { title: "Título" }, { title: "Predicción" } ] };
let new_user_table = null;
let table_state = null;

export const createDataTable = (disabled=false) => {
    
    // Desactivar o no los inputs
    //$('#new-user-table input').prop('disabled', disabled);
    activarDesactivarInputs(disabled)
    
    // Obtener el estado guardado, si existe
    if (new_user_table !== null) {
        table_state = new_user_table.state();
    }

    // Crear o recargar el DataTable con los datos actualizados
    if (new_user_table !== null) {
        new_user_table.clear();
        new_user_table.rows.add(new_user_table_data.data);
        new_user_table.draw();

        // Restaurar el estado si estaba guardado
        if (table_state !== null) {
            new_user_table.state.clear();  // Limpiar el estado actual
            new_user_table.state(table_state);   // Aplicar el estado guardado
            new_user_table.draw();         // Redibujar la tabla con el estado restaurado
        }
    } else {
        // Crear datatable por primera vez
        new_user_table = $('#new-user-table').DataTable({
            data: new_user_table_data.data,
            columns: new_user_table_data.columns,
            dom: 'frltp',
            pagingType: 'simple_numbers',
            responsive: true,
            language: { url: 'es-ES.json' },
            stateSave: true
        });
    }

    // Agregar eventos de escucha a los inputs
    $('#new-user-table').on('input', 'input', handleInputUpdate);

};

// Método para activar o desactivar los inputs en la segunda columna
const activarDesactivarInputs = (disabled) => {
    // Iterar sobre todas las filas en `data`
    new_user_table_data.data.forEach(fila => {
      // El segundo elemento (index 1) de cada fila es el input en la segunda columna
      let inputHTML = fila[1];
  
      // Crear un elemento temporal para manipular el HTML
      let tempElement = document.createElement('div');
      tempElement.innerHTML = inputHTML;
  
      // Seleccionar el input dentro del HTML temporal
      let input = tempElement.querySelector('input');
  
      // Verificar si se encontró un input
      if (input) {
        // Activar o desactivar el input según el parámetro `activar`
        input.disabled = disabled;
  
        // Actualizar el HTML de la fila con el input modificado
        fila[1] = tempElement.innerHTML;
      }
    });
  }

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

// Nuevo método para eliminar los valores fijados en los inputs
export const resetFixedValues = () => {

    var retVal = confirm("¿Deseas eliminar todas las valoraciones de películas?");
    if( retVal == true ) {
        new_user_table_data.data.forEach(fila => {
            let inputHTML = '<span style="display:none">-1</span><input type="number" min="-1" max="10" value="-1" class="form-control" data-index="0">';
            fila[1] = inputHTML;
        });
    
        createDataTable();
    }
};

// Exportar datos a csv
export const exportToCSV = () => {
    const csvRows = [];

    const hasPredictions = new_user_table_data.data.some(row => row[3] !== 'N/D');

    if (hasPredictions) {
        // Añadir la cabecera
        csvRows.push(["movie", "score", "prediction"]);

        // Exportar todas las películas y sus predicciones
        new_user_table_data.data.forEach(row => {
            const scoreValue = extractScoreValue(row[1]);
            const formattedRow = [
                row[0],        // #
                scoreValue,    // Nota
                row[3]         // Predicción
            ];
            csvRows.push(formattedRow.join(','));
        });
    } else {
        // Añadir la cabecera
        csvRows.push(["movie", "score"]);

        // Exportar solo las películas valoradas por el usuario
        new_user_table_data.data.forEach(row => {
            const scoreValue = extractScoreValue(row[1]);
            if (scoreValue !== "-1") {
                const formattedRow = [
                    row[0],        // #
                    scoreValue,    // Nota
                ];
                csvRows.push(formattedRow.join(','));
            }
        });
    }

    const csvString = "\uFEFF" + csvRows.join('\n');  // Añadir BOM para UTF-8
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'user_table_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

const extractScoreValue = (html) => {
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;
    const input = tempElement.querySelector('input');
    return input ? input.value : '';
};

// Importar datos de csv
export const importFromCSV = () => {
    // Crear un elemento input para seleccionar el archivo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    // Agregar un evento de cambio al input para manejar la selección del archivo
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const csv = event.target.result;
                Papa.parse(csv, {
                    header: true,
                    complete: (results) => {
                        const data = results.data;
                        // Crear un objeto para almacenar las puntuaciones del usuario
                        const userScores = {};

                        // Rellenar userScores con las puntuaciones del CSV
                        data.forEach(row => {
                            const movieId = parseInt(row["movie"]);
                            const scoreValue = parseInt(row["score"]);
                            if (!isNaN(movieId) && !isNaN(scoreValue) && movieId >= 0 && movieId < 100) {
                                userScores[movieId] = scoreValue;
                            }
                        });

                        // Actualizar new_user_table_data.data con las puntuaciones del CSV
                        new_user_table_data.data.forEach((row, index) => {
                            const movieId = index;
                            const score = userScores.hasOwnProperty(movieId) ? userScores[movieId] : -1;
                            const scoreInput = `<span style="display:none">${String(score).padStart(3, '0')}</span><input type="number" min="-1" max="10" value="${score}" class="form-control" data-index="${movieId}"/>`;
                            row[1] = scoreInput;
                            row[3] = 'N/D'; // Establecer predicción a 'N/D'
                        });

                        createDataTable();
                        alert("Puntuaciones cargadas!")
                    }
                });
            };
            reader.readAsText(file);
        }
    };

    // Disparar el clic del input para abrir la ventana de selección de archivos
    input.click();
};

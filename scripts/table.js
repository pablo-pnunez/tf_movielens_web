import { console_log } from './console.js';

// Cargar new_user_table_data desde sessionStorage o crear uno nuevo si no existe
const storedData = sessionStorage.getItem("new_user_table_data");
const new_user_table_data = storedData ? JSON.parse(storedData) : { data: [], columns: [ { title: "#" }, { title: "Nota" }, { title: "Título" }, { title: "Predicción" } ] };

let new_user_table = null;
let table_state = null;

const saveTableDataToSession = () => {
    sessionStorage.setItem("new_user_table_data", JSON.stringify(new_user_table_data));
};

export const createDataTable = (disabled = false) => {
    activarDesactivarInputs(disabled);

    if (new_user_table !== null) {
        table_state = new_user_table.state();
        new_user_table.clear().rows.add(new_user_table_data.data).draw();
        if (table_state !== null) {
            new_user_table.state.clear();
            new_user_table.state(table_state).draw();
        }
    } else {
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

    $('#new-user-table').on('input', 'input', handleInputUpdate);
};

const activarDesactivarInputs = (disabled) => {
    new_user_table_data.data.forEach(fila => {
        let tempElement = document.createElement('div');
        tempElement.innerHTML = fila[1];
        let input = tempElement.querySelector('input');
        if (input) {
            input.disabled = disabled;
            fila[1] = tempElement.innerHTML;
        }
    });
    saveTableDataToSession();
}

export const addMoviesToTable = (movies, userData) => {
    if (new_user_table_data.data.length === 0) {
        movies.Title.forEach((title, index) => {
            const movieIndex = userData.movie.indexOf(index);
            const scoreValue = movieIndex !== -1 ? userData.score[movieIndex] : -1;
            const scoreInput = `<span style="display:none">${String(scoreValue).padStart(3, '0')}</span><input type="number" min="-1" max="10" value="${scoreValue}" class="form-control" data-index="${index}"/>`;
            new_user_table_data.data.push([index + 1, scoreInput, title, 'N/D']);
        });

        createDataTable();
        saveTableDataToSession();
    } else {
        // Asegurarse de que la columna "Predicción" sea "N/D"
        new_user_table_data.data.forEach(row => { row[3] = 'N/D'; });
        createDataTable();
        saveTableDataToSession();
    }
};

const handleInputUpdate = (event) => {
    const $input = $(event.target);
    const index = $input.closest('tr').find('td:first').text() - 1;
    const newValue = parseInt($input.val());
    const row = new_user_table_data.data[index];
    const span = `<span style="display:none">${String(newValue).padStart(3, "0")}</span>`;
    row[1] = `${span}<input type="number" min="-1" max="10" value="${newValue}" class="form-control" data-index="${index}"/>`;

    // Actualizar la celda en el DataTable sin recrearlo
    const cell = new_user_table.cell($input.closest('td'));
    cell.data(row[1]).draw(false);

    saveTableDataToSession();
};

export const addUserRatingsToTrainingData = (numUsers, trainData) => {
    let ratings = []; 

    new_user_table_data.data.forEach((row) => {
        const movieIndex = row[0] - 1;
        const scoreInputHtml = row[1];
        const parser = new DOMParser();
        const doc = parser.parseFromString(scoreInputHtml, 'text/html');
        const score = parseInt(doc.querySelector('input').value);

        if (score !== -1) {
            ratings.push([movieIndex, score]);
        }
    });

    if (ratings.length === 0) {
        console_log("No hay valoraciones para añadir.");
        return { "trainProcessed": trainData, "newUserIndex": null };
    }

    let bestMovies = [];
    let worstMovies = [];
    const newUserIndex = numUsers;

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

    const newTrainData = {
        u: Array(bestMovies.length).fill(newUserIndex),
        b: bestMovies,
        w: worstMovies
    };

    const combinedTrainData = {
        u: trainData.u.concat(newTrainData.u),
        b: trainData.b.concat(newTrainData.b),
        w: trainData.w.concat(newTrainData.w)
    };

    console_log(`Se añadieron ${ratings.length} valoraciones del usuario ${newUserIndex}.`);

    return { "trainProcessed": combinedTrainData, "newUserIndex": newUserIndex };
};

export const updatePredictions = async (predictions) => {
    new_user_table_data.data.forEach((row, index) => {
        const movieIndex = row[0] - 1;
        if (predictions[movieIndex] !== undefined) {
            row[3] = predictions[movieIndex].toFixed(2);
        }
    });

    createDataTable(true);
    saveTableDataToSession();
};

export const resetFixedValues = () => {
    var retVal = confirm("¿Deseas eliminar todas las valoraciones de películas?");
    if (retVal) {
        new_user_table_data.data.forEach(fila => {
            let inputHTML = '<span style="display:none">-1</span><input type="number" min="-1" max="10" value="-1" class="form-control" data-index="0">';
            fila[1] = inputHTML;
        });

        createDataTable();
        saveTableDataToSession();
    }
};

export const exportToCSV = (movie_embeddings=null) => {
    // Obtener los estados de los checkboxes en el modal
    const includeNotas = document.getElementById("export-notas").checked;
    let includePreds = document.getElementById("export-preds").checked;
    const includeNames = document.getElementById("export-names").checked;
    let includeEmbs = document.getElementById("export-embs").checked;

    // Verificar si existe el modelo
    includePreds = new_user_table_data.data.some(row => row[3] !== 'N/D') && includePreds;
    includeEmbs = new_user_table_data.data.some(row => row[3] !== 'N/D') && includeEmbs;

    // Crear encabezados según la selección del usuario
    const csvRows = [];
    let headers = ["movie"];
    if (includeNotas) headers.push("score");
    if (includePreds) headers.push("prediction");
    if (includeNames) headers.push("name");
    if (includeEmbs) headers.push("embedding");
    csvRows.push(headers.join(','));


    // Crear las filas del CSV según la selección del usuario
    new_user_table_data.data.forEach((row, index) => {
        const scoreValue = extractScoreValue(row[1]);
        const prediction = row[3] !== 'N/D' ? row[3] : '';
        const title = "\""+row[2]+"\""; // Assuming this contains the movie title
        // Assuming embeddings are stored somewhere, add logic to fetch them

        const formattedRow = [row[0]];
        if (includeNotas) formattedRow.push(scoreValue);
        if (includePreds) formattedRow.push(prediction);
        if (includeNames) formattedRow.push(title);
        if (includeEmbs) formattedRow.push(movie_embeddings[index]);

        csvRows.push(formattedRow.join(','));
    });

    const csvString = "\uFEFF" + csvRows.join('\n');
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

export const importFromCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

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
                        const userScores = {};

                        data.forEach(row => {
                            const movieId = parseInt(row["movie"]);
                            const scoreValue = parseInt(row["score"]);
                            if (!isNaN(movieId) && !isNaN(scoreValue) && movieId >= 0 && movieId < 100) {
                                userScores[movieId] = scoreValue;
                            }
                        });

                        new_user_table_data.data.forEach((row, index) => {
                            const movieId = index;
                            const score = userScores.hasOwnProperty(movieId) ? userScores[movieId] : -1;
                            const scoreInput = `<span style="display:none">${String(score).padStart(3, '0')}</span><input type="number" min="-1" max="10" value="${score}" class="form-control" data-index="${movieId}"/>`;
                            row[1] = scoreInput;
                        });

                        createDataTable();
                        saveTableDataToSession();
                    }
                });
            };
            reader.readAsText(file);
        }
    };

    input.click();
};

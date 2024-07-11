import { console_log } from './scripts/console.js';
import { addMoviesToTable, addUserRatingsToTrainingData, updatePredictions, createDataTable, resetFixedValues, exportToCSV, importFromCSV} from './scripts/table.js';
import { createEmbeddingsPlot, updateEmbeddingsPlot, createLossPlot, updateLossPlot } from './scripts/plot.js';
import { walkthrough } from './scripts/tour.js';

const load_session_values = (items) => {
    let has_loaded = false;
    items.forEach((item, index) => {
        if(item!=null){
            const name = $(item).attr("id")
            const value = $(item).attr("value")
            if (sessionStorage.getItem(name)){
                $(item).attr("value", sessionStorage.getItem(name));
                has_loaded = true;
            }
            else{
                sessionStorage.setItem(name, value);
            }

            $(item).on("change", function(x, y){
                const name = $(x.currentTarget).attr("id")
                const value = x.currentTarget.value
                sessionStorage.setItem(name, value);
            });
        }
    });

    if(has_loaded){
        const toastLiveExample = document.getElementById('sessionToast');
        const toastBootstrap = bootstrap.Toast.getOrCreateInstance(toastLiveExample)
        toastBootstrap.show();
        // alert("Se han cargado los valores de la sesión previa.\n Puedes reiniciar los valores en el botón de la papelera.")
    };

};

const clear_session_values = () => {
    sessionStorage.clear();
    location.reload();
};

document.addEventListener('DOMContentLoaded', async () => {
    // Poner los tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
    
    let trainWorker;

    // Obtener elementos de la interfaz
    const consola = document.getElementById('console');
    const epoch_progressBar = document.getElementById('epoch-pgb');
    const batch_progressBar = document.getElementById('batch-pgb');

    const randomSeed = document.getElementById('random-seed');
    const embSize = document.getElementById('emb-size');
    const regularizer = document.getElementById('regularizer');
    const nEpochs = document.getElementById('n-epochs');
    const batchSize = document.getElementById('batch-size');
    const learningRate = document.getElementById('learning-rate');

    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const btnReset = document.getElementById('btn-reset');

    const btnUserLoad = document.getElementById('btn-usr-load');
    const btnUserSave = document.getElementById('btn-usr-save');
    const btnUserClean = document.getElementById('btn-usr-clean');

    // Cargar los valores de la sesión anterior
    load_session_values([randomSeed, embSize, regularizer, nEpochs, batchSize, learningRate]);

    // Comprobar si WebGL está disponible
    if (tf.ENV.get('WEBGL_VERSION') > 0) {
        console_log('WebGL is enabled');
    } else {
        console_log('WebGL is not enabled');
    }


    // Cargar los datos de entrenamiento
    console_log("Cargando los datos de entrenamiento...");
    let trainData, valData, numUsers, numMovies, movies, infoData, userData;
    try {
        const trainResponse = await fetch('data/ranking/train.json');
        trainData = await trainResponse.json();

        console_log("Cargando los datos de validación...");
        const valResponse = await fetch('data/ranking/test.json');
        valData = await valResponse.json();

        console_log("Cargando información del dataset...");

        const movieResponse = await fetch('data/ranking/movies.json');
        movies = await movieResponse.json();

        const infoResponse = await fetch('data/ranking/info.json');
        infoData = await infoResponse.json();
        numUsers = infoData.numUsers[0];
        numMovies = infoData.numItems[0];

        const userResponse = await fetch('data/ranking/user.json');
        userData = await userResponse.json();

        console_log("Datos cargados.");

    } catch (error) {
        console_log(`Error al cargar los datos: ${error}`);
        return;
    }

    // Habilitar los botones una vez que los datos se han cargado
    btnStart.disabled = false;

    // Rellenar la tabla
    addMoviesToTable(movies, userData);

    // Info
    console_log(`#Usuarios: ${numUsers} #Peliculas: ${numMovies}`);

    let embeddingsPlotCreated = false;
    let lossPlotCreated = false;

    // Función para habilitar o deshabilitar los botones durante el entrenamiento
    const toggleButtons = (isTraining) => {
        btnStart.disabled = isTraining;
        btnStop.disabled = !isTraining;
        btnReset.disabled = isTraining;

        // randomSeed.disabled = isTraining;
        embSize.disabled = isTraining;
        regularizer.disabled = isTraining;
        nEpochs.disabled = isTraining;
        batchSize.disabled = isTraining;
        learningRate.disabled = isTraining;

        btnUserLoad.disabled = isTraining;
        btnUserSave.disabled = isTraining;
        btnUserClean.disabled = isTraining;

        createDataTable(isTraining)
    };

    // Función para iniciar el entrenamiento del modelo en el Web Worker
    const startTraining = () => {
        console_log("Iniciando entrenamiento...");

        // cambiar los nombres de las columnas

        // Recuperar las valoraciones del usuario desde la tabla y añadirlas al conjunto
        const { trainProcessed, newUserIndex } = addUserRatingsToTrainingData(numUsers, trainData)

        //Si hay valoraciones del usuario nuevo, tenemos un usuario más
        if (newUserIndex !== null) { numUsers+=1;};

        // Crear el worker con el modelo
        trainWorker = new Worker('./scripts/train-worker.js');

        // Deshabilitar/habilitar botones
        toggleButtons(true);

        // Crear el diccionario de configuración
        const config = {
            dropoutRate: parseFloat(regularizer.value),
            learningRate: parseFloat(learningRate.value),
            embeddingDim: parseInt(embSize.value),
            batchSize: parseInt(batchSize.value),
            epochs: parseInt(nEpochs.value), 
            reproducible: true, //!parseInt(randomSeed.value), 
        };

        // Escuchar los mensajes del Web Worker para el entrenamiento
        trainWorker.addEventListener('message', (event) => {
            const { type, status, batchCount, totalBatches, epochs, lossHistory, valLossHistory, userEmbeddings, movieEmbeddings, predictions } = event.data;
            if (type === 'status') {
                console_log(status);
            } else if (type === 'progress') {
                const train_progress = (batchCount / totalBatches) * 100;
                const batches_epoch = (totalBatches / epochs)
                const epoch_progress = ((batchCount % batches_epoch) / batches_epoch) * 100;

                epoch_progressBar.value = train_progress;
                epoch_progressBar.style.width = `${train_progress}%`;

                batch_progressBar.value = epoch_progress;
                batch_progressBar.style.width = `${epoch_progress}%`;

            } else if (type === 'plot') {
                if (!embeddingsPlotCreated) {
                    createEmbeddingsPlot(userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, config, newUserIndex);
                    embeddingsPlotCreated = true;
                } else {
                    updateEmbeddingsPlot(userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, config, newUserIndex);
                }
                if (!lossPlotCreated) {
                    createLossPlot(lossHistory, valLossHistory);
                    lossPlotCreated = true;
                } else {
                    updateLossPlot(lossHistory, valLossHistory);
                }
            }else if (type === 'predictions') {
                updatePredictions(predictions);
            }
        });

        // Iniciar el entrenamiento del modelo en el Web Worker
        trainWorker.postMessage({ 
            trainData: { u: trainProcessed.u, b: trainProcessed.b, w: trainProcessed.w },
            valData: { u: valData.u, b: valData.b, w: valData.w },
            numUsers, numMovies, newUserIndex, config
        });
    };

    // Función para detener el entrenamiento del modelo en el Web Worker
    const stopTraining = () => {
        console_log("Entrenamiento detenido");

        if (trainWorker) {
            trainWorker.terminate();
            batch_progressBar.value = 0;
            batch_progressBar.style.width = '0%';

            epoch_progressBar.value = 0;
            epoch_progressBar.style.width = '0%';

            trainWorker = null;

            // Habilitar btn-start y deshabilitar btn-stop
            toggleButtons(false);
        }
    };

    // Event listeners para los botones
    btnStart.addEventListener('click', startTraining);
    btnStop.addEventListener('click', stopTraining);
    btnReset.addEventListener('click', clear_session_values);

    btnUserLoad.addEventListener('click', importFromCSV);
    btnUserSave.addEventListener('click', exportToCSV);
    btnUserClean.addEventListener('click', resetFixedValues);

    // Iniciar el walkthrough si es la primera vez
    walkthrough();

});

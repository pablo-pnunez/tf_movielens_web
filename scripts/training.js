import { console_log, processQueue } from './console.js';
import { addUserRatingsToTrainingData, updatePredictions } from './table.js';
import { createEmbeddingsPlot, updateEmbeddingsPlot, createLossPlot, updateLossPlot } from './plot.js';

export const startTraining = async ({ trainData, valData, numUsers, numMovies, userData, movies, consola, epoch_progressBar, batch_progressBar, randomSeed, embSize, regularizer, nEpochs, batchSize, learningRate, btnStart, btnStop, btnReset }) => {
    let newTrainData, userId;

    try {
        // Añadir las valoraciones del usuario
        ({ combinedTrainData: newTrainData, userId } = addUserRatingsToTrainingData());
        
        if (newTrainData === null) return;
        
        console_log("Configurando el modelo...");
        const model = createModel(numUsers + 1, numMovies, embSize.value, regularizer.value, learningRate.value);
        model.summary();
        const trainOutput = document.getElementById('train-output');
        trainOutput.textContent = model.summary();

        console_log("Iniciando el entrenamiento...");
        toggleButtons(btnStart, btnStop, btnReset);

        // Variables para el plot de embeddings
        let embeddingsPlotCreated = false;
        let lossPlotCreated = false;

        const history = await trainModel(model, newTrainData, valData, nEpochs.value, batchSize.value, epoch_progressBar, batch_progressBar);

        if (!embeddingsPlotCreated) {
            createEmbeddingsPlot(model);
            embeddingsPlotCreated = true;
        }

        if (!lossPlotCreated) {
            createLossPlot(history);
            lossPlotCreated = true;
        }

        updateEmbeddingsPlot(model);
        updateLossPlot(history);

        console_log("Entrenamiento completado.");
        toggleButtons(btnStart, btnStop, btnReset, false);
        updatePredictions(model, userId, numMovies);
    } catch (error) {
        console_log(`Error durante el entrenamiento: ${error}`);
        toggleButtons(btnStart, btnStop, btnReset, false);
    }
};

export const stopTraining = () => {
    if (trainWorker) {
        trainWorker.terminate();
        trainWorker = null;
        console_log("Entrenamiento detenido.");
    }
};

export const toggleButtons = (btnStart, btnStop, btnReset, disable = true) => {
    btnStart.disabled = disable;
    btnStop.disabled = !disable;
    btnReset.disabled = !disable;
};

const createModel = (numUsers, numMovies, embSize, regularizer, learningRate) => {
    // Crear el modelo de red neuronal aquí
};

const trainModel = async (model, trainData, valData, nEpochs, batchSize, epoch_progressBar, batch_progressBar) => {
    // Entrenar el modelo aquí
};

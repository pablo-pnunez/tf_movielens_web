// Variables para que funcione el modo full screen
var full_screen_icon = { 'width': 512, 'height': 512, 'path': "M512 512v-208l-80 80-96-96-48 48 96 96-80 80z M512 0h-208l80 80-96 96 48 48 96-96 80 80z M0 512h208l-80-80 96-96-48-48-96 96-80-80z M0 0v208l80-80 96 96 48-48-96-96 80-80z" }
var full_screen_config = { responsive: true, modeBarButtonsToAdd: [{ name: 'Increase Size', icon: full_screen_icon, click: function(gd) { $($(gd).parents(".col-sm-12")[0]).toggleClass("col-xl-6"); Plotly.Plots.resize(gd); } }] }

// Función para crear o actualizar gráficos de embeddings
const plotEmbeddings = (userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, config, newUserIndex = null, plotType = 'new') => {
    const userCoords = userEmbeddings.slice(0, numUsers);
    const movieCoords = movieEmbeddings.slice(0, numMovies);

    const user_names = Array.from({ length: numUsers }, (v, i) => `Usuario ${(i + 1).toString().padStart(3, '0')}`);

    const userTrace = {
        x: userCoords.map(coord => coord[0]),
        y: userCoords.map(coord => coord[1]),
        hoverinfo: 'text',
        text: user_names,
        mode: 'markers',
        type: 'scatter',
        name: 'Usuarios',
        opacity: 0.8,
        marker: { color: '#03a9f4' }
    };

    const movieTrace = {
        x: movieCoords.map(coord => coord[0]),
        y: movieCoords.map(coord => coord[1]),
        text: movies.Title,
        hoverinfo: 'text',
        mode: 'markers',
        type: 'scatter',
        name: 'Películas',
        opacity: 0.8,
        marker: { symbol: 'square', color: '#f44336' }
    };

    const data = [userTrace, movieTrace];

    if (newUserIndex !== null) {
        const newUserTrace = {
            x: [userCoords[newUserIndex][0]],
            y: [userCoords[newUserIndex][1]],
            mode: 'markers',
            hoverinfo: 'text',
            type: 'scatter',
            text: 'Nuevo usuario',
            name: 'Nuevo usuario',
            marker: { color: 'blue'}
        };
        data.push(newUserTrace);

        // Si k=2 se dibuja el producto escalar
        if (config.embeddingDim == 2) {

            // Línea desde el nuevo usuario hasta el origen
            const newUserToOriginLine = {
                x: [userCoords[newUserIndex][0], 0],
                y: [userCoords[newUserIndex][1], 0],
                mode: 'lines',
                type: 'scatter',
                showlegend: false,
                line: { color: 'blue', dash: 'dash' }
            };

            // Línea perpendicular que pasa por el origen
            const perpendicularLine = {
                x: [-userCoords[newUserIndex][1], userCoords[newUserIndex][1]],
                y: [userCoords[newUserIndex][0], -userCoords[newUserIndex][0]],
                mode: 'lines',
                type: 'scatter',
                showlegend: false,
                line: { color: 'blue'}
            };

            data.push(newUserToOriginLine, perpendicularLine);

        }

    }

    const layout = {
        margin: { t: 50, l: 50, r: 50, b: 50 },
        //legend: { x: 1, xanchor: 'right', y: 1 },
        scene:{
            aspectmode:"manual",
            aspectratio: { x: 1, y: 1 },
        },
        legend: {
            x: 0.1, y: 0.1, traceorder: 'normal',
            orientation: "h",
            font: { family: 'sans-serif', size: 12, color: '#000' },
            bgcolor: '#ffffff',
            bordercolor: '#b1b1b1',
            borderwidth: 2
        },
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
        hovermode: "closest",
    };

    if (plotType === 'new') {
        Plotly.newPlot('emb-plot', data, layout, full_screen_config);
    } else {
        Plotly.react('emb-plot', data, layout, full_screen_config);
    }
};

export const createEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, config, newUserIndex = null) => {
    plotEmbeddings(userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, config, newUserIndex, 'new');
};

export const updateEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, config, newUserIndex = null) => {
    const userCoords = userEmbeddings.slice(0, numUsers);
    const movieCoords = movieEmbeddings.slice(0, numMovies);

    const user_names = Array.from({ length: numUsers }, (v, i) => `Usuario ${(i + 1).toString().padStart(3, '0')}`);

    const new_data = {
        'x': [userCoords.map(coord => coord[0]), movieCoords.map(coord => coord[0])],
        'y': [userCoords.map(coord => coord[1]), movieCoords.map(coord => coord[1])],
    };

    const traces = [0,1]

    if (newUserIndex !== null) {
        new_data['x'].push([userCoords[newUserIndex][0]]);
        new_data['y'].push([userCoords[newUserIndex][1]]);
        traces.push(2);
        if (config.embeddingDim == 2) {
            new_data['x'].push([userCoords[newUserIndex][0], 0]);
            new_data['y'].push([userCoords[newUserIndex][1], 0]);
            new_data['x'].push([-userCoords[newUserIndex][1], userCoords[newUserIndex][1]]);
            new_data['y'].push([userCoords[newUserIndex][0], -userCoords[newUserIndex][0]]);
            traces.push(3, 4);

        }
    }

    Plotly.update('emb-plot', new_data, {}, traces);

};


// Función para crear o actualizar gráficos de pérdida
const plotLoss = (lossHistory, valLossHistory, plotType = 'new') => {
    const trainTrace = {
        x: lossHistory.map((_, i) => i + 1),
        y: lossHistory,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Train Loss',
        line: { color: '#9e9e9e' }
    };

    const valTrace = {
        x: valLossHistory.map((_, i) => i + 1),
        y: valLossHistory,
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Validation Loss',
        line: { color: '#4caf50' }
    };

    const layout = {
        margin: { t: 50, l: 50, r: 50, b: 50 },
        xaxis: { title: 'Epoch' },
        yaxis: { title: 'Loss' },
        legend: {
            x: 0.1, y: 0.1, traceorder: 'normal',
            orientation: "h",
            font: { family: 'sans-serif', size: 12, color: '#000' },
            bgcolor: '#ffffff',
            bordercolor: '#b1b1b1',
            borderwidth: 2
        },
    };

    const data = [trainTrace, valTrace];

    if (plotType === 'new') {
        Plotly.newPlot('loss-plot', data, layout, full_screen_config);
    } else {
        Plotly.react('loss-plot', data, layout, full_screen_config);
    }
};

export const createLossPlot = async (lossHistory, valLossHistory) => {
    plotLoss(lossHistory, valLossHistory, 'new');
};

export const updateLossPlot = async (lossHistory, valLossHistory) => {
    const update = {
        'x': [lossHistory.map((_, i) => i + 1), valLossHistory.map((_, i) => i + 1)],
        'y': [lossHistory, valLossHistory]
    };

    Plotly.update('loss-plot', update);
};
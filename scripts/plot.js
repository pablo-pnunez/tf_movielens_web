// Función para crear o actualizar gráficos de embeddings
const plotEmbeddings = (userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, newUserIndex = null, plotType = 'new') => {
    const userCoords = userEmbeddings.slice(0, numUsers);
    const movieCoords = movieEmbeddings.slice(0, numMovies);

    const userTrace = {
        x: userCoords.map(coord => coord[0]),
        y: userCoords.map(coord => coord[1]),
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
            type: 'scatter',
            name: 'Nuevo usuario',
            marker: { color: 'blue'}
        };

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

        data.push(newUserTrace, newUserToOriginLine, perpendicularLine);
    }

    const layout = {
        margin: { t: 50, l: 50, r: 50, b: 50 },
        legend: { x: 1, xanchor: 'right', y: 1 },
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
        hovermode: "closest",
    };

    if (plotType === 'new') {
        Plotly.newPlot('emb-plot', data, layout, { responsive: true });
    } else {
        Plotly.react('emb-plot', data, layout, { responsive: true });
    }
};

export const createEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, newUserIndex = null) => {
    plotEmbeddings(userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, newUserIndex, 'new');
};

export const updateEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, newUserIndex = null) => {
    plotEmbeddings(userEmbeddings, movieEmbeddings, userEmbeddings.length, movieEmbeddings.length, { Title: [] }, newUserIndex, 'update');
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
        legend: { x: 1, xanchor: 'right', y: 1 }
    };

    const data = [trainTrace, valTrace];

    if (plotType === 'new') {
        Plotly.newPlot('loss-plot', data, layout, { responsive: true });
    } else {
        Plotly.react('loss-plot', data, layout, { responsive: true });
    }
};

export const createLossPlot = async (lossHistory, valLossHistory) => {
    plotLoss(lossHistory, valLossHistory, 'new');
};

export const updateLossPlot = async (lossHistory, valLossHistory) => {
    plotLoss(lossHistory, valLossHistory, 'update');
};

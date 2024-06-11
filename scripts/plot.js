// Función para visualizar embeddings
export const createEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, numUsers, numMovies, movies, newUserIndex = null) => {
    const userCoords = Array.from({ length: numUsers }, (_, i) => userEmbeddings[i]);
    const movieCoords = Array.from({ length: numMovies }, (_, i) => movieEmbeddings[i]);

    const userTrace = { x: userCoords.map(coord => coord[0]), y: userCoords.map(coord => coord[1]), mode: 'markers', type: 'scatter', name: 'Users', marker: { color: '#03a9f4' } };

    const movieTrace = { x: movieCoords.map(coord => coord[0]), y: movieCoords.map(coord => coord[1]), text: movies.Title, hoverinfo: 'text', mode: 'markers', type: 'scatter', name: 'Movies', marker: { symbol: 'square', color: '#f44336' } };

    const data = [userTrace, movieTrace];
    
    // Si se ha añadido un usuario nuevo
    if (newUserIndex !== null) {
        const newUserTrace = { x: [userCoords[newUserIndex][0]], y: [userCoords[newUserIndex][1]], mode: 'markers', type: 'scatter', name: 'New User', marker: { color: '#ff9800' } };
        data.push(newUserTrace);
    }

    const layout = {
        margin: { t: 50, l: 50, r: 50, b: 50 },
        legend: { x: 1, xanchor: 'right', y: 1 },
        xaxis: { title: 'X' },
        yaxis: { title: 'Y' },
    };

    Plotly.newPlot('emb-plot', data, layout, { responsive: true });
};

export const updateEmbeddingsPlot = async (userEmbeddings, movieEmbeddings, newUserIndex = null) => {
    const userCoords = Array.from({ length: userEmbeddings.length }, (_, i) => userEmbeddings[i]);
    const movieCoords = Array.from({ length: movieEmbeddings.length }, (_, i) => movieEmbeddings[i]);

    const data = [
        { x: userCoords.map(coord => coord[0]), y: userCoords.map(coord => coord[1]), type: 'scatter', mode: 'markers', name: 'Users', marker: { color: '#03a9f4' } },
        { x: movieCoords.map(coord => coord[0]), y: movieCoords.map(coord => coord[1]), type: 'scatter', mode: 'markers', name: 'Movies', marker: { symbol: 'square', color: '#f44336' } }
    ];

    if (newUserIndex !== null) {
        const newUserTrace = { x: [userCoords[newUserIndex][0]], y: [userCoords[newUserIndex][1]], type: 'scatter', mode: 'markers', name: 'New User', marker: { color: '#ff9800'} };
        data.push(newUserTrace);
    }

    Plotly.react('emb-plot', data, { margin: { t: 50, l: 50, r: 50, b: 50 }, legend: { x: 1, xanchor: 'right', y: 1 }, xaxis: { title: 'X' }, yaxis: { title: 'Y' } }, { responsive: true });
};

export const createLossPlot = async (lossHistory, valLossHistory) => {
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
    Plotly.newPlot('loss-plot', data, layout, { responsive: true });
};

export const updateLossPlot = async (lossHistory, valLossHistory) => {
    const trainTrace = {
        x: lossHistory.map((_, i) => i + 1),
        y: lossHistory,
        mode: 'lines+markers',
        name: 'Train Loss',
        line: { color: '#9e9e9e' }
    };

    const valTrace = {
        x: valLossHistory.map((_, i) => i + 1),
        y: valLossHistory,
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

    Plotly.react('loss-plot', [trainTrace, valTrace], layout, { responsive: true });
};
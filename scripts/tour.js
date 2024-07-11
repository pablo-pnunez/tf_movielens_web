export const walkthrough = () => {
    const steps = [
        {
            title: "Bienvenido! 👋",
            content: "Desde este apartado podrás configurar los hiperparámetros de tu modelo.",
            target: "#config-card div.card",
        }, 
        {
            title: "Entrenar y detener",
            content: "Con estos botones podrás entrenar un nuevo modelo (verde) y detener el entrenamiento actual (rojo)",
            target: "#config-card div.btn-group",
        },
        {
            title: "Reiniciar la aplicación",
            content: "Si deseas eliminar todos los cambios que has realizado y prefieres iniciar de cero, puedes pulsar este botón",
            target: "#config-card div#btn-reset-modal",
        },
        {
            title: "Progreso del entrenamiento",
            content: "Una vez inicies el entrenamiento, aquí verás el progreso de la época actual y del modelo al completo.",
            target: "#progress-card div.card",
        },
        {
            title: "Gráfica de embeddings",
            content: "Una vez inicies el entrenamiento, aquí verás dos barras de progreso, una para la época actual y otra para el entrenamiento del modelo al completo.",
            target: "#emb-card div.card",
        },
        {
            title: "Gráfica de pérdida",
            content: "Una vez inicies el entrenamiento, aquí verás dos barras de progreso, una para la época actual y otra para el entrenamiento del modelo al completo.",
            target: "#loss-card div.card",
        },
        {
            title: "Consola de log",
            content: "Una vez inicies el entrenamiento, aquí verás dos barras de progreso, una para la época actual y otra para el entrenamiento del modelo al completo.",
            target: "#console-card div.card",
        },
        {
            title: "Usuario nuevo",
            content: "Una vez inicies el entrenamiento, aquí verás dos barras de progreso, una para la época actual y otra para el entrenamiento del modelo al completo.",
            target: "#new-user-card div.card",
        },
        {
            title: "Cambiar notas",
            content: "Una vez inicies el entrenamiento, aquí verás dos barras de progreso, una para la época actual y otra para el entrenamiento del modelo al completo.",
            target: "#new-user-card td input",
        },
        {
            title: "Importar, exportar y borrar notas",
            content: "Una vez inicies el entrenamiento, aquí verás dos barras de progreso, una para la época actual y otra para el entrenamiento del modelo al completo.",
            target: "#new-user-buttons",
        }
    ];
    
    const tg = new tourguide.TourGuideClient({steps: steps});

    tg.start();

}

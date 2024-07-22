export const walkthrough = () => {
    const steps = [
        {
            title: "Bienvenido! 👋",
            content: "Desde este apartado podrás configurar los hiperparámetros de tu modelo.",
            target: "#config-card div.card",
            order: 1,
        }, 
        {
            title: "Entrenar y detener",
            content: "Con estos botones podrás entrenar un nuevo modelo (verde) y detener el entrenamiento actual (rojo)",
            target: "#config-card div.btn-group",
            order: 2,
        },
        {
            title: "Reiniciar la aplicación",
            content: "Si deseas eliminar todos los cambios que has realizado y prefieres iniciar de cero, puedes pulsar este botón",
            target: "#config-card div#btn-reset-modal",
            order: 3,
        },
        {
            title: "Progreso del entrenamiento",
            content: "Una vez inicies el entrenamiento, aquí verás el progreso de la época actual y del modelo al completo.",
            target: "#progress-card div.card",
            order: 4,
        },
        {
            title: "Gráfica de embeddings",
            content: "Durante el entrenamiento, aquí aparecerá una gráfica de dispersión donde cada punto representa el embedding de un usuario (azul) o una película (rojo).",
            target: "#emb-card div.card",
            order: 5,
        },
        {
            title: "Gráfica de pérdida",
            content: "En esta otra gráfica se representará la pérdida del modelo para el conjunto de entrenamiento y validación en cada una de las épocas.",
            target: "#loss-card div.card",
            order: 6,
        },
        {
            title: "Consola de log",
            content: "En esta consola podrás ver información textual de lo que sucede en la aplicación.",
            target: "#console-card div.card",
            order: 7,
        },
        {
            title: "Usuario nuevo",
            content: "En esta sección podrás crear un nuevo usuario, para ello solo tienes que dar notas a las películas que desees.",
            target: "#new-user-card div.card",
            order: 8,
        },
        {
            title: "Cambiar notas",
            content: "A modo de ejemplo se ha dado notas a varias películas, pero puedes modificarlas en esta columna.<br>Un '-1' implica que la película no se ha valorado.",
            target: "#new-user-card td input",
            order: 9,
        },
        {
            title: "Importar, exportar y borrar notas",
            content: "Con estos botones podrás importar, exportar o eliminar todas las notas del usuario nuevo.<br> Si no hay valoraciones, el nuevo usuario no aparecerá en el gráfico de embeddings.",
            target: "#new-user-buttons",
            order: 10,
        }
    ];
    
    const tg = new tourguide.TourGuideClient({
        steps: steps, 
        nextLabel:'<i class="bi bi-caret-right-fill"></i>',
        prevLabel:'<i class="bi bi-caret-left-fill"></i>',
        finishLabel:'<i class="bi bi-stop-fill"></i>',
        exitOnClickOutside:false,
    });

    tg.onFinish(()=>{
        localStorage.setItem("tour-done", "true")
     })

    const tour_done = localStorage.getItem("tour-done")? true : false

    if(!tour_done){
        tg.start();
    }
}

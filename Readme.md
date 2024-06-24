## WEB

https://pablo-pnunez.github.io/tf_movielens_web/


## Trabajo final

1. Borra las puntuaciones que vienen por defecto precargadas en la aplicación y puntúa, según tus gustos, 5 películas, procurando que haya variedad de puntuaciones, tanto buenas como malas.

2. Entrena el recomendador y obtén las valoraciones del modelo para todas las películas del conjunto. `Puedes fijar la semilla para que los experimentos sean reproducibles.` Si utilizas un espacio de salida con pocas dimensiones, por ejemplo K=2, es probable que los resultados no sean demasiado buenos. Prueba con espacios mayores como K=100 o K=200.

3. Una vez seleccionada la dimensión del espacio de salida, repite el aprendizaje varias veces, añadiendo  cada vez 5 valoraciones más a las anteriores, para tener así 10, 15, 20, 25, y 30 películas valoradas. Guarda la valoración del modelo para todas las películas en las distintas fases del experimento en una hoja excel llamada 'valoraciones.xlsx', que deberás entregar junto con la memoria.

4. Haz un estudio para analizar los resultados, obtenidos con las distintas ejecuciones, tratanto de ver si el modelo converge hacia un ranking más o menos estable. No es importante si el sistema converge hacia una solución más o menos adecuada, sino si converge hacia un ranking estable (bueno o malo). Para ello debes escoger alguna medida para comparar las salidas (rankings) de las distintas ejecuciones y justificar por qué te parece razonable usarla.

5. Haz también una valoración del ranking final (con 30 películas valoradas), indicando si te parece aceptable o no, en función de tus gustos.



## TODO

* Evitar que se muevan los gráficos al actualizar los datos.
* Solo han de aparecer las lineas del nuevo usuario cuando k=2, si es mayor, no tiene sentido.

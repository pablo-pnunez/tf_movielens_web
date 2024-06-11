export let queue = [];
export let isWriting = false;
const consola = document.getElementById('console');

export const console_log = (line) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `[${hours}:${minutes}:${seconds}] `;
    const fullLine = "\n" + timestamp + line;

    queue.push(fullLine);
    processQueue();
};

const processQueue = () => {
    if (isWriting || queue.length === 0) return;

    isWriting = true;
    const line = queue.shift();
    let index = 0;

    const writeCharacter = () => {
        if (index < line.length) {
            consola.textContent += line.charAt(index);
            index++;
            setTimeout(writeCharacter, 1); // Ajusta el tiempo para la velocidad de escritura
        } else {
            consola.scrollTop = consola.scrollHeight;
            isWriting = false;
            processQueue(); // Procesar la siguiente línea en la cola
        }
    };

    writeCharacter();
};

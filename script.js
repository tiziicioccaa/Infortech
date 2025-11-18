document.addEventListener('DOMContentLoaded', () => {

    // ======================================================
    // 1. LÓGICA DEL JUEGO TA-TE-TI
    // ======================================================
    const gameBoardElement = document.getElementById('gameBoard');
    const statusMessage = document.getElementById('statusMessage');
    const resetRoundButton = document.getElementById('resetRoundButton');
    const resetScoreButton = document.getElementById('resetScoreButton');
    const scoreXElement = document.getElementById('scoreX');
    const scoreOElement = document.getElementById('scoreO');
    const scoreDrawElement = document.getElementById('scoreDraw');
    const modePVPButton = document.getElementById('modePVP');
    const modePVCButton = document.getElementById('modePVC');
    const difficultySelector = document.getElementById('difficultySelector');
    const aiDifficultySelect = document.getElementById('aiDifficulty');

    let currentPlayer = 'X';
    let gameActive = true;
    let boardState = Array(9).fill(null);
    let score = { X: 0, O: 0, draw: 0 };
    let gameMode = 'pvp'; 

    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    // --- Configuración de Modos ---
    function setGameMode(newMode) {
        gameMode = newMode;
        if (newMode === 'pvp') {
            modePVPButton.classList.add('active');
            modePVCButton.classList.remove('active');
            difficultySelector.classList.add('hidden');
        } else {
            modePVCButton.classList.add('active');
            modePVPButton.classList.remove('active');
            difficultySelector.classList.remove('hidden');
        }
        handleResetScore();
    }

    modePVPButton.addEventListener('click', () => setGameMode('pvp'));
    modePVCButton.addEventListener('click', () => setGameMode('pvc'));

    // --- Marcador y Tablero ---
    function updateScoreboard() {
        scoreXElement.textContent = score.X;
        scoreOElement.textContent = score.O;
        scoreDrawElement.textContent = score.draw;
    }

    function handleResetScore() {
        score.X = 0; score.O = 0; score.draw = 0;
        initializeGame();
    }

    function initializeGame() {
        boardState.fill(null);
        currentPlayer = 'X';
        gameActive = true;
        statusMessage.textContent = `Turno de ${currentPlayer}`;
        gameBoardElement.innerHTML = '';
        
        for (let i = 0; i < 9; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'bg-gray-700', 'hover:bg-gray-600', 'rounded-lg'); // Clases base de Tailwind
            cell.dataset.index = i;
            cell.addEventListener('click', handleCellClick);
            gameBoardElement.appendChild(cell);
        }
        updateScoreboard();
    }

    // --- Lógica de Movimiento ---
    function handleCellClick(event) {
        if (!gameActive) return;
        const clickedCell = event.target;
        const cellIndex = parseInt(clickedCell.dataset.index);
        if (boardState[cellIndex] !== null) return;

        makeMove(clickedCell, cellIndex);

        // Turno de la CPU si corresponde
        if (gameMode === 'pvc' && gameActive && currentPlayer === 'O') {
            gameBoardElement.style.pointerEvents = 'none'; 
            statusMessage.textContent = 'Pensando...';
            setTimeout(() => {
                cpuMove();
                gameBoardElement.style.pointerEvents = 'auto';
            }, 700);
        }
    }

    function makeMove(cell, index) {
        // Doble chequeo por seguridad
        if (!cell) cell = gameBoardElement.children[index];
        
        if (boardState[index] !== null || !gameActive) return;
        
        boardState[index] = currentPlayer;
        cell.textContent = currentPlayer;
        
        // Aplicar estilos (clases definidas en tu HTML style)
        cell.classList.add(currentPlayer.toLowerCase());
        cell.classList.remove('hover:bg-gray-600'); 

        if (checkWin()) {
            gameActive = false;
            statusMessage.textContent = `¡Ganó ${currentPlayer}!`;
            score[currentPlayer]++;
            updateScoreboard();
        } else if (checkDraw()) {
            gameActive = false;
            statusMessage.textContent = '¡Es un empate!';
            score.draw++;
            updateScoreboard();
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            statusMessage.textContent = `Turno de ${currentPlayer}`;
        }
    }

    function checkWin() {
        for (const combination of winningCombinations) {
            const [a, b, c] = combination;
            if (boardState[a] === currentPlayer && boardState[b] === currentPlayer && boardState[c] === currentPlayer) {
                // Resaltar ganadores
                [a,b,c].forEach(idx => {
                   gameBoardElement.children[idx].style.backgroundColor = currentPlayer === 'X' ? '#1e3a8a' : '#831843';
                });
                return true;
            }
        }
        return false;
    }

    function checkDraw() { return !boardState.includes(null); }

    // --- Inteligencia Artificial (CPU) ---
    function cpuMove() {
        if (!gameActive) return;
        const difficulty = aiDifficultySelect.value;
        let move = -1;

        if (difficulty === 'easy') move = findRandomMove();
        else if (difficulty === 'medium') move = (Math.random() < 0.7) ? findSmartMove() : findRandomMove();
        else move = findSmartMove(); // Hard
        
        if (move !== -1) {
            const cell = gameBoardElement.children[move];
            makeMove(cell, move);
        }
    }

    function findSmartMove() {
        // 1. Intentar Ganar
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === null) {
                boardState[i] = 'O';
                if (checkWinCPU('O')) { boardState[i] = null; return i; }
                boardState[i] = null;
            }
        }
        // 2. Intentar Bloquear
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === null) {
                boardState[i] = 'X';
                if (checkWinCPU('X')) { boardState[i] = null; return i; }
                boardState[i] = null;
            }
        }
        // 3. Centro o Random
        if (boardState[4] === null) return 4;
        return findRandomMove();
    }

    function findRandomMove() {
        const emptyCells = boardState.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (emptyCells.length === 0) return -1;
        return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    function checkWinCPU(player) {
        for (const [a, b, c] of winningCombinations) {
            if (boardState[a] === player && boardState[b] === player && boardState[c] === player) return true;
        }
        return false;
    }
    
    resetRoundButton.addEventListener('click', initializeGame);
    resetScoreButton.addEventListener('click', handleResetScore);
    
    // Iniciar juego al cargar
    initializeGame(); 


    // ======================================================
    // 2. LÓGICA DE PESTAÑAS (URL vs ARCHIVO)
    // ======================================================
    const btnTabUrl = document.getElementById('btnTabUrl');
    const btnTabFile = document.getElementById('btnTabFile');
    const tabUrlContent = document.getElementById('tabUrlContent');
    const tabFileContent = document.getElementById('tabFileContent');

    btnTabUrl.addEventListener('click', () => {
        btnTabUrl.classList.add('active');
        btnTabFile.classList.remove('active');
        tabUrlContent.classList.remove('hidden');
        tabFileContent.classList.add('hidden');
    });

    btnTabFile.addEventListener('click', () => {
        btnTabFile.classList.add('active');
        btnTabUrl.classList.remove('active');
        tabFileContent.classList.remove('hidden');
        tabUrlContent.classList.add('hidden');
    });


    // ======================================================
    // 3. LÓGICA DEL ANALIZADOR INFORTECH (VirusTotal)
    // ======================================================
    const urlInput = document.getElementById('urlInput');
    const fileInput = document.getElementById('fileInput');
    const analyzeButton = document.getElementById('analyzeButton');
    const analyzeFileButton = document.getElementById('analyzeFileButton');
    const analyzerStatus = document.getElementById('analyzerStatus');
    const resultsContainer = document.getElementById('resultsContainer');

    // --- A. ANALIZAR URL ---
    analyzeButton.addEventListener('click', async () => {
        let url = urlInput.value.trim();
        if (!url) return alert("Por favor, ingresa una URL.");
        if (!url.startsWith('http')) { url = 'https://' + url; urlInput.value = url; }

        analyzerStatus.textContent = 'Analizando URL... (Espera 30s si el servidor está dormido)';
        analyzerStatus.className = 'text-lg mt-4 h-6 text-yellow-400';
        analyzeButton.disabled = true;
        analyzeButton.classList.add('loading');
        resultsContainer.innerHTML = '<p class="text-center text-gray-400">Procesando...</p>';

        // Timeout aumentado a 30s para el "cold start" de Render
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); 

        try {
            // Ejecutar ambas peticiones en paralelo (Backend + Proxy HTML)
            const [vtResult, htmlResult] = await Promise.allSettled([
                fetch(`https://infortech.onrender.com/analizar?url=${encodeURIComponent(url)}`, { signal: controller.signal })
                    .then(res => { clearTimeout(timeoutId); return res.json(); }),
                fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`)
                    .then(res => res.text())
            ]);

            let finalHtml = "";

            // 1. Procesar Resultado VirusTotal
            if (vtResult.status === 'fulfilled') {
                const data = vtResult.value;
                if (data.stats) {
                    const isSafe = data.stats.malicious === 0 && data.stats.suspicious === 0;
                    finalHtml += `
                        <div class="bg-gray-800 p-4 rounded-lg border ${isSafe ? 'border-green-500' : 'border-red-500'} mb-4">
                            <h3 class="text-xl font-bold mb-2 text-white">🛡️ Reporte de Seguridad (VirusTotal)</h3>
                            <div class="grid grid-cols-3 gap-2 text-center">
                                <div><p class="text-red-400 font-bold">Malignos</p><p class="text-2xl">${data.stats.malicious}</p></div>
                                <div><p class="text-yellow-400 font-bold">Sospechosos</p><p class="text-2xl">${data.stats.suspicious}</p></div>
                                <div><p class="text-green-400 font-bold">Seguros</p><p class="text-2xl">${data.stats.harmless}</p></div>
                            </div>
                        </div>`;
                } else {
                    finalHtml += `<p class="text-red-400 mb-4">Error VT: ${data.error || data.message || 'Desconocido'}</p>`;
                }
            } else {
                finalHtml += `<p class="text-red-400 mb-4">Error conectando al Backend: ${vtResult.reason}</p>`;
            }

            // 2. Procesar Resultado HTML
            if (htmlResult.status === 'fulfilled') {
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlResult.value, 'text/html');
                const title = doc.querySelector('title')?.textContent || 'Sin título';
                const h1 = doc.querySelector('h1')?.textContent || 'Sin H1';
                finalHtml += `
                    <div class="bg-gray-800 p-4 rounded-lg border border-blue-500">
                        <h3 class="text-xl font-bold mb-2 text-white">📄 Análisis de Contenido</h3>
                        <p><strong>Título:</strong> ${title}</p>
                        <p><strong>Encabezado H1:</strong> ${h1}</p>
                    </div>`;
            }

            resultsContainer.innerHTML = finalHtml;
            analyzerStatus.textContent = 'Análisis completado.';
            analyzerStatus.className = 'text-lg mt-4 h-6 text-green-400';

        } catch (error) {
            analyzerStatus.textContent = 'Error crítico de conexión.';
            analyzerStatus.className = 'text-lg mt-4 h-6 text-red-400';
        } finally {
            analyzeButton.disabled = false;
            analyzeButton.classList.remove('loading');
        }
    });

    // --- B. ANALIZAR ARCHIVO ---
    analyzeFileButton.addEventListener('click', async () => {
        if (!fileInput.files[0]) return alert("Selecciona un archivo primero.");

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        analyzerStatus.textContent = 'Subiendo y Analizando Archivo... (Esto toma tiempo)';
        analyzerStatus.className = 'text-lg mt-4 h-6 text-yellow-400';
        analyzeFileButton.disabled = true;
        analyzeFileButton.classList.add('loading');
        resultsContainer.innerHTML = '<p class="text-center text-gray-400">Subiendo a VirusTotal...</p>';

        try {
            const response = await fetch('https://infortech.onrender.com/analizar-archivo', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.stats) {
                resultsContainer.innerHTML = `
                    <div class="bg-gray-800 p-4 rounded-lg border border-green-500/50">
                        <h3 class="text-xl font-bold mb-2 text-white">📂 Reporte de Archivo</h3>
                        <p class="text-sm text-gray-400 mb-2">ID: ${data.meta.file_info.sha256.substring(0, 15)}...</p>
                        <ul class="space-y-1">
                            <li class="text-red-400">Malignos: ${data.stats.malicious}</li>
                            <li class="text-green-400">Inofensivos: ${data.stats.harmless}</li>
                        </ul>
                    </div>`;
                analyzerStatus.textContent = 'Análisis de archivo completado.';
                analyzerStatus.className = 'text-lg mt-4 h-6 text-green-400';
            } else {
                throw new Error(data.error || "Error desconocido del servidor");
            }

        } catch (error) {
            console.error(error);
            analyzerStatus.textContent = 'Error al analizar archivo.';
            analyzerStatus.className = 'text-lg mt-4 h-6 text-red-400';
            resultsContainer.innerHTML = `<p class="text-red-400">Detalle: ${error.message}</p>`;
        } finally {
            analyzeFileButton.disabled = false;
            analyzeFileButton.classList.remove('loading');
        }
    });

});

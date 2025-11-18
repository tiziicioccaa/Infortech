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
            if(modePVPButton) modePVPButton.classList.add('active');
            if(modePVCButton) modePVCButton.classList.remove('active');
            if(difficultySelector) difficultySelector.classList.add('hidden');
        } else {
            if(modePVCButton) modePVCButton.classList.add('active');
            if(modePVPButton) modePVPButton.classList.remove('active');
            if(difficultySelector) difficultySelector.classList.remove('hidden');
        }
        handleResetScore();
    }

    if(modePVPButton) modePVPButton.addEventListener('click', () => setGameMode('pvp'));
    if(modePVCButton) modePVCButton.addEventListener('click', () => setGameMode('pvc'));

    // --- Marcador y Tablero ---
    function updateScoreboard() {
        if(scoreXElement) scoreXElement.textContent = score.X;
        if(scoreOElement) scoreOElement.textContent = score.O;
        if(scoreDrawElement) scoreDrawElement.textContent = score.draw;
    }

    function handleResetScore() {
        score.X = 0; score.O = 0; score.draw = 0;
        initializeGame();
    }

    function initializeGame() {
        boardState.fill(null);
        currentPlayer = 'X';
        gameActive = true;
        if(statusMessage) statusMessage.textContent = `Turno de ${currentPlayer}`;
        if(gameBoardElement) {
            gameBoardElement.innerHTML = '';
            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.className = 'cell'; // Usa la clase definida en tu CSS
                cell.dataset.index = i;
                cell.addEventListener('click', handleCellClick);
                gameBoardElement.appendChild(cell);
            }
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
            if(gameBoardElement) gameBoardElement.style.pointerEvents = 'none'; 
            if(statusMessage) statusMessage.textContent = 'Pensando...';
            setTimeout(() => {
                cpuMove();
                if(gameBoardElement) gameBoardElement.style.pointerEvents = 'auto';
            }, 700);
        }
    }

    function makeMove(cell, index) {
        // Seguridad por si cell es undefined (turno CPU)
        if (!cell && gameBoardElement) cell = gameBoardElement.children[index];
        
        if (boardState[index] !== null || !gameActive) return;
        
        boardState[index] = currentPlayer;
        if(cell) {
            cell.textContent = currentPlayer;
            cell.classList.add(currentPlayer.toLowerCase());
        }

        if (checkWin()) {
            gameActive = false;
            if(statusMessage) statusMessage.textContent = `¡Ganó ${currentPlayer}!`;
            score[currentPlayer]++;
            updateScoreboard();
        } else if (checkDraw()) {
            gameActive = false;
            if(statusMessage) statusMessage.textContent = '¡Es un empate!';
            score.draw++;
            updateScoreboard();
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            if(statusMessage) statusMessage.textContent = `Turno de ${currentPlayer}`;
        }
    }

    function checkWin() {
        for (const combination of winningCombinations) {
            const [a, b, c] = combination;
            if (boardState[a] === currentPlayer && boardState[b] === currentPlayer && boardState[c] === currentPlayer) {
                if(gameBoardElement) {
                    [a,b,c].forEach(idx => {
                       const cell = gameBoardElement.children[idx];
                       // Nota: Este color debe coincidir con el diseño oscuro/claro que uses
                       if(cell) cell.style.backgroundColor = currentPlayer === 'X' ? '#1e3a8a' : '#831843';
                    });
                }
                return true;
            }
        }
        return false;
    }

    function checkDraw() { return !boardState.includes(null); }

    // --- Inteligencia Artificial (CPU) ---
    function cpuMove() {
        if (!gameActive) return;
        const difficulty = aiDifficultySelect ? aiDifficultySelect.value : 'medium';
        let move = -1;

        if (difficulty === 'easy') move = findRandomMove();
        else if (difficulty === 'medium') move = (Math.random() < 0.7) ? findSmartMove() : findRandomMove();
        else move = findSmartMove(); 
        
        if (move !== -1) {
            const cell = gameBoardElement ? gameBoardElement.children[move] : null;
            makeMove(cell, move);
        }
    }

    function findSmartMove() {
        // 1. Ganar
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === null) {
                boardState[i] = 'O';
                if (checkWinCPU('O')) { boardState[i] = null; return i; }
                boardState[i] = null;
            }
        }
        // 2. Bloquear
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === null) {
                boardState[i] = 'X';
                if (checkWinCPU('X')) { boardState[i] = null; return i; }
                boardState[i] = null;
            }
        }
        // 3. Centro
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
    
    if(resetRoundButton) resetRoundButton.addEventListener('click', initializeGame);
    if(resetScoreButton) resetScoreButton.addEventListener('click', handleResetScore);
    
    initializeGame(); 


    // ======================================================
    // 2. LÓGICA DE PESTAÑAS (URL vs ARCHIVO)
    // ======================================================
    const btnTabUrl = document.getElementById('btnTabUrl');
    const btnTabFile = document.getElementById('btnTabFile');
    // Soporte para IDs de tabs o vistas, dependiendo de tu HTML
    const tabUrlContent = document.getElementById('tabUrlContent') || document.getElementById('viewUrl');
    const tabFileContent = document.getElementById('tabFileContent') || document.getElementById('viewFile');

    if(btnTabUrl && btnTabFile) {
        btnTabUrl.addEventListener('click', () => {
            btnTabUrl.classList.add('active'); 
            btnTabFile.classList.remove('active');
            if(tabUrlContent) tabUrlContent.classList.remove('hidden'); 
            if(tabFileContent) tabFileContent.classList.add('hidden');
        });

        btnTabFile.addEventListener('click', () => {
            btnTabFile.classList.add('active'); 
            btnTabUrl.classList.remove('active');
            if(tabFileContent) tabFileContent.classList.remove('hidden'); 
            if(tabUrlContent) tabUrlContent.classList.add('hidden');
        });
    }


    // ======================================================
    // 3. LÓGICA DEL ANALIZADOR INFORTECH (VirusTotal)
    // ======================================================
    const urlInput = document.getElementById('urlInput');
    const fileInput = document.getElementById('fileInput');
    // Soporte para IDs variantes
    const analyzeButton = document.getElementById('analyzeButton') || document.getElementById('analyzeUrlBtn');
    const analyzeFileButton = document.getElementById('analyzeFileButton') || document.getElementById('analyzeFileBtn');
    const analyzerStatus = document.getElementById('analyzerStatus') || document.getElementById('statusText');
    const resultsContainer = document.getElementById('resultsContainer') || document.getElementById('resultsBox');

    // --- A. ANALIZAR URL ---
    if(analyzeButton) {
        analyzeButton.addEventListener('click', async () => {
            let url = urlInput.value.trim();
            if (!url) return alert("Por favor, ingresa una URL.");
            if (!url.startsWith('http')) { url = 'https://' + url; urlInput.value = url; }

            if(analyzerStatus) {
                analyzerStatus.textContent = 'Analizando URL... (Espera 30s si el servidor está dormido)';
                analyzerStatus.style.color = '#fdd835'; // Amarillo
            }
            analyzeButton.disabled = true;
            analyzeButton.classList.add('loading');
            if(resultsContainer) resultsContainer.innerHTML = '<p style="text-align:center; color:#888;">Procesando...</p>';

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

                renderResult(vtResult, htmlResult);
            } catch (error) {
                if(analyzerStatus) {
                    analyzerStatus.textContent = 'Error crítico de conexión (Timeout).';
                    analyzerStatus.style.color = 'red';
                }
            } finally {
                analyzeButton.disabled = false; 
                analyzeButton.classList.remove('loading');
            }
        });
    }

    // --- B. ANALIZAR ARCHIVO ---
    if(analyzeFileButton) {
        analyzeFileButton.addEventListener('click', async () => {
            if (!fileInput.files[0]) return alert("Selecciona un archivo primero.");

            const formData = new FormData();
            formData.append('file', fileInput.files[0]);

            if(analyzerStatus) {
                analyzerStatus.textContent = 'Subiendo y Analizando Archivo... (Esto toma tiempo)';
                analyzerStatus.style.color = '#fdd835';
            }
            analyzeFileButton.disabled = true;
            analyzeFileButton.classList.add('loading');
            if(resultsContainer) resultsContainer.innerHTML = '<p style="text-align:center; color:#888;">Subiendo a VirusTotal...</p>';

            try {
                const response = await fetch('https://infortech.onrender.com/analizar-archivo', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.stats) {
                    // Simulamos formato Promise.allSettled para reusar renderResult
                    renderResult({ status: 'fulfilled', value: data }, null);
                } else {
                    throw new Error(data.error || "Error desconocido del servidor");
                }

            } catch (error) {
                console.error(error);
                if(analyzerStatus) {
                    analyzerStatus.textContent = 'Error al analizar archivo.';
                    analyzerStatus.style.color = 'red';
                }
                if(resultsContainer) resultsContainer.innerHTML = `<p style="color:red;">Detalle: ${error.message}</p>`;
            } finally {
                analyzeFileButton.disabled = false; 
                analyzeFileButton.classList.remove('loading');
            }
        });
    }

    // --- FUNCIÓN PARA MOSTRAR RESULTADOS (CON DESGLOSE DE AMENAZAS) ---
    function renderResult(vt, html) {
        if(analyzerStatus) {
            analyzerStatus.textContent = 'Completado';
            analyzerStatus.style.color = '#43a047'; // Verde
        }
        let htmlContent = '';

        // 1. Procesar Resultado VirusTotal
        if (vt && vt.status === 'fulfilled') {
            const data = vt.value;
            if (data.stats) {
                const isSafe = data.stats.malicious === 0 && data.stats.suspicious === 0;
                
                // --- DESGLOSE DE AMENAZAS (NUEVO) ---
                let detectionsHtml = '';
                if (data.results) {
                    // Filtramos solo los motores que detectaron algo malo
                    const threats = Object.values(data.results).filter(r => r.category === 'malicious' || r.category === 'suspicious');
                    
                    if (threats.length > 0) {
                        detectionsHtml = `
                        <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #444;">
                            <h4 style="font-weight:bold; color:white; margin-bottom:0.5rem;">Detalles de Amenazas:</h4>
                            <ul style="font-size: 0.85rem; max-height: 150px; overflow-y: auto; background: #000; padding: 0.5rem; border-radius: 4px; list-style:none;">
                                ${threats.map(t => `
                                    <li style="margin-bottom: 4px;">
                                        <span style="color: #ef4444; font-weight: bold;">${t.engine_name}:</span> 
                                        <span style="color: #d1d5db;">${t.result}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>`;
                    } else {
                         detectionsHtml = `<div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid #444;"><p style="color:#43a047; font-size: 0.9rem;">Ningún motor detectó amenazas específicas.</p></div>`;
                    }
                }

                htmlContent += `
                <div style="background: #1e1e1e; padding: 1rem; border-radius: 0.5rem; border: 1px solid ${isSafe ? '#43a047' : '#e53935'}; margin-bottom: 1rem;">
                    <h3 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: white;">🛡️ Reporte de Seguridad</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; text-align: center;">
                        <div><p style="color: #ef4444; font-weight: bold;">Malignos</p><p style="font-size: 1.5rem; color:white;">${data.stats.malicious}</p></div>
                        <div><p style="color: #fdd835; font-weight: bold;">Sospechosos</p><p style="font-size: 1.5rem; color:white;">${data.stats.suspicious}</p></div>
                        <div><p style="color: #43a047; font-weight: bold;">Seguros</p><p style="font-size: 1.5rem; color:white;">${data.stats.harmless}</p></div>
                    </div>
                    ${detectionsHtml}
                </div>`;
            } else {
                htmlContent += `<p style="color: #ef4444;">Error VT: ${data.error || data.message || 'Desconocido'}</p>`;
            }
        } else if (vt) {
            htmlContent += `<p style="color: #ef4444;">Error conectando al Backend: ${vt.reason}</p>`;
        }

        // 2. Procesar Resultado HTML (Solo si existe)
        if (html && html.status === 'fulfilled') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html.value, 'text/html');
            const title = doc.querySelector('title')?.textContent || 'Sin título';
            const h1 = doc.querySelector('h1')?.textContent || 'Sin H1';
            htmlContent += `
                <div style="background: #1e1e1e; padding: 1rem; border-radius: 0.5rem; border: 1px solid #3b82f6;">
                    <h3 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.5rem; color: white;">📄 Análisis de Contenido</h3>
                    <p style="color: #d1d5db;"><strong>Título:</strong> ${title}</p>
                    <p style="color: #d1d5db;"><strong>Encabezado H1:</strong> ${h1}</p>
                </div>`;
        }

        if(resultsContainer) resultsContainer.innerHTML = htmlContent || '<p style="text-align:center; color:#888;">No hay resultados.</p>';
    }

});

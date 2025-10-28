// Espera a que todo el HTML esté cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- SECCIÓN 1: LÓGICA DE NAVEGACIÓN (PESTAÑAS) ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const toolContents = document.querySelectorAll('.tool-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 1. Obtiene el ID de la herramienta a mostrar (ej. "analyzer")
            const toolId = button.dataset.tool;

            // 2. Quita la clase "active" de todos los botones y contenidos
            navButtons.forEach(btn => btn.classList.remove('active'));
            toolContents.forEach(content => content.classList.remove('active'));

            // 3. Añade la clase "active" solo al botón y contenido seleccionados
            button.classList.add('active');
            document.getElementById(`tool-${toolId}`).classList.add('active');
        });
    });

    // --- SECCIÓN 2: HERRAMIENTA 1 - ANALIZADOR DE ENLACES ---
    const urlInput = document.getElementById('url-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsContainer = document.getElementById('analysis-results');

    // Elementos de resultados
    const protocolValue = document.getElementById('protocol-value');
    const protocolExplanation = document.getElementById('protocol-explanation');
    const protocolCard = document.getElementById('result-protocol');

    const domainValue = document.getElementById('domain-value');
    const domainExplanation = document.getElementById('domain-explanation');
    const domainCard = document.getElementById('result-domain');

    const subdomainValue = document.getElementById('subdomain-value');
    const subdomainExplanation = document.getElementById('subdomain-explanation');
    const subdomainCard = document.getElementById('result-subdomain');

    analyzeBtn.addEventListener('click', () => {
        let urlString = urlInput.value.trim();
        
        // Añade "https://" si el usuario no pone protocolo, para que el analizador funcione
        if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
            urlString = 'https://' + urlString;
            urlInput.value = urlString;
        }

        try {
            // 1. Usamos la API nativa del navegador para desarmar la URL
            const url = new URL(urlString);

            // 2. Analiza el Protocolo (http vs https)
            protocolValue.textContent = url.protocol;
            if (url.protocol === 'https:') {
                protocolExplanation.textContent = "¡Bien! (HTTPS) La conexión es segura y encriptada. Es un buen primer indicio.";
                protocolCard.className = 'result-card safe';
            } else {
                protocolExplanation.textContent = "¡PELIGRO! (HTTP) Esta web no es segura. Tus datos (usuarios, contraseñas) viajarían sin encriptar.";
                protocolCard.className = 'result-card danger';
            }

            // 3. Analiza el Dominio Real (El Dueño)
            // url.hostname nos da ej: "login.google.com-support.xyz"
            const parts = url.hostname.split('.');
            // El dominio real son las últimas 2 partes (ej. "com-support.xyz" o "google.com")
            // (Esto es una simplificación, pero funciona para la mayoría de los casos)
            const mainDomain = parts.slice(-2).join('.');
            
            domainValue.textContent = mainDomain;
            if (mainDomain.includes('google.com') || mainDomain.includes('netflix.com') || mainDomain.includes('bancogalicia.com')) {
                domainExplanation.textContent = "Parece ser un dominio legítimo conocido. Es probable que sea seguro.";
                domainCard.className = 'result-card safe';
            } else {
                domainExplanation.textContent = "¡ALERTA! Este es el *verdadero* dueño de la web. ¿Confías en '" + mainDomain + "'? Si esperabas ver 'google.com', esto es un engaño.";
                domainCard.className = 'result-card warning';
            }

            // 4. Analiza el Subdominio (El Engaño)
            const subdomains = parts.slice(0, -2).join('.');
            subdomainValue.textContent = subdomains || '(Ninguno)';
            if (subdomains.includes('login') || subdomains.includes('account') || subdomains.includes('google') || subdomains.includes('netflix')) {
                subdomainExplanation.textContent = "¡ENGAÑO! El atacante puso palabras clave aquí para hacerte creer que estás en un sitio oficial, pero el dominio real es el de arriba.";
                subdomainCard.className = 'result-card danger';
            } else if (subdomains) {
                subdomainExplanation.textContent = "Este es un subdominio normal, como 'mail' en 'mail.google.com'.";
                subdomainCard.className = 'result-card safe';
            } else {
                subdomainExplanation.textContent = "No se están usando subdominios para engañar.";
                subdomainCard.className = 'result-card safe';
            }

            // Muestra los resultados
            resultsContainer.style.display = 'block';

        } catch (error) {
            // Esto pasa si el usuario pone un texto inválido
            resultsContainer.style.display = 'block';
            protocolCard.className = 'result-card danger';
            protocolValue.textContent = "URL Inválida";
            protocolExplanation.textContent = "No pude analizar lo que escribiste. Asegúrate de que sea una URL válida.";
            
            domainCard.style.display = 'none'; // Ocultamos las otras tarjetas
            subdomainCard.style.display = 'none';
        }
    });

    // Oculta los resultados si el usuario empieza a escribir de nuevo
    urlInput.addEventListener('input', () => {
        resultsContainer.style.display = 'none';
        domainCard.style.display = 'block';
        subdomainCard.style.display = 'block';
    });


    // --- SECCIÓN 3: HERRAMIENTA 2 - JUEGO DE PHISHING ---

    // Define los desafíos del juego
    const challenges = [
        {
            title: 'Desafío 1: Email de Netflix',
            image: 'https://placehold.co/600x300/222/FFF?text=Email+FALSO+de+Netflix',
            isPhishing: true,
            explanation: "¡Correcto! Es phishing. Fíjate que el remitente es 'info@net-flix.com' (con guion) y el enlace te pide 'verificar tu cuenta' creando urgencia."
        },
        {
            title: 'Desafío 2: SMS del Banco',
            image: 'https://placehold.co/600x300/FFF/000?text=SMS+FALSO+del+Banco',
            isPhishing: true,
            explanation: "¡Bien hecho! Los bancos NUNCA te pedirán tu clave o que entres a un enlace por SMS. El enlace 'banco-seguridad.xyz' es claramente falso."
        },
        {
            title: 'Desafío 3: Email de Google (Real)',
            image: 'https://placehold.co/600x300/4285F4/FFF?text=Email+REAL+de+Google',
            isPhishing: false,
            explanation: "¡Correcto! Este email es real. Proviene de '@google.com' y el enlace te lleva a 'myaccount.google.com'. No te pide contraseñas, solo te informa."
        },
        {
            title: '¡Juego Terminado!',
            image: 'https://placehold.co/600x300/1DB954/FFF?text=¡Felicitaciones!',
            isPhishing: null, // Marca de fin
            explanation: "Completaste todos los desafíos. ¡Ahora estás más atento a los engaños!"
        }
    ];

    let currentChallengeIndex = 0;

    // Elementos del DOM del juego
    const challengeTitle = document.getElementById('challenge-title');
    const challengeImage = document.getElementById('challenge-image');
    const btnReal = document.getElementById('btn-real');
    const btnPhishing = document.getElementById('btn-phishing');
    const feedbackCard = document.getElementById('feedback-card');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    const btnNext = document.getElementById('btn-next');

    // Función para cargar un desafío
    function loadChallenge(index) {
        const challenge = challenges[index];
        
        challengeTitle.textContent = challenge.title;
        challengeImage.src = challenge.image;

        // Si es el fin del juego, oculta los botones de decisión
        if (challenge.isPhishing === null) {
            btnReal.style.display = 'none';
            btnPhishing.style.display = 'none';
            // Muestra el feedback final
            showFeedback(true, challenge.explanation); // true solo para que se vea verde
            btnNext.textContent = "Reiniciar Juego";
        } else {
            // Estado normal
            btnReal.style.display = 'inline-flex';
            btnPhishing.style.display = 'inline-flex';
            feedbackCard.style.display = 'none'; // Oculta el feedback
            btnNext.textContent = "Siguiente Desafío";
        }
    }

    // Función para manejar la respuesta del usuario
    function handleAnswer(userGuess) { // userGuess es true (para "real") o false (para "phishing")
        const challenge = challenges[currentChallengeIndex];
        const correctAnswer = !challenge.isPhishing; // La respuesta correcta es lo opuesto a si es phishing

        if (userGuess === correctAnswer) {
            // Respuesta correcta
            showFeedback(true, challenge.explanation);
        } else {
            // Respuesta incorrecta
            showFeedback(false, "¡Incorrecto! " + challenge.explanation);
        }
    }

    // Función para mostrar la tarjeta de feedback
    function showFeedback(isCorrect, explanation) {
        feedbackCard.style.display = 'block';
        feedbackExplanation.textContent = explanation;

        if (isCorrect) {
            feedbackTitle.textContent = "¡Correcto!";
            feedbackCard.className = 'feedback-card correct';
        } else {
            feedbackTitle.textContent = "¡Incorrecto!";
            feedbackCard.className = 'feedback-card incorrect';
        }
    }

    // --- Listeners de los botones del juego ---
    btnReal.addEventListener('click', () => {
        handleAnswer(true); // El usuario adivinó "Real"
    });

    btnPhishing.addEventListener('click', () => {
        handleAnswer(false); // El usuario adivinó "Phishing"
    });

    btnNext.addEventListener('click', () => {
        currentChallengeIndex++; // Avanza al siguiente desafío
        
        // Si llegamos al final, reinicia
        if (currentChallengeIndex >= challenges.length) {
            currentChallengeIndex = 0;
        }
        
        loadChallenge(currentChallengeIndex);
    });

    // Carga el primer desafío (índice 0) al iniciar la app
    loadChallenge(currentChallengeIndex);

});



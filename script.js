document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('.nav-btn');
    const toolContents = document.querySelectorAll('.tool-content');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const toolId = button.dataset.tool;
            navButtons.forEach(btn => btn.classList.remove('active'));
            toolContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`tool-${toolId}`).classList.add('active');
        });
    });

    const urlInput = document.getElementById('url-input');
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultsContainer = document.getElementById('analysis-results');

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

        if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
            urlString = 'https://' + urlString;
            urlInput.value = urlString;
        }

        try {
            const url = new URL(urlString);

            protocolValue.textContent = url.protocol;
            if (url.protocol === 'https:') {
                protocolExplanation.textContent = "¡Bien! (HTTPS) La conexión es segura y encriptada. Es un buen primer indicio.";
                protocolCard.className = 'result-card safe';
            } else {
                protocolExplanation.textContent = "¡PELIGRO! (HTTP) Esta web no es segura. Tus datos (usuarios, contraseñas) viajarían sin encriptar.";
                protocolCard.className = 'result-card danger';
            }

            const parts = url.hostname.split('.');
            const mainDomain = parts.slice(-2).join('.');

            domainValue.textContent = mainDomain;
            if (mainDomain.includes('google.com') || mainDomain.includes('netflix.com') || mainDomain.includes('bancogalicia.com')) {
                domainExplanation.textContent = "Parece ser un dominio legítimo conocido. Es probable que sea seguro.";
                domainCard.className = 'result-card safe';
            } else {
                domainExplanation.textContent = "¡ALERTA! Este es el *verdadero* dueño de la web. ¿Confías en '" + mainDomain + "'? Si esperabas ver 'google.com', esto es un engaño.";
                domainCard.className = 'result-card warning';
            }

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

            resultsContainer.style.display = 'block';

        } catch (error) {
            resultsContainer.style.display = 'block';
            protocolCard.className = 'result-card danger';
            protocolValue.textContent = "URL Inválida";
            protocolExplanation.textContent = "No pude analizar lo que escribiste. Asegúrate de que sea una URL válida.";
            domainCard.style.display = 'none';
            subdomainCard.style.display = 'none';
        }
    });

    urlInput.addEventListener('input', () => {
        resultsContainer.style.display = 'none';
        domainCard.style.display = 'block';
        subdomainCard.style.display = 'block';
    });

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
            isPhishing: null,
            explanation: "Completaste todos los desafíos. ¡Ahora estás más atento a los engaños!"
        }
    ];

    let currentChallengeIndex = 0;

    const challengeTitle = document.getElementById('challenge-title');
    const challengeImage = document.getElementById('challenge-image');
    const btnReal = document.getElementById('btn-real');
    const btnPhishing = document.getElementById('btn-phishing');
    const feedbackCard = document.getElementById('feedback-card');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackExplanation = document.getElementById('feedback-explanation');
    const btnNext = document.getElementById('btn-next');

    function loadChallenge(index) {
        const challenge = challenges[index];
        challengeTitle.textContent = challenge.title;
        challengeImage.src = challenge.image;

        if (challenge.isPhishing === null) {
            btnReal.style.display = 'none';
            btnPhishing.style.display = 'none';
            showFeedback(true, challenge.explanation);
            btnNext.textContent = "Reiniciar Juego";
        } else {
            btnReal.style.display = 'inline-flex';
            btnPhishing.style.display = 'inline-flex';
            btnReal.disabled = false;
            btnPhishing.disabled = false;
            feedbackCard.style.display = 'none';
            btnNext.textContent = "Siguiente Desafío";
        }
    }

    function handleAnswer(userGuess) {
        btnReal.disabled = true;
        btnPhishing.disabled = true;
        const challenge = challenges[currentChallengeIndex];
        const correctAnswer = (challenge.isPhishing === false);
        if (userGuess === correctAnswer) {
            showFeedback(true, challenge.explanation);
        } else {
            showFeedback(false, "¡Incorrecto! " + challenge.explanation);
        }
    }

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

    btnReal.addEventListener('click', () => {
        handleAnswer(true);
    });

    btnPhishing.addEventListener('click', () => {
        handleAnswer(false);
    });

    btnNext.addEventListener('click', () => {
        currentChallengeIndex++;
        if (currentChallengeIndex >= challenges.length) {
            currentChallengeIndex = 0;
        }
        loadChallenge(currentChallengeIndex);
    });

    loadChallenge(currentChallengeIndex);
});

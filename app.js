document.addEventListener('DOMContentLoaded', function() {

    const globals = {};

    const SECTIONS = {
        accueil: document.querySelector('section[aria-labelledby="accueil"]'),
        jouer: document.querySelector('section[aria-labelledby="jouer"]'),
        fin: document.querySelector('section[aria-labelledby="fin"]'),
        history: document.querySelector('section[aria-labelledby="history"]'),
    }

    const DIALOGS = {
        'select-difficulty': document.querySelector('dialog.select-difficulty'),
        'confirm-quit': document.querySelector('dialog.confirm-quit')
    }

    const OUTPUTS = {
        'score': document.querySelector('output[name="score"]'),
        'time': document.querySelector('output[name="time"]'),
        'time-remaining': document.querySelector('output[name="time-remaining"]'),
        'level': document.querySelector('output[name="level"]'),
        'word': document.querySelector('output[name="word"]'),
        'final-score': document.querySelector('output[name="final-score"]')
    };

    const DIFFICULTIES = {
        facile: {
            'start-time': 32,
            'min-time': 8,
            'words-per-level': 8,
        },
        moyen: {
            'start-time': 24,
            'min-time': 6,
            'words-per-level': 6,
        },
        difficile: {
            'start-time': 16,
            'min-time': 2,
            'words-per-level': 4,
        },
        default: {
            'start-time': 32,
            'min-time': 8,
            'words-per-level': 8,
        }
    };

    const DBOpenRequest = indexedDB.open('typing-game', 1);

    DBOpenRequest.onerror = function(event) {
        console.error('Erreur lors de l\'ouverture de la base de données');
    };

    DBOpenRequest.onsuccess = function(event) {
        globals.db = DBOpenRequest.result;
    };

    DBOpenRequest.onupgradeneeded = function(event) {
        const db = event.target.result;
        const objectStore = db.createObjectStore('scores', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('difficulty', 'difficulty', { unique: false });
        objectStore.createIndex('score', 'score', { unique: false });
        objectStore.createIndex('date', 'date', { unique: false });
        objectStore.createIndex('time', 'time', { unique: false });
    };

    // Common events 
    (function(){
        const headers = document.querySelectorAll('section[aria-labelledby] > header');
        for (let i = 0; i < headers.length; i++) {
            headers[i].addEventListener('click', function({target}) {
                const section = target.closest('section');
                const ariaLabelledBy = section.getAttribute('aria-labelledby');
                SECTIONS[ariaLabelledBy].hidden = true;
                SECTIONS.accueil.hidden = false;
            });
        }
    })();

    // Home events
    (function() {
        const callbacks = {
            jouer: () => {
                displayModal('select-difficulty');
            },
            history: () => {
                loadScores();
                SECTIONS.history.hidden = false;
                SECTIONS.accueil.hidden = true;
            },
            default: () => {
                // console.log('default');
            }
        };
        const links = SECTIONS.accueil.querySelector('ul').children;
        for (let i = 0; i < links.length; i++) {
            links[i].addEventListener('click', callbacks[links[i].children[0].getAttribute('aria-labelledby')] ?? callbacks.default);
        }
    })();

    // Common dialogs events
    (function(){
        const children = document.body.children;
        const dialogs = document.querySelectorAll('dialog');

        for (let i = 0; i < dialogs.length; i++) {
            const header = dialogs[i].querySelector('header');

            header.addEventListener('dblclick', function() {
                if (dialogs[i].querySelector('section').hidden) {
                    const maximize = header.querySelector('button.maximize');
                    maximize.click();
                    return;
                }
                const minimize = header.querySelector('button.minimize');
                minimize.click();
            });

            // Apply drag move to dialog header
            header.addEventListener('mousedown', function(e) {
                const dialog = e.target.closest('dialog');
                const x = e.clientX - dialog.offsetLeft;
                const y = e.clientY - dialog.offsetTop;
                document.addEventListener('mousemove', moveDialog);
                document.addEventListener('mouseup', function() {
                    document.removeEventListener('mousemove', moveDialog);                    
                    for (let i = 0; i < children.length; i++) {
                        if (children[i] !== dialog) {
                            children[i].inert = false;
                        }
                    }
                });
                function moveDialog(e) {
                    for (let i = 0; i < children.length; i++) {
                        if (children[i] !== dialog) {
                            children[i].inert = true;
                        }
                    }

                    requestAnimationFrame(function() {
                        dialog.style.left = Math.max(0, Math.min(e.clientX - x, window.innerWidth - dialog.offsetWidth)) + 'px';
                        dialog.style.top = Math.max(0, Math.min(e.clientY - y, window.innerHeight - dialog.offsetHeight)) + 'px';
                    });
                }
            });

            const nav = {
                close: dialogs[i].querySelector('nav button.close'),
                minimize: dialogs[i].querySelector('nav button.minimize'),
                maximize: dialogs[i].querySelector('nav button.maximize')
            };

            nav.close.addEventListener('click', function() {
                dialogs[i].close();
            });

            nav.minimize.addEventListener('click', function() {
                requestAnimationFrame(function() {
                    dialogs[i].querySelector('section').hidden = true;
                    nav.minimize.hidden = true;
                    nav.maximize.hidden = false;
                });
            });

            nav.maximize.addEventListener('click', function() {
                requestAnimationFrame(function() {
                    dialogs[i].querySelector('section').hidden = false;
                    nav.maximize.hidden = true;
                    nav.minimize.hidden = false;
                });
            });
        }
    })();

    // Select difficulty dialog events
    (function() {
        const dialog = DIALOGS['select-difficulty'];
        const form = dialog.querySelector('form');
        const inputs = form.querySelectorAll('input[type="number"]');
        const labels = dialog.querySelectorAll('section > form > nav > ul > li > label');
        const callbacks = {
            facile: () => {
                // console.log('facile');
            },
            moyen: () => {
                // console.log('moyen');
            },
            difficile: () => {
                // console.log('difficile');
            },
            personnalise: () => {
                // console.log('personnalise');
            },
            default: () => {
                // console.log('default');
            }
        };
        for (let i = 0; i < labels.length; i++) {
            const name = labels[i].querySelector('input').value ?? 'default';
            const method = callbacks[name] ?? callbacks.default;
            if (!labels[i].onclick) labels[i].onclick = function(){
                method();
                
                if ('personnalise' !== name) {
                    for (let i = 0; i < inputs.length; i++) {
                        const input = inputs[i];
                        input.readOnly = true;
                        if (DIFFICULTIES[name][input.name]) {
                            input.value = DIFFICULTIES[name][input.name];
                        }
                    }
                    return;
                }
                for (let i = 0; i < inputs.length; i++) {
                    const input = inputs[i];
                    input.readOnly = false;
                    input.value = DIFFICULTIES.default[input.name];
                }
            };
        }
        labels[labels.length-1].click();

        form.addEventListener('submit', async function() {
            const data = new FormData(form);
            const config = {
                'start-time': +data.get('start-time'),
                'min-time': +data.get('min-time'),
                'words-per-level': +data.get('words-per-level'),
            };
            dialog.close();
            SECTIONS.accueil.hidden = true;
            SECTIONS.jouer.hidden = false;
            await startGame(config);
        });
    })();

    // Confirm quit dialog events
    (function() {
        const dialog = DIALOGS['confirm-quit'];
        const buttons = {
            no: dialog.querySelector('button[data-name="no"]'),
            yes: dialog.querySelector('button[data-name="yes"]')
        }
        buttons.no.addEventListener('click', function() {
            dialog.close();
        });
        buttons.yes.addEventListener('click', function() {
            dialog.close();
            globals.gameOver();
        });
    })();

    // Fin events
    (function() {
        const links = SECTIONS.fin.querySelectorAll('nav > ul > li > a');
        const callbacks = {
            quit: () => {
                SECTIONS.fin.hidden = true;
                SECTIONS.accueil.hidden = false;
            },
            replay: () => {
                SECTIONS.fin.hidden = true;
                SECTIONS.accueil.hidden = false;
                displayModal('select-difficulty');
            }
        };
        for (let i = 0; i < links.length; i++) {
            links[i].addEventListener('click', callbacks[links[i].dataset.name]);
        }

    })();

    // Jouer events
    (function() {
        const quit = SECTIONS.jouer.querySelector('button[data-name="quit-game"]');
        quit.addEventListener('click', function() {
            displayModal('confirm-quit');
        });
    })();

    async function startGame({
        'start-time': startTime = 32,
        'min-time': minTime = 4,
        'words-per-level': wordsPerLevel = 5
    }) {

        let word;
        let score = 0;
        let level = 1;

        let start_at = Date.now();
        
        let difficulty = {
            'start-time': startTime,
            'min-time': minTime,
            'words-per-level': wordsPerLevel
        }; 

        let time = startTime;

        let words = [];

        let interval_time_remaining;

        let paused = false;

        await fetch('./text_1.txt')
            .then(response => response.text())
            .then(text => {
                text = text
                    .toLowerCase()
                    .replace(/(\r\n|\n|\r)/gm, ' ')
                    .replace(/[.,\/#!$%\^&\*;:{}=_`~()]/g, '')
                    .replace(/([a-z]+)[’']/g, '');

                words = text.split(' ');
                words = [...new Set(words)];
                words = words
                    .filter(word => !/^\d+$/.test(word))
                    .filter(word => word.length > 2);
            });

        const section = SECTIONS.jouer;
        const input = section.querySelector('input[name="user-word"]');

        // We set to input.value but this should be an empty string
        let word_typed = input.value, previous_word_typed = '';

        let ctrl_key_pressed = false;
        window.addEventListener('keydown', function(e) {
            if (e.key === 'Control') ctrl_key_pressed = true;
        });

        window.addEventListener('keyup', function(e) {
            if (e.key === 'Control') ctrl_key_pressed = false;
            if (e.key === 'Escape') {
                paused = !paused;
                if (!paused) {
                    DIALOGS['confirm-quit'].close();
                    return;
                }
                displayModal('confirm-quit');
            }
        });



        input.addEventListener('input', function() {
            if (ctrl_key_pressed || paused) {
                input.value = previous_word_typed;
                return;
            }

            previous_word_typed = word_typed;
            word_typed = input.value;

            // Remove all accents of word
            const word_typed_normalized = word_typed
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();

            // if the word typed is in the list of words
            if (word === word_typed_normalized) {
                nextRound();
            }
        });

        round();
        input.focus();

        updateOutput('score', score);
        updateOutput('level', level);

        // A round is a word to type
        function round() {
            let time_remaining = time;
            word = getRandomWord();
            
            updateOutput('word', word);
            updateOutput('time', time);
            updateOutput('time-remaining', time);

            interval_time_remaining = setInterval(function() {
                if (paused) return;
                if (--time_remaining < 0) {
                    gameOver();
                }
                updateOutput('time-remaining', time_remaining);
            }, 1000);
        }

        function getRandomWord() {
            let random_word;
            do {
                random_word = words[Math.floor(Math.random() * words.length)].normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            } while (word == random_word)
            return random_word;
        }

        function nextRound() {
            score++;
            if (score % wordsPerLevel === 0) {
                level++;

                time = Math.max(time - 1, minTime);
                time_remaining = time;
                performAnimation('level-up');
                updateOutput('level', level);
            }
            performAnimation('score-up');
            updateOutput('score', score);
            clearRound();
            round();
        }

        function clearRound() {
            input.value = '';
            clearInterval(interval_time_remaining);
        }

        function gameOver() {
            clearRound();

            let ends_at = Date.now();

            let time_played = Math.floor((ends_at - start_at) / 1000);

            saveScore({
                difficulty,
                time: time_played,
                score
            })
            updateOutput('final-score', score);
            section.hidden = true;
            SECTIONS.fin.hidden = false;
        }
        globals.gameOver = gameOver;

        function performAnimation(name) {
            const animations = {
                'level-up': () => {
                    addUpAnimation(OUTPUTS.level);
                },
                'score-up': () => {
                    addUpAnimation(OUTPUTS.score);
                }
            }
            
            try {
                requestAnimationFrame(animations[name]);
            }
            catch (e) {
                console.error(e);
            }

            function addUpAnimation(output) {
                const span = document.createElement('span');
                span.textContent = '+1';
                span.style.top = output.offsetTop - 3 + 'px';
                span.style.left = output.offsetLeft + output.offsetWidth + 3 + 'px';
                span.classList.add('animation-plus');
                output.parentElement.insertBefore(span, output);
                setTimeout(() => {
                    span.remove();
                }, 1000);
            }
        }
    }

    function updateOutput(name, value) {
        try {
            OUTPUTS[name].value = value;
        }
        catch (e) {
            console.error(e);
        }
    }

    function displayModal(name) {
        const dialog = DIALOGS[name];
        dialog.style.top = (window.innerHeight - dialog.offsetHeight) / 2.5 + 'px';
        dialog.style.left = (window.innerWidth - dialog.offsetWidth) / 2.5 + 'px';
        dialog.showModal();
    }

    function saveScore({
        difficulty,
        time,
        score
    }) {
        const transaction = globals.db.transaction('scores', 'readwrite');
        const store = transaction.objectStore('scores');
        store.add({
            difficulty,
            time,
            score,
            date: new Date()
        });

        transaction.oncomplete = function() {
            console.log('Transaction completed: database modification finished.');
        };

        transaction.onerror = function() {
            console.log('Transaction not opened due to error: ' + transaction.error);
        };
    }

    async function loadScores() {
        const transaction = globals.db.transaction('scores', 'readwrite');
        const store = transaction.objectStore('scores');
        const request = store.getAll();

        request.onsuccess = function() {
            displayScores(request.result);
        }

        transaction.oncomplete = function() {
            console.log('Transaction completed: scores loaded.');
        }

        transaction.onerror = function() {
            console.log('Transaction not opened due to error: ' + transaction.error);
        }
    }

    function displayScores(scores) {
        const {history: section} = SECTIONS;
        const table = section.querySelector('table');
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        for (let i = scores.length; i--;) {
            const score = scores[i];
            const element = (function({
                difficulty,
                time,
                date,
                score
            }) {
                date = date.toISOString()
                date = date.replace('T', ' ').replace('Z', '')
                    .substring(0, date.lastIndexOf('.'));

                time = Math.floor(time / 60) + "' " + time % 60 + '"';

                const html = `<tr>
                    <td data-value='${JSON.stringify(difficulty)}'>
                        <a href="javascript:void(0)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                <path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286zm1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94z"/>
                            </svg>
                        </a>
                    </td>
                    <td>${date}</td>
                    <td>${time}</td>
                    <td>${score}</td>
                </tr>`;
                const element = parseHtmlToElement(html);

                const difficulty_icon_link = element.querySelector('td:first-child > a');
                const tooltip = (function() {
                    const html = `<div class="tooltip" hidden>
                        <p>
                            <span>Start time :</span>
                            <span>${difficulty['start-time']}</span>
                        </p>
                        <p>
                            <span>Min. time :</span>
                            <span>${difficulty['min-time']}</span>
                        </p>
                        <p>
                            <span>Words per level :</span>
                            <span>${difficulty['words-per-level']}</span>
                        </p>
                    </div>`;
                    return parseHtmlToElement(html);
                })();
                difficulty_icon_link.addEventListener('mouseenter', () => {  
                    tooltip.hidden = false;
                });
                difficulty_icon_link.addEventListener('mouseleave', () => {
                    tooltip.hidden = true;
                });
                difficulty_icon_link.appendChild(tooltip);
                return element;
            })(score);
            tbody.appendChild(element);
        }
    }

    function parseHtmlToElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content.firstElementChild.cloneNode(true);
    }
});
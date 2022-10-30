document.addEventListener('DOMContentLoaded', function() {

    const globals = {};

    const SECTIONS = {
        accueil: document.querySelector('section[aria-labelledby="accueil"]'),
        jouer: document.querySelector('section[aria-labelledby="jouer"]'),
        fin: document.querySelector('section[aria-labelledby="fin"]')
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
        'word': document.querySelector('output[name="word"]')
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

    // Home events
    (function() {
        const callbacks = {
            jouer: () => {
                displayModal('select-difficulty');
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
                // console.log('quitter');
                SECTIONS.fin.hidden = true;
                SECTIONS.accueil.hidden = false;
            },
            replay: () => {
                // console.log('replay');
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
        
        let time = startTime;

        let words = [];

        let interval_time_remaining;

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
        let word_typed = input.value;

        input.addEventListener('input', function() {
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
        OUTPUTS[name].value = value;
    }

    function displayModal(name) {
        const dialog = DIALOGS[name];
        dialog.style.top = (window.innerHeight - dialog.offsetHeight) / 2.5 + 'px';
        dialog.style.left = (window.innerWidth - dialog.offsetWidth) / 2.5 + 'px';
        dialog.showModal();
    }
});
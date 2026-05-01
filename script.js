const morseCode = {
    'A': '・ー', 'B': 'ー・・・', 'C': 'ー・ー・', 'D': 'ー・・', 'E': '・',
    'F': '・・ー・', 'G': 'ーー・', 'H': '・・・・', 'I': '・・', 'J': '・ーーー',
    'K': 'ー・ー', 'L': '・ー・・', 'M': 'ーー', 'N': 'ー・', 'O': 'ーーー',
    'P': '・ーー・', 'Q': 'ーー・ー', 'R': '・ー・', 'S': '・・・', 'T': 'ー',
    'U': '・・ー', 'V': '・・・ー', 'W': '・ーー', 'X': 'ー・・ー', 'Y': 'ー・ーー', 'Z': 'ーー・・'
};

let currentMode = '';
let currentQuestion = '';
let currentAnswer = '';
let score = 0;
let isPlaying = false;
let pressStartTime = 0;
let pressDurations = [150];

// オーディオ設定
let audioCtx = null;
let oscillator = null;

const startMenu = document.getElementById('start-menu');
const gameArea = document.getElementById('game-area');
const modeText = document.getElementById('mode-text');
const questionDisplay = document.getElementById('question-display');
const inputDisplay = document.getElementById('input-display');
const scoreDisplay = document.getElementById('score');
const indicator = document.getElementById('tap-indicator');

// 音を鳴らす関数
function startTone() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine'; // 柔らかな音
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime); // 600Hz
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // 音量調節
    oscillator.start();
}

function stopTone() {
    if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
    }
}

// モードに応じて遊ぶ
function startGame(mode) {
    currentMode = mode;
    isPlaying = true;
    score = 0;
    scoreDisplay.innerText = score;
    startMenu.style.display = 'none';
    gameArea.style.display = 'block';
    nextQuestion();
}

// --- nextQuestion関数 ---
function nextQuestion() {
    const keys = Object.keys(morseCode);
    currentQuestion = keys[Math.floor(Math.random() * keys.length)];
    currentAnswer = "";
    inputDisplay.innerText = "";

    if (currentMode === 'READ') {
        modeText.innerText = "モード: 受信 (音を聴いて文字を打つ)";
        questionDisplay.innerText = "???"; // 符号を隠す
        
        // 少し間を置いてから音を鳴らす
        setTimeout(() => {
            playMorseSequence(morseCode[currentQuestion]);
        }, 500);
    } else {
        modeText.innerText = "モード: 送信 (文字を見てスペースで打つ)";
        questionDisplay.innerText = currentQuestion;
    }
}

function checkAnswer(input) {
    const targetMorse = morseCode[currentQuestion];
    const isCorrect = (currentMode === 'READ')
        ? input.toUpperCase() === currentQuestion
        : input === targetMorse;

    if (isCorrect) {
        score += 10;
        scoreDisplay.innerText = score;
        nextQuestion();
    } else {
        // ミス判定時の処理
        currentAnswer = "";
        
        if (currentMode === 'READ') {
            inputDisplay.innerText = "MISS! Listen again...";
            // --- 追加：間違えた時に正解の音を再再生する ---
            playMorseSequence(targetMorse);
        } else {
            inputDisplay.innerText = "MISS!";
        }

        // 画面を揺らす演出
        gameArea.classList.add('miss-shake');
        setTimeout(() => {
            gameArea.classList.remove('miss-shake');
            if (inputDisplay.innerText.startsWith("MISS")) {
                inputDisplay.innerText = "";
            }
        }, 500);
    }
}

// --- 追加：自動でモールス信号を鳴らす関数 ---
async function playMorseSequence(sequence) {
    // ユーザーが別の問題を解いている間に音が重ならないように制御
    for (const char of sequence) {
        if (char === '・') {
            startTone();
            await new Promise(r => setTimeout(r, 100)); // トンの長さ
            stopTone();
        } else if (char === 'ー') {
            startTone();
            await new Promise(r => setTimeout(r, 300)); // ツーの長さ
            stopTone();
        }
        await new Promise(r => setTimeout(r, 100)); // 符号間の無音
    }
}

window.addEventListener('keydown', (e) => {
    if (!isPlaying || e.repeat) return;

    if (currentMode === 'WRITE' && e.code === 'Space') {
        // 送信モード：打鍵の開始
        pressStartTime = Date.now();
        indicator.classList.add('active');
        startTone();
    } else if (currentMode === 'READ') {
        // 受信モード
        if (e.code === 'Space') {
            // スペースキーならリプレイ
            playMorseSequence(morseCode[currentQuestion]);
        } else {
            // それ以外のキーなら回答チェック
            checkAnswer(e.key);
        }
    }
});

window.addEventListener('keyup', (e) => {
    // 送信モードの時だけ、スペースキー離上時の「トン・ツー判定」を行う
    if (currentMode === 'WRITE' && e.code === 'Space') {
        stopTone();
        const duration = Date.now() - pressStartTime;
        indicator.classList.remove('active');
        
        // 固定値（例：120ms）で判定
        const threshold = 120; 
        const type = duration > threshold ? 'ー' : '・';
        
        currentAnswer += type;
        inputDisplay.innerText = currentAnswer;

        if (currentAnswer.length === morseCode[currentQuestion].length) {
            checkAnswer(currentAnswer);
        }
    }
});

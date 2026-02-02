import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, onValue, set, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// ----- Firebase config -----
const firebaseConfig = {
  apiKey: "AIzaSyAMp5-wqinWTl4z0ms6bmnXgm9EvqPcbug",
  authDomain: "mytwoplayergame.firebaseapp.com",
  projectId: "mytwoplayergame",
  storageBucket: "mytwoplayergame.firebasestorage.app",
  messagingSenderId: "1003705475156",
  appId: "1:1003705475156:web:0d56aeef31623413238dc1",
  measurementId: "G-1KN2B16XVG"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ----- משתנים -----
let gameCode = "";
let playerId = "";
let gameData = null;
let isMyTurn = false;
let myBombs = [];
let hearts = { me: 3, opponent: 3 };

const createGameBtn = document.getElementById("createGameBtn");
const joinGameBtn = document.getElementById("joinGameBtn");
const codeInput = document.getElementById("codeInput");
const gameContainer = document.getElementById("gameContainer");
const gameCodeDisplay = document.getElementById("gameCodeDisplay");

const myBoardEl = document.getElementById("myBoard");
const opponentBoardEl = document.getElementById("opponentBoard");

const myHeartsEl = document.getElementById("myHearts");
const opponentHeartsEl = document.getElementById("opponentHearts");

// ----- פונקציות -----
function generateGameCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createGame() {
  gameCode = generateGameCode();
  playerId = "player1";
  const gameRef = ref(db, `games/${gameCode}`);

  set(gameRef, {
    player1: playerId,
    player2: null,
    status: "waiting",
    turn: playerId,
    board: { player1: [], player2: [] },
    hearts: { player1: 3, player2: 3 }
  });

  listenToGame();
  gameContainer.style.display = "block";
  gameCodeDisplay.textContent = gameCode;
  alert(`משחק נוצר! שלח את הקוד לחבר: ${gameCode}`);
}

function joinGame(code) {
  if (!code) return alert("אנא הכנס קוד!");
  gameCode = code.toUpperCase();
  playerId = "player2";

  const gameRef = ref(db, `games/${gameCode}`);
  get(gameRef).then(snapshot => {
    if (!snapshot.exists()) return alert("קוד לא קיים!");
    const data = snapshot.val();
    if (data.player2) return alert("משחק מלא!");

    set(ref(db, `games/${gameCode}/player2`), playerId);
    set(ref(db, `games/${gameCode}/status`), "choosing");
    listenToGame();
    gameContainer.style.display = "block";
    gameCodeDisplay.textContent = gameCode;
    alert("הצטרפת למשחק! בחר 3 פצצות על הלוח שלך.");
  });
}

function listenToGame() {
  const gameRef = ref(db, `games/${gameCode}`);
  onValue(gameRef, snapshot => {
    gameData = snapshot.val();
    if (!gameData) return;

    // עדכון לבבות
    if (playerId === "player1") {
      hearts.me = gameData.hearts.player1;
      hearts.opponent = gameData.hearts.player2;
    } else {
      hearts.me = gameData.hearts.player2;
      hearts.opponent = gameData.hearts.player1;
    }
    myHeartsEl.textContent = hearts.me;
    opponentHeartsEl.textContent = hearts.opponent;

    isMyTurn = gameData.turn === playerId;
    renderBoards();
  });
}

function renderBoards() {
  myBoardEl.innerHTML = "";
  opponentBoardEl.innerHTML = "";

  const myCells = gameData.board[playerId] || [];
  const opponentId = playerId === "player1" ? "player2" : "player1";
  const opponentCells = gameData.board[opponentId] || [];

  for (let i = 0; i < 9; i++) {
    // לוח שלי
    const myCell = document.createElement("div");
    myCell.classList.add("cell");
    if (myCells.includes(i)) myCell.classList.add("bomb");
    if (gameData.status === "choosing") myCell.onclick = () => selectBomb(i);
    myBoardEl.appendChild(myCell);

    // לוח היריב
    const opCell = document.createElement("div");
    opCell.classList.add("cell");
    if (opponentCells.includes(i) && gameData.status !== "choosing") opCell.classList.add("bomb");
    if (gameData.status === "attacking" && isMyTurn) opCell.onclick = () => attackCell(i);
    opponentBoardEl.appendChild(opCell);
  }
}

function selectBomb(index) {
  if (myBombs.includes(index)) return;
  if (myBombs.length >= 3) return alert("בחרת כבר 3 פצצות!");
  myBombs.push(index);
  set(ref(db, `games/${gameCode}/board/${playerId}`), myBombs);

  const otherId = playerId === "player1" ? "player2" : "player1";
  const otherBoard = gameData.board[otherId];
  if (myBombs.length === 3 && otherBoard && otherBoard.length === 3) {
    set(ref(db, `games/${gameCode}/status`), "attacking");
    set(ref(db, `games/${gameCode}/turn`), "player1");
  }
}

function attackCell(index) {
  if (!isMyTurn) return alert("לא התור שלך!");
  const opponentId = playerId === "player1" ? "player2" : "player1";
  const opponentBombs = gameData.board[opponentId] || [];
  let hit = opponentBombs.includes(index);

  const newHearts = { ...gameData.hearts };
  if (hit) {
    newHearts[playerId === "player1" ? "player1" : "player2"] -= 1;
    alert("Boom! פצצה!");
  } else {
    alert("Safe!");
  }
  set(ref(db, `games/${gameCode}/hearts`), newHearts);

  const newBoard = { ...gameData.board };
  newBoard[opponentId] = newBoard[opponentId].filter(i => i !== index);
  set(ref(db, `games/${gameCode}/board`), newBoard);

  const nextTurn = playerId === "player1" ? "player2" : "player1";
  set(ref(db, `games/${gameCode}/turn`), nextTurn);
}

window.addEventListener("DOMContentLoaded", () => {
  createGameBtn.onclick = createGame;
  joinGameBtn.onclick = () => joinGame(codeInput.value);
});

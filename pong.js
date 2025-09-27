// Pong Game Assignment - MVC Architecture
// Jay Nipper - SSE 657 - Mercer University - FA2025

// Setup Canvas

const canvas = document.getElementById("pongscreen");
const ctx = canvas.getContext("2d");

// Audio Elements

const audioStart = document.getElementById("start");
const audioWall = document.getElementById("wall");
const audioPaddle = document.getElementById("paddle");
const audioPoint = document.getElementById("point");

// Game State

const BALL_INITIAL_X_SPEED = 5; // Initial horizontal speed
const BALL_INITIAL_Y_SPEED = 4; // Initial vertical speed
const PADDLE_SPEED = 4; // Paddle movement speed

let gamePaused = true; // Game starts paused
let gameRunning = false; // Prevent multiple loops
const keysPressed = {}; // Track keys held down

/**
 * Game state object
 * @type {Object}
 */
let model = {
  ball: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    xSpeed: BALL_INITIAL_X_SPEED,
    ySpeed: BALL_INITIAL_Y_SPEED,
  },
  leftPaddle: { x: 20, y: canvas.height / 2 - 40, width: 10, height: 80 },
  rightPaddle: {
    x: canvas.width - 30,
    y: canvas.height / 2 - 40,
    width: 10,
    height: 80,
  },
  score: { left: 0, right: 0 },
};

// Model Logic

/**
 * Updates the ball position, handles collisions and scoring
 */
function updateBall() {
  if (gamePaused) return;

  const ball = model.ball;
  const left = model.leftPaddle;
  const right = model.rightPaddle;

  ball.x += ball.xSpeed;
  ball.y += ball.ySpeed;

  // Bounce top/bottom
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.ySpeed *= -1;
    audioWall.currentTime = 0;
    audioWall.play();
  }

  // Left paddle
  if (
    ball.x - ball.radius <= left.x + left.width &&
    ball.x - ball.radius >= left.x &&
    ball.y >= left.y &&
    ball.y <= left.y + left.height
  ) {
    ball.xSpeed = Math.abs(ball.xSpeed);
    let hit = (ball.y - (left.y + left.height / 2)) / (left.height / 2);
    ball.ySpeed = hit * 5;
    audioPaddle.currentTime = 0;
    audioPaddle.play();
  }

  // Right paddle
  if (
    ball.x + ball.radius >= right.x &&
    ball.x + ball.radius <= right.x + right.width &&
    ball.y >= right.y &&
    ball.y <= right.y + right.height
  ) {
    ball.xSpeed = -Math.abs(ball.xSpeed);
    let hit = (ball.y - (right.y + right.height / 2)) / (right.height / 2);
    ball.ySpeed = hit * 5;
    audioPaddle.currentTime = 0;
    audioPaddle.play();
  }

  // Scoring
  if (ball.x - ball.radius < 0) {
    model.score.right += 1;
    audioPoint.currentTime = 0;
    audioPoint.play();
    gamePaused = true;
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    model.score.left += 1;
    audioPoint.currentTime = 0;
    audioPoint.play();
    gamePaused = true;
    resetBall();
  }
}

/**
 * Updates paddle positions based on key presses
 */
function updatePaddles() {
  // Left paddle
  if (keysPressed["w"]) model.leftPaddle.y -= PADDLE_SPEED;
  if (keysPressed["s"]) model.leftPaddle.y += PADDLE_SPEED;

  // Right paddle
  if (keysPressed["p"]) model.rightPaddle.y -= PADDLE_SPEED;
  if (keysPressed["l"]) model.rightPaddle.y += PADDLE_SPEED;

  // Keep paddles inside canvas
  model.leftPaddle.y = Math.max(
    0,
    Math.min(canvas.height - model.leftPaddle.height, model.leftPaddle.y)
  );
  model.rightPaddle.y = Math.max(
    0,
    Math.min(canvas.height - model.rightPaddle.height, model.rightPaddle.y)
  );
}

// View Logic

/**
 * Draws the ball, paddles, and scores on the canvas
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ball
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(model.ball.x, model.ball.y, model.ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Paddles
  ctx.fillRect(
    model.leftPaddle.x,
    model.leftPaddle.y,
    model.leftPaddle.width,
    model.leftPaddle.height
  );
  ctx.fillRect(
    model.rightPaddle.x,
    model.rightPaddle.y,
    model.rightPaddle.width,
    model.rightPaddle.height
  );

  // Scores
  ctx.font = "20px Verdana";
  ctx.fillText(model.score.left, canvas.width * 0.25, 30);
  ctx.fillText(model.score.right, canvas.width * 0.75, 30);
}

// Contorller Logic

/**
 * Initializes event listeners for paddle movement and game start
 */
function Controller() {
  document.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;

    if (
      (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "r") &&
      gamePaused
    ) {
      audioStart.currentTime = 0;
      audioStart.play();
      f_startgame();
    }
  });

  document.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
  });
}

// Utility Functions

/**
 * Resets the ball to the center and randomizes direction
 */
function resetBall() {
  model.ball.x = canvas.width / 2;
  model.ball.y = canvas.height / 2;
  model.ball.xSpeed = BALL_INITIAL_X_SPEED * (Math.random() > 0.5 ? 1 : -1);
  model.ball.ySpeed = BALL_INITIAL_Y_SPEED * (Math.random() > 0.5 ? 1 : -1);
}

/**
 * Centers paddles vertically
 */
function resetPaddles() {
  model.leftPaddle.y = canvas.height / 2 - model.leftPaddle.height / 2;
  model.rightPaddle.y = canvas.height / 2 - model.rightPaddle.height / 2;
}

/**
 * Main game loop, repeatedly updates and draws the game
 */
function gameLoop() {
  updateBall();
  updatePaddles();
  draw();
  requestAnimationFrame(gameLoop);
}

/**
 * Starts or resumes the game
 */
function f_startgame() {
  resetBall();
  resetPaddles();
  gamePaused = false;

  if (!gameRunning) {
    gameRunning = true;
    gameLoop();
  }
}

// Initialize
Controller();
draw(); // initial draw for paused screen

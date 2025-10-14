/**
 * Pong — a minimal two-player paddle game implemented on an HTML5 canvas.
 * Purpose: teach basic game loop, collision handling, and simple MVC separation.
 * Author: Jay Nipper
 * Date: Fall 2025
 * Dependencies: an HTML file which provides a <canvas id="pongscreen"> and
 * audio elements with ids: "start", "wall", "paddle", "point".
 */

// Canvas and rendering context used by the view.
const canvas = document.getElementById("pongscreen");
const ctx = canvas.getContext("2d");

// Audio elements for game feedback.
const audioStart = document.getElementById("start");
const audioWall = document.getElementById("wall");
const audioPaddle = document.getElementById("paddle");
const audioPoint = document.getElementById("point");

// Tunable constants for game feel.
const BALL_INITIAL_X_SPEED = 5;
const BALL_INITIAL_Y_SPEED = 4;
const PADDLE_SPEED = 4;

// Control flags for the game loop and input tracking.
let gamePaused = true; // Start paused so player can prepare.
let gameRunning = false; // Ensure only one main loop runs.
const keysPressed = {}; // Tracks currently held keys (by key value).

/**
 * Centralized game state (model).
 * Keeping a single `model` object makes it easier to reason about and test state.
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
 * updateBall
 * Advance the ball and resolve collisions and scoring.
 *
 * Why: This function encapsulates all logic that changes the ball and score
 * so the main loop can stay concise and the view only reads model state.
 *
 * @returns {void}
 */
function updateBall() {
  if (gamePaused) return; // Keep state frozen while paused.

  const ball = model.ball;
  const left = model.leftPaddle;
  const right = model.rightPaddle;

  // Move ball according to its current velocity.
  ball.x += ball.xSpeed;
  ball.y += ball.ySpeed;

  // Top/bottom reflection: keep the ball inside the playfield and
  // provide audio feedback for hitting the wall.
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.ySpeed *= -1;
    audioWall.currentTime = 0;
    audioWall.play();
  }

  // Paddle collision detection:
  // The goal here is to detect when the ball overlaps a paddle and then
  // reflect the horizontal velocity while adjusting vertical velocity
  // based on where the ball hit the paddle to create predictable angles.
  if (
    ball.x - ball.radius <= left.x + left.width &&
    ball.x - ball.radius >= left.x &&
    ball.y >= left.y &&
    ball.y <= left.y + left.height
  ) {
    // Ensure ball moves right and tweak vertical speed by hit offset.
    ball.xSpeed = Math.abs(ball.xSpeed);
    let hit = (ball.y - (left.y + left.height / 2)) / (left.height / 2);
    ball.ySpeed = hit * 5; // Scale to tune rebound angle.
    audioPaddle.currentTime = 0;
    audioPaddle.play();
  }

  if (
    ball.x + ball.radius >= right.x &&
    ball.x + ball.radius <= right.x + right.width &&
    ball.y >= right.y &&
    ball.y <= right.y + right.height
  ) {
    // Ensure ball moves left and tweak vertical speed by hit offset.
    ball.xSpeed = -Math.abs(ball.xSpeed);
    let hit = (ball.y - (right.y + right.height / 2)) / (right.height / 2);
    ball.ySpeed = hit * 5;
    audioPaddle.currentTime = 0;
    audioPaddle.play();
  }

  // Scoring: when the ball exits the left or right side, award a point,
  // play sound, pause the game to give players a moment, and reset the ball.
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
 * updatePaddles
 * Move paddles based on current input state and constrain them to the canvas.
 *
 * @returns {void}
 */
function updatePaddles() {
  // Map keys to paddle movement.
  if (keysPressed["w"]) model.leftPaddle.y -= PADDLE_SPEED;
  if (keysPressed["s"]) model.leftPaddle.y += PADDLE_SPEED;

  if (keysPressed["p"]) model.rightPaddle.y -= PADDLE_SPEED;
  if (keysPressed["l"]) model.rightPaddle.y += PADDLE_SPEED;

  // Keep paddles fully inside the visible play area.
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
 * draw
 * Render the current model state to the canvas.
 *
 * Separating draw from update keeps rendering stateless and easier to test.
 *
 * @returns {void}
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ball (single visual element representing the model's ball)
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(model.ball.x, model.ball.y, model.ball.radius, 0, Math.PI * 2);
  ctx.fill();

  // Paddles (visuals follow model state directly)
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

  // Scores: simple HUD showing each player's points.
  ctx.font = "20px Verdana";
  ctx.fillText(model.score.left, canvas.width * 0.25, 30);
  ctx.fillText(model.score.right, canvas.width * 0.75, 30);
}

// Contorller Logic

/**
 * initController
 * Attach input listeners that modify model/input state and trigger game start.
 *
 * Why: Input handling is centralized so it can be replaced or mocked if needed.
 *
 * @returns {void}
 */
function initController() {
  document.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;

    // Allow starting (or restarting) the game using 'n' or 'r' while paused.
    if (
      (e.key.toLowerCase() === "n" || e.key.toLowerCase() === "r") &&
      gamePaused
    ) {
      audioStart.currentTime = 0;
      audioStart.play();
      startGame();
    }
  });

  document.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
  });
}

// Utility Functions

/**
 * resetBall
 * Place the ball in the center and give it a randomized initial direction.
 *
 * @returns {void}
 */
function resetBall() {
  model.ball.x = canvas.width / 2;
  model.ball.y = canvas.height / 2;
  model.ball.xSpeed = BALL_INITIAL_X_SPEED * (Math.random() > 0.5 ? 1 : -1);
  model.ball.ySpeed = BALL_INITIAL_Y_SPEED * (Math.random() > 0.5 ? 1 : -1);
}

/**
 * resetPaddles
 * Center both paddles vertically. Used at the start of a round.
 *
 * @returns {void}
 */
function resetPaddles() {
  model.leftPaddle.y = canvas.height / 2 - model.leftPaddle.height / 2;
  model.rightPaddle.y = canvas.height / 2 - model.rightPaddle.height / 2;
}

/**
 * gameLoop
 * The main requestAnimationFrame loop: update model and render view.
 * Keeps the update/draw separation explicit and simple.
 *
 * @returns {void}
 */
function gameLoop() {
  updateBall();
  updatePaddles();
  draw();
  requestAnimationFrame(gameLoop);
}

/**
 * startGame
 * Public entry point to start or resume play.
 *
 * @returns {void}
 */
function startGame() {
  resetBall();
  resetPaddles();
  gamePaused = false;

  if (!gameRunning) {
    gameRunning = true;
    gameLoop();
  }
}

// Initialize
initController();
draw(); // initial render for the paused screen

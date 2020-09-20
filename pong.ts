import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil, take} from 'rxjs/operators';
import {Elem} from './svgElementHelper';
import {Vector} from './vector';
import * as random from './randomSequence';

//Setup Game Constants
const 
  gameSettings = new class {
    readonly CanvasXSize = 600;
    readonly CanvasYSize = 600;
    readonly PaddleYSize = 100;
    readonly PaddleXSize = 10;
    readonly PaddleOffset = 15;
    readonly PaddleSpeed = 9;
    readonly PaddleAiSpeed = 7;
    readonly BallRadius = 5;
    readonly BallMaxBounceAngle = 75;
    readonly WinningScore = 7;
  }

//Create SVG Elements
const canvasSvg = document.getElementById("canvas")!,
  playerOnePaddleSvg = new Elem(canvasSvg, "rect", "paddlePlayerOne" ),
  playerTwoPaddleSvg = new Elem(canvasSvg, "rect", "paddlePlayerTwo"),
  pongBallSvg = new Elem(canvasSvg, "rect", "pongBall"),
  centreLineSvg = new Elem(canvasSvg, "line", "centreLine"),
  courtTopLineSvg = new Elem(canvasSvg, "line", "courtTopLine"),
  courtBottomLineSvg = new Elem(canvasSvg, "line", "courtBottomLine"),
  playerOneScoreSvg = new Elem(canvasSvg, "text", "playerOneScoreText"),
  playerTwoScoreSvg = new Elem(canvasSvg, "text", "playerTwoScoreText"),
  gameOverTextSvg = new Elem(canvasSvg, "text", "gameOver"),
  pauseGroupSvg = new Elem(canvasSvg, "g", "pauseIconGroup"),
  pauseLeftRectSvg = new Elem(canvasSvg, "rect", "pauseLeftRectangle", pauseGroupSvg.elem),
  pauseRightRectSvg = new Elem(canvasSvg, "rect", "pauseLeftRectangle", pauseGroupSvg.elem);

//Initialise SVG element attributes
playerOnePaddleSvg.mulAttr({width:gameSettings.PaddleXSize,height:gameSettings.PaddleYSize,style:"fill:white",transform:`translate(${gameSettings.PaddleOffset}, ${gameSettings.CanvasYSize/2-gameSettings.PaddleYSize/2})`})
playerTwoPaddleSvg.mulAttr({width:gameSettings.PaddleXSize,height:gameSettings.PaddleYSize,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize-gameSettings.PaddleOffset}, ${gameSettings.CanvasYSize/2-gameSettings.PaddleYSize/2})`})
pongBallSvg.mulAttr({width:10,height:10,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-gameSettings.BallRadius/2}, ${gameSettings.CanvasYSize/2-gameSettings.BallRadius/2})`})
centreLineSvg.mulAttr({x1:gameSettings.CanvasXSize/2,x2:gameSettings.CanvasXSize/2,y1:0,y2:gameSettings.CanvasYSize,style:"stroke:white", "stroke-width":3, "stroke-dasharray":"10, 8"})
courtTopLineSvg.mulAttr({x1:"0",x2:gameSettings.CanvasXSize,y1:"0",y2:"0",style:"stroke:white"})
courtBottomLineSvg.mulAttr({x1:"0",x2:gameSettings.CanvasXSize,y1:gameSettings.CanvasYSize,y2:gameSettings.CanvasYSize,style:"stroke:white"})
playerOneScoreSvg.mulAttr({fill:"white","font-size":"4em",transform:`translate(${gameSettings.CanvasXSize/2-gameSettings.CanvasXSize/3}, ${gameSettings.CanvasYSize/6})`})
playerOneScoreSvg.setTextContent("0")
playerTwoScoreSvg.mulAttr({fill:"white","font-size":"4em",transform:`translate(${gameSettings.CanvasXSize/2+gameSettings.CanvasXSize/3}, ${gameSettings.CanvasYSize/6})`})
playerTwoScoreSvg.setTextContent("0")
gameOverTextSvg.mulAttr({fill:"white","font-size":"3em",transform:`translate(0, ${gameSettings.CanvasXSize/2})`})
gameOverTextSvg.setTextContent("Game Over! Player X Won!")
gameOverTextSvg.hideElement(true)
pauseGroupSvg.hideElement(true)
pauseLeftRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-40}, ${gameSettings.CanvasYSize/2-40})`})
pauseRightRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2+20}, ${gameSettings.CanvasYSize/2-40})`})

//Impure call to Create random seed for random number sequence 
//seed is outputted to the console for debugging purposes, so the game state can be recreated
const randomSeed = Math.random()*0x8000000
console.log(`the generated random seed: ${randomSeed}`)

type Key = 'ArrowUp' | 'ArrowDown' | 'KeyP' | 'KeyR'

type Event = 'keydown' | 'keyup'

type ViewType = 'ball' | 'paddle'

type PlayState = 'Play' | 'Pause' | 'GameOver'

type Player = 'PlayerOne' | 'PlayerTwo'



class Entity {
  readonly id:string;
  readonly viewType: ViewType;
  readonly xSize:number;
  readonly ySize:number;
  readonly pos:Vector;
  readonly vel:Vector;
  readonly acc:Vector;
}



/**
 * Type for the gamestate object
 *  holds all relevant information to render the game
 */
type GameState = Readonly<{
  time:number,
  playerOnePaddle:Entity,
  playerTwoPaddle:Entity,
  ballState:Entity,
  playState:PlayState,
  playerOneScore:number,
  playerTwoScore:number,
  rng:random.LazySequence<number>
}>

/**
 * 
 */
class Tick { constructor(public readonly elapsed:number){}}
class MovementDirection { constructor(public readonly direction: 'Up' | 'Down' | 'UpStop' | 'DownStop'){}}
class Pause {constructor(){}}
class Restart {constructor() {}}

/**
 * A function to initialise entities
 * @param id_string 
 */
const createEntity = (id_string:string) => (view_type:ViewType) => (posVector:Vector) => (entityXSize:number) => (entityYSize:number):Entity  => 
  <Entity>{
    id: id_string,
    viewType: view_type,
    pos: posVector,
    xSize: entityXSize,
    ySize: entityYSize,
    vel: Vector.Zero,
    acc: Vector.Zero,
  } 

// /**
//  * A small function to give a number between a given range from a randomly generated float
//  * This function takes a randomly generated float, it does not generate its own number
//  * @param min bottom of range for generated number
//  * @param max top of range for generated number
//  * @param randomNumber random float generated by psuedorandom generator
//  */
// const randomIntBetween =  (min:number) => (max:number) => (randomNumber:number) => Math.floor(randomFloatFromInt(randomNumber)*(max-min+1)+min)

const serveBall = (e:Entity) => (p:Player) => (randomNumber1:number) => (randomNumber2:number) => 
    p==='PlayerOne' ? {...e,
      pos: new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2),
      vel: Vector.unitVecInDirection(random.randomIntBetween(210)(330)(randomNumber1)).scale(random.randomIntBetween(3)(8)(randomNumber2)),
      acc: Vector.Zero
  } : {...e,
    pos: new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2),
    vel: Vector.unitVecInDirection(random.randomIntBetween(30)(150)(randomNumber1)).scale(random.randomIntBetween(3)(8)(randomNumber2)), 
    acc: Vector.Zero
}

/**
 * A function
 * @param e 
 */
const moveEntities = (e:Entity):Entity =>  <Entity>{
  ...e,
  pos: new Vector(entityCheckBounds(e.pos.x+e.vel.x)(e.xSize)(gameSettings.CanvasXSize), entityCheckBounds(e.pos.y+e.vel.y)(e.ySize)(gameSettings.CanvasYSize)),
  vel: e.vel.add(e.acc),
}


/**
 * A small function to check if two values a and b are within c of each other
 * @param a first value
 * @param b second value
 * @param c value of distance between a and b
 * @returns boolean if a & b are within c of eachother
 */
const near = (a:number) => (c:number) => (b:number):Boolean =>  Math.abs(a-b) <= c;

/**
 * A small function to 
 * @param pos 
 */
const entityCheckBounds = (pos:number) => (entitySize:number)=> (canvasSize:number):number  => pos < 0 ?  0 : pos + entitySize > canvasSize ? canvasSize-entitySize : pos;

const handleCollisions = (s:GameState) => paddleCollionHelper(courtCollisions(s));

/**
 * A function to handle when the ball state hits the edges of the court
 * Bounces the ball
 * @param s 
 */
const courtCollisions = (s:GameState) => 
    //Check for if ball hits top or bottom binding horizontal plane
    near(s.ballState.pos.y)(s.ballState.ySize)(0) || near(s.ballState.pos.y)(s.ballState.ySize)(gameSettings.CanvasYSize) ?  {...s, 
        ballState: {...s.ballState,
          vel: s.ballState.vel.scaleXY(1)(-1)  
        }
      } : near(s.ballState.pos.x)(s.ballState.xSize)(0) ? {...s, //Check for if ball hits player 1 scoring zone
        ballState: serveBall(s.ballState)('PlayerOne')(s.rng.next().value)(s.rng.next().next().value),
        playerTwoScore: s.playerTwoScore + 1,
        playState: s.playerTwoScore + 1 >= gameSettings.WinningScore  ? 'GameOver'  as PlayState : s.playState,
        rng: s.rng.next().next().next()
      }
      : near(s.ballState.pos.x)(s.ballState.xSize)(gameSettings.CanvasXSize) ? {...s, //Check for if ball hits player 2 scoring zone
        ballState: serveBall(s.ballState)('PlayerTwo')(s.rng.next().value)(s.rng.next().next().value),
        playerOneScore: s.playerOneScore + 1,
        playState: s.playerOneScore + 1 >= gameSettings.WinningScore ? 'GameOver' as PlayState : s.playState,
        rng: s.rng.next().next().next()
      } 
      : s

  const paddleCollisionChecker = (paddle:Entity) => (ball:Entity) => paddle.pos.x < ball.pos.x + ball.xSize &&
      paddle.pos.y < ball.pos.y + ball.ySize &&
      ball.pos.x < paddle.pos.x + paddle.xSize &&
      ball.pos.y < paddle.pos.y + paddle.ySize

const paddleCollions = (paddle1:Entity) => (paddle2:Entity)=> (ball:Entity) => !ballTowardsAi(ball) && paddleCollisionChecker(paddle1)(ball) ? 
    {...ball,
      vel: ballBounceVelocity(paddle1)(ball),
    }
   : ballTowardsAi(ball) && paddleCollisionChecker(paddle2)(ball) ?  {...ball,
          vel: ballBounceVelocity(paddle2)(ball),
       } : ball

/**
 * A helper function to run paddle collisions calculations on the paddles and ball in the game state
 * @param s Gamestate snapshot to check for collisions
 * @returns gamestate after paddle collisions are checked and any bounces are applied
 */
const paddleCollionHelper = (s:GameState) => {return {...s, ballState:paddleCollions(s.playerOnePaddle)(s.playerTwoPaddle)(s.ballState)}}

/**
 * A small function to create a vector in the given bearing direction with given magnitude
 *  used to create velocity vectors to control the ball's movement
 * @param direction:number bearing angle to create vector to travel in
 * @param speed:number magnitude to scale vector to set velocity
 * @returns new Vector in given direction with given speed
 */
const velVecInDirection = (direction:number) => (speed:number) => Vector.unitVecInDirection(direction).scale(speed)   

/**
 * A small boolean function to check whether the ball is on the ai side
 *  used to condition start ai movement
 * @param ball entity of ball
 * @returns boolean if ball is on AI side (right half)
 */
const ballOnAiSide = (ball:Entity) => ball.pos.x > gameSettings.CanvasXSize/2 

/**
 * A small boolean function to check whether the ball is traveling towards the ai (right side)
 *  used to condition ai movement
 * @param ball entity of ball
 * @returns boolean if ball is traveling towards the ai
 */
const ballTowardsAi = (ball:Entity) => ball.vel.x > 0

/**
 * A function to control the ai player paddle
 *  Starts moving the ai paddle centre towards the ball y value when the ball is on the ai side at fixed ai speed value
 * Can be adjusted to change when ai reacts to ball by ball position, and speed at which ai can move their paddle with the gamesettings.PaddleAiSpeed constant
 * @param paddle paddle entity of ai player to control
 * @returns ai paddle state with movement applied 
 */
const paddleAi = (paddle:Entity) => (ball:Entity):Entity => ballOnAiSide(ball) && ballTowardsAi(ball) ? paddle.pos.y+paddle.ySize/2 > ball.pos.y ? {...paddle, vel:velVecInDirection(0)(gameSettings.PaddleAiSpeed)} : {...paddle, vel:velVecInDirection(180)(gameSettings.PaddleAiSpeed)} : {...paddle, vel:Vector.Zero}

/**
 * Calculates the new vector for the ball's movement if the ball has collided with a given paddle
 * used if ball and paddle has already had a collision event calculated
 * Creates a new velocity direction based on the position of the ball hit relative to the centre of the paddle
 * Ball speed is calculated by the paddle proportion as well, with ball speeding up more the closer it is to the centre of the paddle
 * @param paddle paddle entity ball has collided with
 * @param ball entity of ball
 * @returns vector of new ball velocity with directional changes applied
 */
const ballBounceVelocity = (paddle:Entity) => (ball:Entity):Vector => {
  const rely = (paddle.pos.y+paddle.ySize/2)-(ball.pos.y+ball.ySize)
  const paddleProportion = rely/(paddle.ySize/2)
  const bounceAngle = paddleProportion*gameSettings.BallMaxBounceAngle 
  return ballTowardsAi(ball) ? velVecInDirection(270+bounceAngle)(ball.vel.len()).scale(1+Math.abs(paddleProportion)/2) : velVecInDirection(90-bounceAngle)(ball.vel.len()).scale(1+Math.abs(paddleProportion)/2)
}

/**
 * Updates the current gameState for each frame, performing ball and paddle movements, aswell as controlling 
 * ball collisions and moving the ai paddle 
 * if the game in not in a 'Play' playState, this function does nothing and returns the current gameState
 * @param s current gameState
 * @param elapsed frame count since game start (in 10ms intervals)
 * @returns updated gamestate after frame is calculated
 */
const tick = (s:GameState, elapsed) => 
  s.playState === 'Play' ? handleCollisions({...s,
  playerOnePaddle: moveEntities(s.playerOnePaddle) ,
  ballState: moveEntities(s.ballState),
  playerTwoPaddle: moveEntities(paddleAi(s.playerTwoPaddle)(s.ballState)),
  time: elapsed
}) : s

/**
 * A state reducer function which inputs the current game state and a game event class and returns the updated state 
 *  after the results of those events have been computed
 *  Game updates take place here, so any game events need to be type checked here to apply to the game state
 * @param s current gameState 
 * @param e game event class to apply to current game state
 * @returns new gameState with event applied
 */
const reduceState = (s:GameState, e:MovementDirection|Pause|Tick|Restart) =>
  e instanceof MovementDirection ? {...s,
    playerOnePaddle : {...s.playerOnePaddle,
      vel: e.direction === 'Up' ? velVecInDirection(0)(gameSettings.PaddleSpeed) : 
      e.direction === 'Down' ? velVecInDirection(180)(gameSettings.PaddleSpeed) : 
      e.direction === 'UpStop' ? s.playerOnePaddle.vel.sub(velVecInDirection(0)(gameSettings.PaddleSpeed)) :    
      s.playerOnePaddle.vel.sub(velVecInDirection(180)(gameSettings.PaddleSpeed))
    }
  } : e instanceof Pause ? {...s,
    playState: s.playState === 'Play' ? 'Pause' as PlayState : s.playState === 'Pause' ? 'Play' as PlayState : 'GameOver' as PlayState 
  } : e instanceof Restart ? restartGame(s)  
  : tick(s, e.elapsed);

  /**
   * A function to revert the gamestate to the initial state if the current game state is in game over
   *  used with restart game event class to allow for restarts at game over when restart is selected
   * @param s current game state
   * @returns new initial game state
   */
const restartGame = (s:GameState) => s.playState == 'GameOver' ? initialState : s

/**
 * A function to create observables from keypress events
 *  filters out repeated keypress events
 *  adapted from Tim Dwyer's Work @https://tgdwyer.github.io/asteroids/
 * @param e:Event DOM event type string
 * @param k:Key DOM key code string
 * @param result: function to apply to stream after event is registered
 * @returns observable stream of given keyevent with given function mapped to it
 */
const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document, e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)
          ),
      //Creation of key event observables to monitor for keypresses and return game event classes for the gamestate reducer to apply to the game state
      upMoveKeyDown = keyObservable('keydown', 'ArrowUp', ()=>new MovementDirection('Up')),
      downMoveKeyDown = keyObservable('keydown', 'ArrowDown', ()=>new MovementDirection('Down')),
      upMoveKeyUp = keyObservable('keyup', 'ArrowUp', ()=> new MovementDirection('UpStop')),
      downMoveKeyUp = keyObservable('keyup', 'ArrowDown', ()=> new MovementDirection('DownStop')),
      pauseKeyPress = keyObservable('keydown', 'KeyP', ()=> new Pause()),
      restartKeyPress = keyObservable('keydown', 'KeyR', ()=>new Restart());
                    
  /**
   * An impure function to alter the html attributes to render the game in the browser
   * Takes in the current game state for the frame to render
   * Renders both paddles and the balls current position
   *  plus scores, pause icons and game over screen
   * @param s current gamestate of the frame
   * @returns none as function is impure and alters the html dom environment directly
   */
  function updateView(s: GameState) {
    playerOnePaddleSvg.attr("transform",`translate(${Math.round(s.playerOnePaddle.pos.x)} ${Math.round(s.playerOnePaddle.pos.y)})`)
    playerTwoPaddleSvg.attr("transform",`translate(${Math.round(s.playerTwoPaddle.pos.x)} ${Math.round(s.playerTwoPaddle.pos.y)})`)
    pongBallSvg.attr("transform",`translate(${Math.round(s.ballState.pos.x)} ${Math.round(s.ballState.pos.y)})`)
    playerOneScoreSvg.setTextContent(s.playerOneScore.toString())
    playerTwoScoreSvg.setTextContent(s.playerTwoScore.toString())
    if (s.playState == 'Pause') {
      pauseGroupSvg.hideElement(false)
    } else {
      pauseGroupSvg.hideElement(true)
    }
    if (s.playState == "GameOver") {
      gameOverTextSvg.setTextContent(`Game Over! Player ${s.playerOneScore > s.playerTwoScore ? "One" : "Two"} Won!`)
      gameOverTextSvg.hideElement(false)
    } else {
      gameOverTextSvg.hideElement(true)
    }
  }

  /**
   * A const to hold the initial gameState to start the game
   */
  const initialState:GameState = {
    time:0,
    playerOnePaddle: createEntity('paddlePlayerOne')('paddle')(new Vector(gameSettings.PaddleOffset, gameSettings.CanvasYSize/2 - gameSettings.PaddleYSize/2))(gameSettings.PaddleXSize)(gameSettings.PaddleYSize),
    playerTwoPaddle: createEntity('paddlePlayerTwo')('paddle')(new Vector(gameSettings.CanvasXSize - (gameSettings.PaddleXSize + gameSettings.PaddleOffset), gameSettings.CanvasYSize/2 - gameSettings.PaddleYSize/2))(gameSettings.PaddleXSize)(gameSettings.PaddleYSize),
    ballState: serveBall(createEntity('pongBall')('ball')(new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2))(gameSettings.BallRadius)(gameSettings.BallRadius))('PlayerOne')(random.randomSequence(randomSeed).value)(random.randomSequence(randomSeed).next().value),
    playState: 'Play',
    playerOneScore: 0,
    playerTwoScore: 0,
    rng: random.randomSequence(randomSeed).next().next()
  }

  const pongGameObs =  interval(10).pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(upMoveKeyUp, downMoveKeyUp, upMoveKeyDown, downMoveKeyDown,  pauseKeyPress, restartKeyPress),
    scan(reduceState, initialState)
  )
function pong() {
    pongGameObs.subscribe(console.log)
    pongGameObs.subscribe(updateView) 
    
  }

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }

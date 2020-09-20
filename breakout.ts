import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil, take} from 'rxjs/operators';
import {Elem} from './svgElementHelper';
import {Vector} from './vector';
import * as random from './randomSequence';
import { createEntity, Entity, entityCheckBounds, entityCollisionChecker, moveEntity, serveEntity } from './entity';
import { keyObservable, near, velVecInDirection } from './helpers';
import {menu} from './menu'

document.body.prepend(menu('RxBreakout'))

//Setup Game Constants
const 
  gameSettings = new class {
    readonly CanvasXSize = 600;
    readonly CanvasYSize = 800;
    readonly PaddleXSize = 100;
    readonly PaddleYSize = 10;
    readonly PaddleOffset = 15;
    readonly BallRadius = 5;
    readonly BallAcc = 0.1;
    readonly BallMaxBounceAngle = 75;
  }

//Create SVG Elements
const canvasSvg = document.getElementById("canvas")!,
  playerOnePaddleSvg = new Elem(canvasSvg, "rect", "paddlePlayerOne" ),
  pongBallSvg = new Elem(canvasSvg, "rect", "pongBall"),
  courtTopLineSvg = new Elem(canvasSvg, "line", "courtTopLine"),
  courtLeftLineSvg = new Elem(canvasSvg, "line", "courtLeftLine"),
  courtRightLineSvg = new Elem(canvasSvg, "line", "courtRightLine"),
  playerScoreSvg = new Elem(canvasSvg, "text", "playerOneScoreText"),
  playerLivesSvg = new Elem(canvasSvg, "text", "playerTwoScoreText"),
  gameOverTextSvg = new Elem(canvasSvg, "text", "gameOver"),
  pauseGroupSvg = new Elem(canvasSvg, "g", "pauseIconGroup"),
  pauseLeftRectSvg = new Elem(canvasSvg, "rect", "pauseLeftRectangle", pauseGroupSvg.elem),
  pauseRightRectSvg = new Elem(canvasSvg, "rect", "pauseLeftRectangle", pauseGroupSvg.elem);

//Initialise SVG element attributes
playerOnePaddleSvg.mulAttr({width:gameSettings.PaddleXSize,height:gameSettings.PaddleYSize,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-gameSettings.PaddleXSize/2}, ${gameSettings.CanvasYSize-gameSettings.PaddleOffset})`})
pongBallSvg.mulAttr({width:10,height:10,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-gameSettings.BallRadius/2}, ${gameSettings.CanvasYSize/2-gameSettings.BallRadius/2})`})
courtTopLineSvg.mulAttr({x1:"0",x2:gameSettings.CanvasXSize,y1:"0",y2:"0",style:"stroke:white"})
courtLeftLineSvg.mulAttr({x1:"0",x2:0,y1:0,y2:gameSettings.CanvasYSize,style:"stroke:white"})
courtRightLineSvg.mulAttr({x1:gameSettings.CanvasXSize,x2:gameSettings.CanvasXSize,y1:0,y2:gameSettings.CanvasYSize,style:"stroke:white"})
playerScoreSvg.mulAttr({fill:"white","font-size":"em",transform:`translate(${gameSettings.CanvasXSize/20}, ${gameSettings.CanvasYSize/20})`})
playerScoreSvg.setTextContent("Score:0")
playerLivesSvg.mulAttr({fill:"white","font-size":"em",transform:`translate(${gameSettings.CanvasXSize-gameSettings.CanvasXSize/6}, ${gameSettings.CanvasYSize/20})`})
playerLivesSvg.setTextContent("Lives:3")
gameOverTextSvg.mulAttr({fill:"white","font-size":"em",transform:`translate(0, ${gameSettings.CanvasXSize/2})`})
gameOverTextSvg.setTextContent("Game Over! Player X Won!")
gameOverTextSvg.hideElement(true)
pauseGroupSvg.hideElement(true)
pauseLeftRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-40}, ${5*gameSettings.CanvasYSize/8})`})
pauseRightRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2+20}, ${5*gameSettings.CanvasYSize/8})`})

//Impure call to Create random seed for random number sequence 
//seed is outputted to the console for debugging purposes, so the game state can be recreated
const randomSeed = Math.random()*0x8000000
console.log(`the generated random seed: ${randomSeed}`)

type PlayState = 'Play' | 'Pause' | 'GameOver'

type GameState = Readonly<{
    time:number,
    playerPaddle:Entity,
    playerLives:number
    ballState:Entity,
    playState:PlayState,
    blocks:ReadonlyArray<Block>,
    playerScore:number,
    rng:random.LazySequence<number>
}>

class Block extends Entity{
    pointValue:number
}
 
// const createBlocks = (s:GameState) =>

// Game Event Classes for observable streams to pass events into the game loop
/**
 * Tick Event to represent a new gameState frame that needs to be calculated and rendered
 * @param Elapsed:number tick count from game
 */
class Tick { constructor(public readonly elapsed:number){}}

class Pause {constructor(){}}
/**
 * Restart button press event to represent when the user wants to reinitialise the game once a gameover state has been reached
 */
class Restart {constructor() {}}

class MovementPosition{ constructor(public readonly xPosition:number){}}


/**
 * Calculates the new vector for the ball's movement if the ball has collided with a given paddle
 * used if ball and paddle has already had a collision event calculated
 * Creates a new velocity direction based on the position of the ball hit relative to the centre of the paddle
 * Ball speed is calculated by the paddle proportion as well, with ball speeding up more the closer it is to the centre of the paddle
 * @param block paddle entity ball has collided with
 * @param ball entity of ball
 * @returns vector of new ball velocity with directional changes applied
 */
const ballBounceVelocity = (block:Entity) => (ball:Entity):Vector => {
    const rely = (block.pos.y+block.ySize/2)-(ball.pos.y+ball.ySize)
    const blockProportion = rely/(block.ySize/2)
    const bounceAngle = blockProportion*gameSettings.BallMaxBounceAngle 
    return ball.vel.y > 0 ? velVecInDirection(0+bounceAngle)(ball.vel.len()).scale(1+Math.abs(blockProportion)/2) : velVecInDirection(180-bounceAngle)(ball.vel.len()).scale(1+Math.abs(blockProportion)/2)
  }
  
  
  
  /**
   * A funtion to perform calculations for ball bounces in a game state
   * @param s gameState frame to perform paddle and court collision check on
   * @returns updated gameState
   */
  const handleCollisions = (s:GameState) => paddleCollionHelper(courtCollisions(s));
  
  /**
   * A function to handle when the ball state hits the edges of the court
   * Bounces the ball if it hits the horizontal planes, while scoring repsective players if the ball hits the
   * scoring zones
   * @param s gameState frame to check court collisions in
   * @returns updated gameState
   */
  const courtCollisions = (s:GameState) => 
      //Check for if ball hits top or bottom binding horizontal plane
      near(s.ballState.pos.y)(s.ballState.ySize)(0) ?  {...s, 
          ballState: {...s.ballState,
            vel: s.ballState.vel.scaleXY(1)(-1)  
          }
        } : near(s.ballState.pos.x)(s.ballState.xSize)(0) || near(s.ballState.pos.x)(s.ballState.xSize)(gameSettings.CanvasXSize) ? {...s, 
            ballState: {...s.ballState,
              vel: s.ballState.vel.scaleXY(-1)(1)  
            }
        } : near(s.ballState.pos.y)(s.ballState.ySize)(gameSettings.CanvasYSize) ? {...s, //Check for if ball hits player 1 end
          ballState: serveEntity(s.ballState)(270)(s.rng.next().value)(s.rng.next().next().value)(gameSettings.CanvasXSize)(gameSettings.CanvasYSize),
          playerLives: s.playerLives - 1,
          playState: s.playerLives - 1 <= 0  ? 'GameOver'  as PlayState : s.playState,
          rng: s.rng.next().next().next()
        } :  s
  
  
  
  /**
   * A function to check whether the ball has collided with either paddle then perform a bounce velocity change if a collision has occured
   * Takes both paddle entities and the ball enitity, and returns the new ball state
   * @param paddleA entity of left sided paddle
   * @param paddleB enitity of right sided paddle
   * @param ball enitity of ball
   * @returns ball state object with collision applied
   */
  const paddleCollions = (paddleA:Entity) => (ball:Entity):Entity =>  entityCollisionChecker(paddleA)(ball) ? 
      {...ball,
        vel: ballBounceVelocity(paddleA)(ball),
      } : ball
    
  
  /**
   * A helper function to run paddle collisions calculations on the paddles and ball in the game state
   * @param s Gamestate snapshot to check for collisions
   * @returns gamestate after paddle collisions are checked and any bounces are applied
   */
  const paddleCollionHelper = (s:GameState) => {return {...s, ballState: ballTowardsPlayer(s.ballState) ? paddleCollions(s.playerPaddle)(s.ballState) : s.ballState}}
  

  /**
   * A small boolean function to check whether the ball is traveling towards the ai (right side)
   *  used to condition ai movement
   * @param ball entity of ball
   * @returns boolean if ball is traveling towards the ai
   */
  const ballTowardsPlayer = (ball:Entity) => ball.vel.y > 0
  
  
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
    ballState: moveEntity(s.ballState)(gameSettings.CanvasXSize)(gameSettings.CanvasYSize),
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
  const reduceState = (s:GameState, e:MovementPosition|Pause|Tick|Restart) =>
    e instanceof MovementPosition ? {...s,
      playerPaddle : {...s.playerPaddle,
        pos: new Vector(entityCheckBounds(e.xPosition - s.playerPaddle.xSize/2)(s.playerPaddle.xSize)(gameSettings.CanvasXSize), gameSettings.CanvasYSize-gameSettings.PaddleOffset)
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
  
  
  //Creation of key event observables to monitor for keypresses and return game event classes for the gamestate reducer to apply to the game state
  const pauseKeyPress = keyObservable('keydown', 'KeyP', ()=> new Pause()),
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
      playerOnePaddleSvg.attr("transform",`translate(${Math.round(s.playerPaddle.pos.x)} ${Math.round(s.playerPaddle.pos.y)})`)
      pongBallSvg.attr("transform",`translate(${Math.round(s.ballState.pos.x)} ${Math.round(s.ballState.pos.y)})`)
      playerScoreSvg.setTextContent(`Score: ${s.playerScore}`)
      playerLivesSvg.setTextContent(`Lives: ${s.playerLives}`)
      if (s.playState == 'Pause') {
        pauseGroupSvg.hideElement(false)
      } else {
        pauseGroupSvg.hideElement(true)
      }
      if (s.playState == "GameOver") {
        gameOverTextSvg.setTextContent(`Game Over! You Scored ${s.playerScore }!`)
        gameOverTextSvg.hideElement(false)
      } else {
        gameOverTextSvg.hideElement(true)
      }
    }

const initialState:GameState = {
    time:0,
    playerPaddle: createEntity('paddlePlayerOne')('paddle')(new Vector(gameSettings.CanvasXSize/2 - gameSettings.PaddleXSize/2, gameSettings.CanvasYSize-gameSettings.PaddleOffset))(gameSettings.PaddleXSize)(gameSettings.PaddleYSize),
    ballState: serveEntity(createEntity('pongBall')('ball')(new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2))(gameSettings.BallRadius)(gameSettings.BallRadius))(270)(random.randomSequence(randomSeed).value)(random.randomSequence(randomSeed).next().value)(gameSettings.CanvasXSize)(gameSettings.CanvasYSize),
    playState: 'Play',
    playerScore: 0,
    playerLives: 3,
    blocks:[],
    rng: random.randomSequence(randomSeed).next().next()
  }

const positionBounds = (maxBound:number) => (pos:number) => pos < 0 ? 0 : pos > maxBound ? maxBound : pos

const mousePositionObservable = fromEvent<MouseEvent>(document, 'mousemove').
        pipe(
            map(({clientX, clientY}) => ({x:clientX, y:clientY})),
            map((pos)=>pos.x),
            map(positionBounds(gameSettings.CanvasXSize)),
            map(pos=>new MovementPosition(pos))
        );
    
    

const breakoutGameObs = interval(10).pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(mousePositionObservable, pauseKeyPress, restartKeyPress),
    scan(reduceState, initialState)
  ) 



function breakout() {
    breakoutGameObs.subscribe(updateView)
  }

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      breakout();
    }
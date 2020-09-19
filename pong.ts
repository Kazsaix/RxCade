import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil, take} from 'rxjs/operators';
import {Elem} from './svgElementHelper';

//Setup Game Constants
const 
  gameSettings = new class {
    readonly CanvasXSize = 600;
    readonly CanvasYSize = 600;
    readonly PaddleLength = 100;
    readonly PaddleWidth = 10;
    readonly PaddleOffset = 15;
    readonly PaddleSpeed = 9;
    readonly PaddleAiSpeed = 7;
    readonly BallRadius = 5;
    readonly BallAcc = 0.1;
    readonly BallMaxBounceAngle = 75;
    readonly WinningScore = 7;
    readonly InbetweenRoundInterval = 2;
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
playerOnePaddleSvg.mulAttr({width:gameSettings.PaddleWidth,height:gameSettings.PaddleLength,style:"fill:white",transform:`translate(${gameSettings.PaddleOffset}, ${gameSettings.CanvasYSize/2-gameSettings.PaddleLength/2})`})
playerTwoPaddleSvg.mulAttr({width:gameSettings.PaddleWidth,height:gameSettings.PaddleLength,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize-gameSettings.PaddleOffset}, ${gameSettings.CanvasYSize/2-gameSettings.PaddleLength/2})`})
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

const randomSeed = Math.random()*0x8000000
console.log(`the generated random seed: ${randomSeed}`)

interface LazySequence<T> {
  value: T;
  next():LazySequence<T>;
}

function initSequence<T>(transform: (value: T) => T): (initialValue: T) => LazySequence<T> {
  return function _next(initialValue:T):LazySequence<T>{
      return{
          value: initialValue,
          next: () => _next(transform(initialValue)),
      }
  }
}
//A very bad pure psuedorandom 
const randomSequence = initSequence<number>((seed)=>(1103515245 * seed + 12345) % 0x8000000)

const randomFloatFromInt = (randNumber:number) => randNumber / (0x8000000 - 1)


type Key = 'ArrowUp' | 'ArrowDown' | 'KeyP' | 'KeyR'

type Event = 'keydown' | 'keyup'

type ViewType = 'ball' | 'paddle'

type PlayState = 'Play' | 'Pause' | 'GameOver'

type Player = 'PlayerOne' | 'PlayerTwo'

type Entity = Readonly<{
  id: string,
  viewType: ViewType,
  pos:Vector,
  vel:Vector,
  acc:Vector,  
}>

type Paddle = Entity; 
type Ball = Entity;

type GameState = Readonly<{
  time:number,
  playerOnePaddle:Paddle,
  playerTwoPaddle:Paddle,
  ballState:Ball,
  playState:PlayState,
  playerOneScore:number,
  playerTwoScore:number,
  rng:LazySequence<number>
}>

  /**
 * Simple Vector Math Class
 * adapted from Tim Dwyer's Work @https://tgdwyer.github.io/asteroids/
 */
class Vector {
  constructor(public readonly x: number = 0, public readonly y: number = 0) {}
  add = (v:Vector) => new Vector(this.x + v.x, this.y + v.y)
  sub = (v:Vector) => new Vector(this.x - v.x, this.y - v.y)
  len = () => Math.sqrt(this.x**2 + this.y**2)
  scale = (s:number) => new Vector(this.x*s, this.y*s)
  scaleXY = (s:number) => (t:number) => new Vector(this.x*s, this.y*t)
  ortho = ()=> new Vector(this.y, -this.x)
  rotate = (deg:number) => 
      (rad =>(
          (cos,sin,{x,y})=>new Vector(x*cos - y*sin, x*sin + y*cos)
       )(Math.cos(rad), Math.sin(rad), this)
      )(Math.PI * deg / 180)
  static unitVecInDirection = (deg: number) => new Vector(0,-1).rotate(deg)
  static Zero = new Vector();
}

class Tick { constructor(public readonly elapsed:number){}}
class MovementDirection { constructor(public readonly direction: 'Up' | 'Down' | 'UpStop' | 'DownStop'){}}
class Pause {constructor(){}}
class Restart {constructor() {}}

//*** */
const createEntity = (id_string:string) => (view_type:ViewType) => (pos_vector:Vector) => <Entity>{
    id: id_string,
    viewType: view_type,
    pos: pos_vector,
    vel: Vector.Zero,
    acc: Vector.Zero
}

const randomIntBetween =  (min:number) => (max:number) => (randomNumber:number) => Math.floor(randomFloatFromInt(randomNumber)*(max-min+1)+min)

const serveBall = (e:Entity) => (p:Player) => (randomNumber1:number) => (randomNumber2:number) => 
    p==='PlayerOne' ? {...e,
      pos: new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2),
      vel: Vector.unitVecInDirection(randomIntBetween(210)(330)(randomNumber1)).scale(randomIntBetween(3)(8)(randomNumber2)),
      acc: Vector.Zero
  } : {...e,
    pos: new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2),
    vel: Vector.unitVecInDirection(randomIntBetween(30)(150)(randomNumber1)).scale(randomIntBetween(3)(8)(randomNumber2)), 
    acc: Vector.Zero
}


const moveEntity = (e:Entity) =>   e.viewType === 'paddle'   ? <Entity>{
  ...e,
  pos: new Vector(e.pos.x, entityCheckBounds(e.pos.add(e.vel).y)(gameSettings.PaddleLength)(gameSettings.CanvasXSize)),
  vel: e.vel.add(e.acc),
} : <Entity>{
  ...e,
  pos: new Vector(entityCheckBounds(e.pos.x+e.vel.x)(gameSettings.BallRadius)(gameSettings.CanvasXSize), entityCheckBounds(e.pos.y+e.vel.y)(gameSettings.BallRadius)(gameSettings.CanvasYSize)),
  vel: e.vel.add(e.acc),
}

/**
 * A small function to check if two values a and b are within c of each other
 * @param a first value
 * @param b second value
 * @param c value of distance between a and b
 */
const near = (a:number) => (c:number) => (b:number):Boolean =>  Math.abs(a-b) <= c;

const entityCheckBounds = (pos:number) => (entitySize:number)=> (canvasSize:number):number  => pos < 0 ?  0 : pos + entitySize >canvasSize ? canvasSize-entitySize : pos;

const handleCollisions = (s:GameState) => paddleCollionHelper(courtCollisions(s));


const courtCollisions = (s:GameState) => 
    near(s.ballState.pos.y)(gameSettings.BallRadius)(0) || near(s.ballState.pos.y)(gameSettings.BallRadius)(gameSettings.CanvasYSize) ?  {...s, 
        ballState: {...s.ballState,
          vel: s.ballState.vel.scaleXY(1)(-1)  
        }
      } : near(s.ballState.pos.x)(gameSettings.BallRadius)(0) ? {...s,
        ballState: serveBall(s.ballState)('PlayerOne')(s.rng.next().value)(s.rng.next().next().value),
        playerTwoScore: s.playerTwoScore + 1,
        playState: s.playerTwoScore + 1 >= gameSettings.WinningScore  ? 'GameOver'  as PlayState : s.playState,
        rng: s.rng.next().next().next()
      }
      : near(s.ballState.pos.x)(gameSettings.BallRadius)(gameSettings.CanvasXSize) ? {...s,
        ballState: serveBall(s.ballState)('PlayerTwo')(s.rng.next().value)(s.rng.next().next().value),
        playerOneScore: s.playerOneScore + 1,
        playState: s.playerOneScore + 1 >= gameSettings.WinningScore ? 'GameOver' as PlayState : s.playState,
        rng: s.rng.next().next().next()
      } 
      : s

  const paddleCollisionChecker = (paddle:Entity) => (ball:Entity) => paddle.pos.x < ball.pos.x + gameSettings.BallRadius &&
      paddle.pos.y < ball.pos.y + gameSettings.BallRadius &&
      ball.pos.x < paddle.pos.x + gameSettings.PaddleWidth &&
      ball.pos.y < paddle.pos.y + gameSettings.PaddleLength

const paddleCollions = (paddle1:Entity) => (paddle2:Entity)=> (ball:Entity) => !ballTowardsAi(ball) && paddleCollisionChecker(paddle1)(ball) ? 
    {...ball,
      vel: ballBounceVelocity(paddle1)(ball).scale(1.3),
    }
   : ballTowardsAi(ball) && paddleCollisionChecker(paddle2)(ball) ?  {...ball,
          vel: ballBounceVelocity(paddle2)(ball).scale(1.1),
       } : ball

const paddleCollionHelper = (s:GameState) => {return {...s, ballState:paddleCollions(s.playerOnePaddle)(s.playerTwoPaddle)(s.ballState)}}


const velVecInDirection = (direction:number) => (speed:number) => Vector.unitVecInDirection(direction).scale(speed)    
const paddleOnAiSide = (ball:Entity) => ball.pos.x > gameSettings.CanvasXSize/2 
const ballTowardsAi = (ball:Entity) => ball.vel.x > 0
const paddleAi = (paddle:Entity) => (ball:Entity):Entity => paddleOnAiSide(ball) && ballTowardsAi(ball) ? paddle.pos.y+gameSettings.PaddleLength/2 > ball.pos.y ? {...paddle, vel:velVecInDirection(0)(gameSettings.PaddleAiSpeed)} : {...paddle, vel:velVecInDirection(180)(gameSettings.PaddleAiSpeed)} : {...paddle, vel:Vector.Zero}

const ballBounceVelocity = (paddle:Entity) => (ball:Entity):Vector => {
  const rely = (paddle.pos.y+gameSettings.PaddleLength/2)-(ball.pos.y+gameSettings.BallRadius)
  const bounceAngle = rely/(gameSettings.PaddleLength/2)*gameSettings.BallMaxBounceAngle 
  return ballTowardsAi(ball) ? velVecInDirection(270+bounceAngle)(ball.vel.len()) : velVecInDirection(90-bounceAngle)(ball.vel.len())
}

/**
 * Defines parameters for each 
 * @param s 
 * @param elapsed 
 */
const tick = (s:GameState, elapsed) => 
  s.playState === 'Play' ? handleCollisions({...s,
  playerOnePaddle: moveEntity(s.playerOnePaddle),
  ballState: moveEntity(s.ballState),
  playerTwoPaddle: moveEntity(paddleAi(s.playerTwoPaddle)(s.ballState)),
  time: elapsed
}) : s

const reduceState = (s:GameState, e:MovementDirection|Pause|Tick) =>
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

const restartGame = (s:GameState) => s.playState == 'GameOver' ? initialState : s

  const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document, e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)
          ),
      upMoveKeyDown = keyObservable('keydown', 'ArrowUp', ()=>new MovementDirection('Up')),
      downMoveKeyDown = keyObservable('keydown', 'ArrowDown', ()=>new MovementDirection('Down')),
      upMoveKeyUp = keyObservable('keyup', 'ArrowUp', ()=> new MovementDirection('UpStop')),
      downMoveKeyUp = keyObservable('keyup', 'ArrowDown', ()=> new MovementDirection('DownStop')),
      pauseKeyPress = keyObservable('keydown', 'KeyP', ()=> new Pause()),
      restartKeyPress = keyObservable('keydown', 'KeyR', ()=>new Restart());
                    
  
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


  const initialState:GameState = {
    time:0,
    playerOnePaddle: createEntity('paddlePlayerOne')('paddle')(new Vector(gameSettings.PaddleOffset, gameSettings.CanvasYSize/2 - gameSettings.PaddleLength/2)),
    playerTwoPaddle: createEntity('paddlePlayerTwo')('paddle')(new Vector(gameSettings.CanvasXSize - (gameSettings.PaddleWidth + gameSettings.PaddleOffset), gameSettings.CanvasYSize/2 - gameSettings.PaddleLength/2)),
    ballState: serveBall(createEntity('pongBall')('ball')(new Vector(gameSettings.CanvasXSize/2, gameSettings.CanvasYSize/2)))('PlayerOne')(randomSequence(randomSeed).value)(randomSequence(randomSeed).next().value),
    playState: 'Play',
    playerOneScore: 0,
    playerTwoScore: 0,
    rng: randomSequence(randomSeed).next().next()
  }

  const pongGameObs =  interval(10).pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(upMoveKeyUp, downMoveKeyUp, upMoveKeyDown, downMoveKeyDown,  pauseKeyPress, restartKeyPress),
    scan(reduceState, initialState)
  )
function pong() {
    console.log(initialState)
    pongGameObs.subscribe(updateView) 
  }

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }

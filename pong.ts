import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil, take} from 'rxjs/operators';
import {Elem} from './svgElementHelper';

const 
  gameSettings = new class {
    readonly CanvasSize = 600;
    readonly PaddleLength = 100;
    readonly PaddleWidth = 10;
    readonly PaddleOffset = 5;
    readonly PaddleOffset = 15;
    readonly PaddleSpeed = 9;
    readonly PaddleAiSpeed = 7;
    readonly BallRadius = 5;
    readonly BallAcc = 0.1;
    readonly BallMaxBounceAngle = 75;
    readonly WinningScore = 7;
    readonly InbetweenRoundInterval = 2;
  }


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

playerOnePaddleSvg.mulAttr({width:gameSettings.PaddleWidth,height:gameSettings.PaddleLength,style:"fill:white",transform:`translate(${gameSettings.PaddleOffset}, ${gameSettings.CanvasSize/2-gameSettings.PaddleLength/2})`})
playerTwoPaddleSvg.mulAttr({width:gameSettings.PaddleWidth,height:gameSettings.PaddleLength,style:"fill:white",transform:`translate(${gameSettings.CanvasSize-gameSettings.PaddleOffset}, ${gameSettings.CanvasSize/2-gameSettings.PaddleLength/2})`})
pongBallSvg.mulAttr({width:10,height:10,style:"fill:white",transform:`translate(${gameSettings.CanvasSize/2-gameSettings.BallRadius/2}, ${gameSettings.CanvasSize/2-gameSettings.BallRadius/2})`})
centreLineSvg.mulAttr({x1:gameSettings.CanvasSize/2,x2:gameSettings.CanvasSize/2,y1:0,y2:gameSettings.CanvasSize,style:"stroke:white", "stroke-width":3, "stroke-dasharray":"10, 8"})
courtTopLineSvg.mulAttr({x1:"0",x2:gameSettings.CanvasSize,y1:"0",y2:"0",style:"stroke:white"})
courtBottomLineSvg.mulAttr({x1:"0",x2:gameSettings.CanvasSize,y1:gameSettings.CanvasSize,y2:gameSettings.CanvasSize,style:"stroke:white"})
playerOneScoreSvg.mulAttr({fill:"white","font-size":"4em",transform:`translate(${gameSettings.CanvasSize/2-gameSettings.CanvasSize/3}, ${gameSettings.CanvasSize/6})`})
playerOneScoreSvg.setTextContent("0")
playerTwoScoreSvg.mulAttr({fill:"white","font-size":"4em",transform:`translate(${gameSettings.CanvasSize/2+gameSettings.CanvasSize/3}, ${gameSettings.CanvasSize/6})`})
playerTwoScoreSvg.setTextContent("0")
gameOverTextSvg.mulAttr({fill:"white","font-size":"3em",transform:`translate(0, ${gameSettings.CanvasSize/2})`})
gameOverTextSvg.setTextContent("Game Over! Player X Won!")
gameOverTextSvg.hideElement(true)
pauseGroupSvg.hideElement(true)
pauseLeftRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasSize/2-40}, ${gameSettings.CanvasSize/2-40})`})
pauseRightRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasSize/2+20}, ${gameSettings.CanvasSize/2-40})`})


//A very bad pure psuedorandom 
const RNG = (seed:number):number => ((1103515245 * seed + 12345) % 0x80000000) / (0x80000000-1)

const randomFloatGenerator = interval(10)
const rngGenerator = RNG(99)

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

const createEntity = (id_string:string) => (view_type:ViewType) => (pos_vector:Vector) => <Entity>{
    id: id_string,
    viewType: view_type,
    pos: pos_vector,
    vel: Vector.Zero,
    acc: Vector.Zero
}

const randomIntBetween = (seed:number) => (min:number) => (max:number) => Math.floor(RNG(seed)*(max-min+1)+min)

const serveBall = (e:Entity) => (p:Player) => 
    p==='PlayerOne' ? {...e,
      pos: new Vector(gameSettings.CanvasSize/2, gameSettings.CanvasSize/2),
      vel: Vector.unitVecInDirection(randomIntBetween(210)(330)(Math.random())).scale(randomIntBetween(3)(8)(Math.random())),
      acc: Vector.Zero
  } : {...e,
    pos: new Vector(gameSettings.CanvasSize/2, gameSettings.CanvasSize/2),
    vel: Vector.unitVecInDirection(randomIntBetween(30)(150)(Math.random())).scale(randomIntBetween(3)(8)(Math.random())), 
    acc: Vector.Zero
}

const initialState:GameState = {
  time:0,
  playerOnePaddle: createEntity('paddlePlayerOne')('paddle')(new Vector(gameSettings.PaddleOffset, gameSettings.CanvasSize/2 - gameSettings.PaddleLength/2)),
  playerTwoPaddle: createEntity('paddlePlayerTwo')('paddle')(new Vector(gameSettings.CanvasSize - (gameSettings.PaddleWidth + gameSettings.PaddleOffset), gameSettings.CanvasSize/2 - gameSettings.PaddleLength/2)),
  ballState: serveBall(createEntity('pongBall')('ball')(new Vector(gameSettings.CanvasSize/2, gameSettings.CanvasSize/2)))('PlayerOne'),
  playState: 'Play',
  playerOneScore: 0,
  playerTwoScore: 0,
}

const moveEntity = (e:Entity) =>   e.viewType === 'paddle'   ? <Entity>{
  ...e,
  pos: new Vector(e.pos.x, entityCheckBounds(e.pos.add(e.vel).y)(gameSettings.PaddleLength)),
  vel: e.vel.add(e.acc),
} : <Entity>{
  ...e,
  pos: new Vector(entityCheckBounds(e.pos.x+e.vel.x)(gameSettings.BallRadius), entityCheckBounds(e.pos.y+e.vel.y)(gameSettings.BallRadius)),
  vel: e.vel.add(e.acc),
}

/**
 * A small function to check if two values a and b are within c of each other
 * @param a first value
 * @param b second value
 * @param c value of distance between a and b
 */
const near = (a:number) => (c:number) => (b:number):Boolean =>  Math.abs(a-b) <= c;

// const paddleCheckBounds = (pos:Vector):Vector => pos.y < 0 ? new Vector(gameSettings.PaddleOffset, 0) : pos.y + gameSettings.PaddleLength > gameSettings.CanvasSize ? new Vector(gameSettings.PaddleOffset,gameSettings.CanvasSize-gameSettings.PaddleLength) : new Vector(gameSettings.PaddleOffset,pos.y);
const entityCheckBounds = (pos:number) => (entitySize:number):number => pos < 0 ?  0 : pos + entitySize > gameSettings.CanvasSize ? gameSettings.CanvasSize-entitySize : pos;
const handleCollisions = (s:GameState) => paddleCollions(courtCollisions(s));


const courtCollisions = (s:GameState) => 
    near(s.ballState.pos.y)(gameSettings.BallRadius)(0) || near(s.ballState.pos.y)(gameSettings.BallRadius)(gameSettings.CanvasSize) ?  {...s, 
        ballState: {...s.ballState,
          vel: s.ballState.vel.scaleXY(1)(-1)  
        }
      } : near(s.ballState.pos.x)(gameSettings.BallRadius)(0) ? {...s,
        ballState: serveBall(s.ballState)('PlayerOne'),
        playerTwoScore: s.playerTwoScore + 1,
        playState: s.playerTwoScore + 1 >= gameSettings.WinningScore  ? 'GameOver'  as PlayState : s.playState
      }
      : near(s.ballState.pos.x)(gameSettings.BallRadius)(gameSettings.CanvasSize) ? {...s,
        ballState: serveBall(s.ballState)('PlayerTwo'),
        playerOneScore: s.playerOneScore + 1,
        playState: s.playerOneScore + 1 >= gameSettings.WinningScore ? 'GameOver' as PlayState : s.playState
      } 
      : s

  const paddleChecker = (paddle:Entity) => (ball:Entity) => paddle.pos.x < ball.pos.x + gameSettings.BallRadius &&
      paddle.pos.y < ball.pos.y + gameSettings.BallRadius &&
      ball.pos.x < paddle.pos.x + gameSettings.PaddleWidth &&
      ball.pos.y < paddle.pos.y + gameSettings.PaddleLength

const paddleCollions = (s:GameState) => !ballTowardsAi(s.ballState) && paddleChecker(s.playerOnePaddle)(s.ballState) ? {...s,
    ballState: {...s.ballState,
      vel: ballBounceVelocity(s.playerOnePaddle)(s.ballState).scale(1.3),
      // acc: ballBounceVelocity(s.playerOnePaddle)(s.ballState).scale(0.01)
    }
  } : ballTowardsAi(s.ballState) && paddleChecker(s.playerTwoPaddle)(s.ballState) ? {...s,
        ballState: {...s.ballState,
          vel: ballBounceVelocity(s.playerTwoPaddle)(s.ballState).scale(1.1),
          acc: Vector.Zero
       }
      } : s


const velVecInDirection = (direction:number) => (speed:number) => Vector.unitVecInDirection(direction).scale(speed)    
const paddleOnAiSide = (ball:Entity) => ball.pos.x > gameSettings.CanvasSize/2 
const ballTowardsAi = (ball:Entity) => ball.vel.x > 0
const paddleAi = (paddle:Entity) => (ball:Entity):Entity => paddleOnAiSide(ball) && ballTowardsAi(ball) ? paddle.pos.y+gameSettings.PaddleLength/2 > ball.pos.y ? {...paddle, vel:velVecInDirection(0)(gameSettings.PaddleAiSpeed)} : {...paddle, vel:velVecInDirection(180)(gameSettings.PaddleAiSpeed)} : {...paddle, vel:Vector.Zero}

const ballBounceVelocity = (paddle:Entity) => (ball:Entity):Vector => {
  const rely = (paddle.pos.y+gameSettings.PaddleLength/2)-(ball.pos.y+gameSettings.BallRadius)
  const bounceAngle = rely/(gameSettings.PaddleLength/2)*gameSettings.BallMaxBounceAngle 
  // console.log(((paddle.pos.y+(gameSettings.PaddleLength/2))-(ball.pos.y+gameSettings.BallRadius))/(gameSettings.PaddleLength/2))
  // console.log(paddle.pos.y+(gameSettings.PaddleLength/2))
  // console.log((ball.pos.y+gameSettings.BallRadius))
  // console.log(rely)
  // console.log(bounceAngle)
  return ballTowardsAi(ball) ? velVecInDirection(270+bounceAngle)(ball.vel.len()) : velVecInDirection(90-bounceAngle)(ball.vel.len())
}

const tick = (s:GameState, elapsed) => 
  s.playState === 'Play' ? handleCollisions({...s,
  playerOnePaddle: moveEntity(s.playerOnePaddle),
  ballState: moveEntity(s.ballState),
  playerTwoPaddle: moveEntity(paddleAi(s.playerTwoPaddle)(s.ballState)),
  time: elapsed
// }) : s.playState === 'Pause' ? s : s //TODO gAMEOVER sTATE
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
                    
  const pongGameObs =  interval(10).pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(upMoveKeyUp, downMoveKeyUp, upMoveKeyDown, downMoveKeyDown,  pauseKeyPress, restartKeyPress),
    scan(reduceState, initialState)
  )


  const startGame = () => pongGameObs.subscribe(updateView) 

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

function pong() {
    startGame();
    pongGameObs.pipe(filter((s:GameState)=>s.time%1000===0)).subscribe(console.log)
  }

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }

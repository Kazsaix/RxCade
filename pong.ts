import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil} from 'rxjs/operators';

//Game Settings Constants
const 
  gameSettings = new class {
    readonly CanvasSize = 600;
    readonly paddleLength = 100;
    readonly paddleWidth = 10;
    readonly PaddleOffset = 5;
    readonly BallRadius = 10;
    readonly BallAcc = 0.1;
    readonly WinningScore = 7;
    readonly InbetweenRoundInterval = 2;
  }
  
type Key = 'ArrowUp' | 'ArrowDown' | 'KeyP' | 'KeyR'

type Event = 'keydown' | 'keyup'

type ViewType = 'ball' | 'paddle'

type PlayState = 'Play' | 'Pause' | 'GameOver'

type Entity = Readonly<{
  id: string,
  viewType: ViewType,
  pos:Vector,
  vel:Vector,
  acc:Vector,  
}>


type GameState = Readonly<{
  time:number,
  playerOnePaddle:Entity,
  playerTwoPaddle:Entity,
  ballState:Entity,
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
class MovementDirection { constructor(public readonly direction: 'Up' | 'Down' | 'Stationary'){}}
class Pause {constructor(){}}

const createEntity = (id_string:string) => (view_type:ViewType) => (pos_vector:Vector) => <Entity>{
    id: id_string,
    viewType: view_type,
    pos: pos_vector,
    vel: Vector.Zero,
    acc: Vector.Zero
}

const initialState:GameState = {
  time:0,
  playerOnePaddle: createEntity('paddlePlayerOne')('paddle')(new Vector(gameSettings.PaddleOffset, gameSettings.CanvasSize/2 - gameSettings.paddleLength/2)),
  playerTwoPaddle: createEntity('paddlePlayerTwo')('paddle')(new Vector(gameSettings.CanvasSize - (gameSettings.paddleWidth + gameSettings.PaddleOffset), gameSettings.CanvasSize/2 - gameSettings.paddleLength/2)),
  ballState: createEntity('pongBall')('ball')(new Vector(gameSettings.CanvasSize/2, gameSettings.CanvasSize/2)),
  playState: 'Play',
  playerOneScore: 0,
  playerTwoScore: 0,
}

console.log(initialState);

const moveEntity = (e:Entity) => e.viewType === 'paddle' ? <Entity>{
  ...e,
  pos: paddleCheckBounds(e.pos.add(e.vel)),
  vel: e.vel.add(e.acc),
} : <Entity>{
  ...e,
  pos: e.pos.add(e.vel),
  vel: e.vel.add(e.acc),
}


/**
 * A small function to check if two values a and b are within c of each other
 * @param a first value
 * @param b second value
 * @param c value of distance between a and b
 */
const near = (a:number) => (c:number) => (b:number) =>
  c >= a-b && c <= a+b

const paddleCheckBounds = (pos:Vector):Vector => pos.y < 0 ? new Vector(gameSettings.PaddleOffset, 0) : pos.y + gameSettings.paddleLength > gameSettings.CanvasSize ? new Vector(gameSettings.PaddleOffset,gameSettings.CanvasSize) : new Vector(gameSettings.PaddleOffset,pos)

const handleCollisions = (s:GameState) => s;

const tick = (s:GameState, elapsed) => 
  s.playState === 'Play' ? handleCollisions({...s,
  playerOnePaddle: moveEntity(s.playerOnePaddle),
  time: elapsed
}) : s

const reduceState = (s:GameState, e:MovementDirection|Pause|Tick) =>
  e instanceof MovementDirection ? {...s,
    playerOnePaddle : {...s.playerOnePaddle,
      vel: e.direction === 'Up' ? Vector.unitVecInDirection(0).scale(1+s.playerOnePaddle.vel.len()) : e.direction === 'Down' ? Vector.unitVecInDirection(180).scale(1+s.playerOnePaddle.vel.len()) : Vector.Zero   
    }
  } : e instanceof Pause ? {...s,
    playState: s.playState === 'Play' ? 'Pause' : 'Play'
  } : tick(s, e.elapsed);

function updateView(s: GameState) {
  const 
    svg = document.getElementById("canvas"),
    paddlePlayerOneSVG = document.getElementById("paddlePlayerOne"),
    paddlePlayerTwoSvg = document.getElementById("paddlePlayerTwo"),
    attr = (e:Element) => (o:any) => { for(const k in o) e.setAttributeNS(svg.namespaceURI, k, String(o[k]))};
  attr(paddlePlayerOneSVG)({transform:`translate(${s.playerOnePaddle.pos.x.toFixed(2)} ${s.playerOnePaddle.pos.y.toFixed(2)})`});
  attr(paddlePlayerTwoSvg)({transform:`translate(${s.playerTwoPaddle.pos.x.toFixed(2)} ${s.playerTwoPaddle.pos.y.toFixed(2)})`});
}

function pong() {
  const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document, e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)
          ),
      upMoveKeyDown = keyObservable('keydown', 'ArrowUp', ()=>new MovementDirection('Up')),
      downMoveKeyDown = keyObservable('keydown', 'ArrowDown', ()=>new MovementDirection('Down')),
      upMoveKeyUp = keyObservable('keyup', 'ArrowUp', ()=> new MovementDirection('Stationary')),
      downMoveKeyUp = keyObservable('keyup', 'ArrowDown', ()=> new MovementDirection('Stationary')),
      pauseKeyPress = keyObservable('keydown', 'KeyP', ()=> new Pause());
    
  const up = upMoveKeyDown;
  up.subscribe(s=>console.log('UpPressed')) 
      
  const gameLoopObs = interval(10).pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(upMoveKeyDown, downMoveKeyDown, upMoveKeyUp, downMoveKeyUp, pauseKeyPress),
    scan(reduceState, initialState)
  )
  
  const g1 = gameLoopObs.subscribe(updateView),
    g2 = gameLoopObs.pipe(
      filter(s=> s.time % 1000 == 0)
    ).subscribe(s=>console.log(s))
  }

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }

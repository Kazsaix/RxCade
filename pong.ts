import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil} from 'rxjs/operators';

//Game Settings Constants
const 
  gameSettings = new class {
    readonly CanvasSize = 600;
    readonly PaddleLength = 100;
    readonly PaddleWidth = 10;
    readonly PaddleOffset = 5;
    readonly PaddleSpeed = 7;
    readonly BallRadius = 10;
    readonly BallAcc = 0.1;
    readonly WinningScore = 7;
    readonly InbetweenRoundInterval = 2;
  }

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
  scale2d = (s:number) => (t:number) => new Vector(this.x*s, this.y*t)
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

const createEntity = (id_string:string) => (view_type:ViewType) => (pos_vector:Vector) => <Entity>{
    id: id_string,
    viewType: view_type,
    pos: pos_vector,
    vel: Vector.Zero,
    acc: Vector.Zero
}

const randomIntBetween = (min:number) => (max:number) => Math.floor(Math.random()*(max-min+1)+min)

const serveBall = (e:Entity) => (p:Player) => 
    p==='PlayerOne' ? {...e,
      pos: new Vector(gameSettings.CanvasSize/2, gameSettings.CanvasSize/2),
      vel: Vector.unitVecInDirection(randomIntBetween(210)(330)).scale(randomIntBetween(3)(8))
  } : {...e,
    pos: new Vector(gameSettings.CanvasSize/2, gameSettings.CanvasSize/2),
    vel: Vector.unitVecInDirection(randomIntBetween(30)(150)).scale(randomIntBetween(3)(8))
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

const moveEntity = (e:Entity) => e.viewType === 'paddle' ? <Entity>{
  ...e,
  // pos: paddleCheckBounds(e.pos.add(e.vel)),
  pos: new Vector(gameSettings.PaddleOffset, paddleCheckBounds(e.pos.add(e.vel).y)),
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
const near = (a:number) => (c:number) => (b:number):Boolean =>  Math.abs(a-b) <= c;

// const paddleCheckBounds = (pos:Vector):Vector => pos.y < 0 ? new Vector(gameSettings.PaddleOffset, 0) : pos.y + gameSettings.PaddleLength > gameSettings.CanvasSize ? new Vector(gameSettings.PaddleOffset,gameSettings.CanvasSize-gameSettings.PaddleLength) : new Vector(gameSettings.PaddleOffset,pos.y);
   const paddleCheckBounds = (pos:number):number => pos < 0 ?  0 : pos + gameSettings.PaddleLength > gameSettings.CanvasSize ? gameSettings.CanvasSize-gameSettings.PaddleLength : pos;

const handleCollisions = (s:GameState) => courtCollisions(s);
// const handleCollisions = (s:GameState) => s;

const courtCollisions = (s:GameState) => 
    near(s.ballState.pos.y)(gameSettings.BallRadius)(0) || near(s.ballState.pos.y)(gameSettings.BallRadius)(gameSettings.CanvasSize) ?  {...s, 
        ballState: {...s.ballState,
          vel: s.ballState.vel.scale2d(1)(-1)  
        }
      } : near(s.ballState.pos.x)(gameSettings.BallRadius)(0) ? {...s,
        ballState: serveBall(s.ballState)('PlayerOne'),
        playerTwoScore: s.playerTwoScore + 1
      }
      : near(s.ballState.pos.x)(gameSettings.BallRadius)(gameSettings.CanvasSize) ? {...s,
        ballState: serveBall(s.ballState)('PlayerTwo'),
        playerOneScore: s.playerOneScore + 1
      } 
      : s


// const paddleCollions = ()

const tick = (s:GameState, elapsed) => 
  s.playState === 'Play' ? handleCollisions({...s,
  playerOnePaddle: moveEntity(s.playerOnePaddle),
  ballState: moveEntity(s.ballState),
  time: elapsed
}) : s.playState === 'Pause' ? s : s

const reduceState = (s:GameState, e:MovementDirection|Pause|Tick) =>
  e instanceof MovementDirection ? {...s,
    playerOnePaddle : {...s.playerOnePaddle,
      vel: e.direction === 'Up' ? Vector.unitVecInDirection(0).scale(gameSettings.PaddleSpeed) : 
      e.direction === 'Down' ? Vector.unitVecInDirection(180).scale(gameSettings.PaddleSpeed) : 
      e.direction === 'UpStop' ? s.playerOnePaddle.vel.sub(Vector.unitVecInDirection(0).scale(gameSettings.PaddleSpeed)) :    
      s.playerOnePaddle.vel.sub(Vector.unitVecInDirection(180).scale(gameSettings.PaddleSpeed))
    }
  } : e instanceof Pause ? {...s,
    playState: s.playState === 'Play' ? 'Pause' : 'Play'
  } : tick(s, e.elapsed);


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
      upMoveKeyUp = keyObservable('keyup', 'ArrowUp', ()=> new MovementDirection('UpStop')),
      downMoveKeyUp = keyObservable('keyup', 'ArrowDown', ()=> new MovementDirection('DownStop')),
      pauseKeyPress = keyObservable('keydown', 'KeyP', ()=> new Pause());
    
  const up = upMoveKeyDown;
  up.subscribe(s=>console.log('UpPressed')) 
      
  const gameLoopObs = interval(10).pipe(
    map(elapsed=>new Tick(elapsed)),
    merge(upMoveKeyUp, downMoveKeyUp, upMoveKeyDown, downMoveKeyDown,  pauseKeyPress),
    scan(reduceState, initialState)
  )
  
  const g1 = gameLoopObs.subscribe(updateView),
    g2 = gameLoopObs.pipe(
      filter(s=> s.time % 1000 == 0)
    ).subscribe(s=>console.log(s))

    function updateView(s: GameState) {
      const 
        svg = document.getElementById("canvas"),
        paddlePlayerOneSvg = document.getElementById("paddlePlayerOne"),
        paddlePlayerTwoSvg = document.getElementById("paddlePlayerTwo"),
        ballSvg = document.getElementById("pongBall"),
        attr = (e:Element) => (o:any) => { for(const k in o) e.setAttribute( k, String(o[k]))};
      attr(paddlePlayerOneSvg)({transform:`translate(${Math.round(s.playerOnePaddle.pos.x)} ${Math.round(s.playerOnePaddle.pos.y)})`});
      attr(paddlePlayerTwoSvg)({transform:`translate(${Math.round(s.playerTwoPaddle.pos.x)} ${Math.round(s.playerTwoPaddle.pos.y)})`});
      attr(ballSvg)({transform:`translate(${Math.round(s.ballState.pos.x)} ${Math.round(s.ballState.pos.y)})`});
      if (s.playState == 'GameOver') {
        g1.unsubscribe();
        // const gameOverMessage
      }
    }
  }

  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }

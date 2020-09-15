import { fromEvent, interval, from } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil} from 'rxjs/operators';

//Game Settings Constants
const 
  gameSettings = new class {
    readonly CanvasSize = 600;
    readonly BallAcc = 0.1;
    readonly WinningScore = 7;
    readonly InbetweenRoundInterval = 2;
  }
  

type Key = 'ArrowUp' | 'ArrowDown' | 'Space'

type Event = 'keydown' | 'keyup'

type ViewType = 'ball' | 'paddle'

type Entity = Readonly<{
  id: string,
  viewType: ViewType,
  pos:Vector,
  vel:Vector,
  acc:Vector,  
}>

type PlayState = 'Play' | 'Pause' | 'GameOver'

type GameState = Readonly<{
  time:Number,
  playerOneState:Entity,
  playerAiState:Entity,
  ballState:Entity,
  playState:PlayState,
  playerOneScore:Number,
  playerAiScore:Number,
}>

class Tick { constructor(public readonly elapsed:number){}}
class MovementDirection { constructor(public readonly direction:number){}}

const createPaddle = (pos_vector:Vector) => (id_string:string) => <Entity>{
    id: id_string,
    viewType: 'paddle',
    pos: pos_vector,
    vel: Vector.Zero,
    acc: Vector.Zero
}

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

const near = (a:number) => (b:number) => (c:number) =>
  c >= a-b && c <= a+b

const collision =(paddle)

function updateView(s: GameState) {
  const 
    svg = document.getElementById("")
}

function pong() {

  function upView(s: paddleState):void {
    const paddleplayer = paddle1;
    paddleplayer.setAttribute('transform',
        `translate(${s.x},${s.y})`)
  }

  type paddleState = Readonly<{
    x:number,
    y:number,
  }>

  const initPaddleState: paddleState = {x:10, y:250}

  function translate(s:paddleState, rel_x:number, rel_y:number): paddleState {
      return {...s, 
       x: s.x + rel_x,
        y: s.y + rel_y
      }
  }

  function movePaddle(s:paddleState, y_trans:number): paddleState {
    return translate(s, 0, y_trans)
  }


  const paddle1 = document.getElementById("paddlePlayer1")
  const keydown$ = fromEvent<KeyboardEvent>(document, 'keydown');
  const arrowKeys$ = keydown$.pipe(
    filter(({key})=>key === 'ArrowUp' || key === 'ArrowDown'),
    filter(({repeat})=>!repeat)
  )
  const moveUp$ = arrowKeys$.pipe(
    flatMap(d=>interval(10).pipe(
      takeUntil(fromEvent<KeyboardEvent>(document,'keyup').pipe(
        filter(({key})=>key === d.key)
      )), map(_=>d))),
      map(d=>d.key==='ArrowUp'?-5:5),
      scan(movePaddle, initPaddleState)
      )

    moveUp$.subscribe(upView)

  class Tick { constructor(public readonly elapsed:number) {}}
  
    const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document, e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)
          ),
      startMoveUp = keyObservable('keydown', 'ArrowUp', ()=>1)
    
  }
  
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }
  
  


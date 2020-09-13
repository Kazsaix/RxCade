import { fromEvent, interval } from 'rxjs';
import { map, filter, merge, scan} from 'rxjs/operators';

const 
  Constants = new class {
    readonly CanvasSize = 600;
    readonly BallAcc = 0.1;
    readonly ;
  };

type Key = 'ArrowUp' | 'ArrowDown' | 'Space'

type Event = 'keydown' | 'keyup'

type ViewType = 'ball' | 'paddle'

type Entity = Readonly<{
  id: string,

}>

type player1State = {

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

function pong() {
    class Tick { constructor(public readonly elapsed:number) {}}
  
    const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
      fromEvent<KeyboardEvent>(document, e)
          .pipe(
            filter(({code})=>code === k),
            filter(({repeat})=>!repeat),
            map(result)
          )
  }
  
  // the following simply runs your pong function on window load.  Make sure to leave it in place.
  if (typeof window != 'undefined')
    window.onload = ()=>{
      pong();
    }
  
  


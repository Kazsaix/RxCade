import { fromEvent, interval } from 'rxjs';
import { map, filter, merge, scan} from 'rxjs/operators';

const 
  Constants = new class {
    readonly CanvasSize = 600;
    readonly Bu
  }

type Key = 'ArrowUp' | 'ArrowDown' | 'Space'

type Event = 'keydown' | 'keyup'

type ViewType = 'ball' | 'paddle'

type Entity = Readonly<{
  id: string,

}>

type State = {
    
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
  
  


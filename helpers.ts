import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil, take} from 'rxjs/operators';

type Key = 'ArrowUp' | 'ArrowDown' | 'KeyP' | 'KeyR'

type Event = 'keydown' | 'keyup'

const keyObservable = <T>(e:Event, k:Key, result:()=>T)=>
fromEvent<KeyboardEvent>(document, e)
    .pipe(
      filter(({code})=>code === k),
      filter(({repeat})=>!repeat),
      map(result)
    )


/**
 * A small function to check if two values a and b are within c of each other
 * @param a first value
 * @param b second value
 * @param c value of distance between a and b
 */
const near = (a:number) => (c:number) => (b:number):Boolean =>  Math.abs(a-b) <= c;

// const entityCheckBounds = (pos:number) => (entitySize:number):number => pos < 0 ?  0 : pos + entitySize > gameSettings.CanvasSize ? gameSettings.CanvasSize-entitySize : pos;

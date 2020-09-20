import { fromEvent} from 'rxjs';
import { map, filter} from 'rxjs/operators';
import {Vector} from './vector'

export{keyObservable, near, velVecInDirection}

type Key = 'ArrowUp' | 'ArrowDown' | 'KeyP' | 'KeyR'

type Event = 'keydown' | 'keyup'

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
          )

/**
 * A small function to check if two values a and b are within c of each other
 * @param a first value
 * @param b second value
 * @param c value of distance between a and b
 * @returns boolean if a & b are within c of eachother

 */
const near = (a:number) => (c:number) => (b:number):Boolean =>  Math.abs(a-b) <= c;

// const entityCheckBounds = (pos:number) => (entitySize:number):number => pos < 0 ?  0 : pos + entitySize > gameSettings.CanvasSize ? gameSettings.CanvasSize-entitySize : pos;

/**
 * A small function to create a vector in the given bearing direction with given magnitude
 *  used to create velocity vectors to control the ball's movement
 * @param direction:number bearing angle to create vector to travel in
 * @param speed:number magnitude to scale vector to set velocity
 * @returns new Vector in given direction with given speed
 */
const velVecInDirection = (direction:number) => (speed:number) => Vector.unitVecInDirection(direction).scale(speed)   
export {LazySequence,randomSequence, randomFloatFromInt, randomIntBetween}

/**
 * A collection of functions for creating a lazily evaluated pseudorandom number generator in a functional manner
 * The random sequence requires a generated seed for the initial value
 * The random generated integers range from 0 to 2147483647 and are calculated using a very naive modulus operation
 *  as the use for this rng is for creating speed and direction for the ball in the games, where true randomness is not
 *  required
 */


/**
 * Lazy Sequence interface for generating infinite series 
 */
interface LazySequence<T> {
    value: T;
    next():LazySequence<T>;
  }
  
  /**
   * A function to initialise a lazy sequence with a given transformation function and initial value
   * Sourced from Tim Dywer's notes on functional programming @https://tgdwyer.github.io/lazyevaluation/
   * @param transform transformation to apply on each value in the series
   * @param initialValue value to initialise series with
   */
  function initSequence<T>(transform: (value: T) => T): (initialValue: T) => LazySequence<T> {
    return function _next(initialValue:T):LazySequence<T>{
        return{
            value: initialValue,
            next: () => _next(transform(initialValue)),
        }
    }
  }
  
  //A very bad pure psuedorandom sequence of numbers 
  const randomSequence = initSequence<number>((seed)=>(1103515245 * seed + 12345) % 0x80000000)
  
  /**
   * A small function to turn a randomly generated integer from random sequence into a float between 0 and 1
   * @param randNumber randomly generated integer
   * @returns int between 0 and 2147483647
   */
  const randomFloatFromInt = (randNumber:number) => randNumber / (0x80000000 - 1)
  
  /**
   * A small function to give a number between a given range from a randomly generated float
   * This function takes a randomly generated float, it does not generate its own number
   * @param min bottom of range for generated number
   * @param max top of range for generated number
   * @param randomNumber random float generated by psuedorandom generator
   */
  const randomIntBetween =  (min:number) => (max:number) => (randomNumber:number) => Math.floor(randomFloatFromInt(randomNumber)*(max-min+1)+min)
  
import {Vector} from './vector'
import {randomIntBetween} from './randomSequence'

export {Entity, ViewType, createEntity, moveEntity, entityCheckBounds, entityCollisionChecker, serveEntity}


type ViewType = 'ball' | 'paddle' | 'brick'

class Entity {
    readonly id:string;
    readonly viewType: ViewType;
    readonly xSize:number;
    readonly ySize:number;
    readonly pos:Vector;
    readonly vel:Vector;
    readonly acc:Vector;
  }
  
  /**
   * A function to initialise entities
   * @param id_string 
   */
  const createEntity = (id_string:string) => (viewType:ViewType) => (posVector:Vector) => (entityXSize:number) => (entityYSize:number):Entity  => 
    <Entity>{
      id: id_string,
      viewType: viewType,
      pos: posVector,
      xSize: entityXSize,
      ySize: entityYSize,
      vel: Vector.Zero,
      acc: Vector.Zero,
    } 
  
  /**
   * A function that controls movement for entities, applying its current velocity to its position and its current acceleration to its velocity
   * This function also checks the bounds of the new position to ensure it is within the game canvas
   * @param e entity to move
   * @returns updated state of entity after movement
   */
  const moveEntity = (e:Entity) => (canvasXSize:number) => (canvasYSize:number):Entity =>  <Entity>{
    ...e,
    pos: new Vector(entityCheckBounds(e.pos.x+e.vel.x)(e.xSize)(canvasXSize), entityCheckBounds(e.pos.y+e.vel.y)(e.ySize)(canvasYSize)),
    vel: e.vel.add(e.acc),
  }
  
  /**
   * A small function to 
   * @param pos 
   */
  const entityCheckBounds = (pos:number) => (entitySize:number)=> (canvasSize:number):number  => pos < 0 ?  0 : pos + entitySize > canvasSize ? canvasSize-entitySize : pos;
  
  
  const entityCollisionChecker = (entityA:Entity) => (entityB:Entity) => entityA.pos.x < entityB.pos.x + entityB.xSize &&
  entityA.pos.y < entityB.pos.y + entityB.ySize &&
        entityB.pos.x < entityA.pos.x + entityA.xSize &&
        entityB.pos.y < entityA.pos.y + entityA.ySize
  

  
/**
 * A function to move the ball towards a direction, with a random speed and angle
 * @param ball 
 * @param direction:number angle of direction to move entity towards
 * @param randomNumber1 randomly generated integer from randomSequence
 * @param randomNumber2 next randomly generated integer from randomSequence
 */
const serveEntity = (ball:Entity) => (direction:number) => (randomNumber1:number) => (randomNumber2:number) => (canvasXSize:number) => (canvasYSize:number):Entity  => 
<Entity>{...ball,
 pos: new Vector(canvasXSize/2, canvasYSize/2),
 vel: Vector.unitVecInDirection(randomIntBetween(direction-60)(direction+60)(randomNumber1)).scale(randomIntBetween(3)(8)(randomNumber2)),
 acc: Vector.Zero
} 

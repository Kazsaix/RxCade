 export {Vector}
 
 /**
 * Simple Pure Vector Math Class
 * adapted from Tim Dwyer's Work @https://tgdwyer.github.io/asteroids/
 * All methods return a new vector
 * Default parameters intitialised with 0,0
 * add(v) method adds another vector to this vector and returns a new vector
 * sub(v) method subtracts another from this vector and returns a new vector
 * len() method returns the magnitude of this vector
 * scale(s) method scales this vector by s in both x and y and returns a new vector
 * scaleXY(s)(t) method scales x by s and y by t and returns the new vector
 * ortho() method returns a new vector orthogonal to this vector
 * rotate(deg) method returns a new vector rotated clockwise by the given angle in degrees
 * unitVecInDirection(deg) is a static method that creates a unit vector in the bearing direction given by the angle deg in degrees
 * Zero is a static property that returns the vector of (0,0)
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
import { fromEvent, interval, from, Observable } from 'rxjs';
import { map, filter, merge, scan, flatMap, takeUntil, take} from 'rxjs/operators';
import {Elem} from './svgElementHelper';
import {Vector} from './vector';
import * as random from './randomSequence';


// //Setup Game Constants
// const 
//   gameSettings = new class {
//     readonly CanvasXSize = 600;
//     readonly CanvasYSize = 800;
//     readonly PaddleXSize = 100;
//     readonly PaddleYSize = 10;
//     readonly PaddleOffset = 15;
//     readonly BallRadius = 5;
//     readonly BallAcc = 0.1;
//     readonly BallMaxBounceAngle = 75;
//   }

// //Create SVG Elements
// const canvasSvg = document.getElementById("canvas")!,
//   playerOnePaddleSvg = new Elem(canvasSvg, "rect", "paddlePlayerOne" ),
//   pongBallSvg = new Elem(canvasSvg, "rect", "pongBall"),
//   courtTopLineSvg = new Elem(canvasSvg, "line", "courtTopLine"),
//   courtLeftLineSvg = new Elem(canvasSvg, "line", "courtLeftLine"),
//   courtRightLineSvg = new Elem(canvasSvg, "line", "courtRightLine"),
//   playerOneScoreSvg = new Elem(canvasSvg, "text", "playerOneScoreText"),
//   gameOverTextSvg = new Elem(canvasSvg, "text", "gameOver"),
//   pauseGroupSvg = new Elem(canvasSvg, "g", "pauseIconGroup"),
//   pauseLeftRectSvg = new Elem(canvasSvg, "rect", "pauseLeftRectangle", pauseGroupSvg.elem),
//   pauseRightRectSvg = new Elem(canvasSvg, "rect", "pauseLeftRectangle", pauseGroupSvg.elem);

// //Initialise SVG element attributes
// playerOnePaddleSvg.mulAttr({width:gameSettings.PaddleYSize,height:gameSettings.PaddleXSize,style:"fill:white",transform:`translate(${gameSettings.PaddleOffset}, ${gameSettings.CanvasYSize/2-gameSettings.PaddleXSize/2})`})
// pongBallSvg.mulAttr({width:10,height:10,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-gameSettings.BallRadius/2}, ${gameSettings.CanvasYSize/2-gameSettings.BallRadius/2})`})
// courtTopLineSvg.mulAttr({x1:"0",x2:gameSettings.CanvasXSize,y1:"0",y2:"0",style:"stroke:white"})
// courtLeftLineSvg.mulAttr({x1:"0",x2:0,y1:0,y2:gameSettings.CanvasYSize,style:"stroke:white"})
// courtRightLineSvg.mulAttr({x1:gameSettings.CanvasXSize,x2:gameSettings.CanvasXSize,y1:0,y2:gameSettings.CanvasYSize,style:"stroke:white"})
// playerOneScoreSvg.mulAttr({fill:"white","font-size":"4em",transform:`translate(${gameSettings.CanvasXSize/2-gameSettings.CanvasXSize/3}, ${gameSettings.CanvasYSize/6})`})
// playerOneScoreSvg.setTextContent("0")
// gameOverTextSvg.mulAttr({fill:"white","font-size":"3em",transform:`translate(0, ${gameSettings.CanvasXSize/2})`})
// gameOverTextSvg.setTextContent("Game Over! Player X Won!")
// gameOverTextSvg.hideElement(true)
// pauseGroupSvg.hideElement(true)
// pauseLeftRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2-40}, ${5*gameSettings.CanvasYSize/8})`})
// pauseRightRectSvg.mulAttr({width:20,height:80,style:"fill:white",transform:`translate(${gameSettings.CanvasXSize/2+20}, ${5*gameSettings.CanvasYSize/8})`})

// //Impure call to Create random seed for random number sequence 
// //seed is outputted to the console for debugging purposes, so the game state can be recreated
// const randomSeed = Math.random()*0x8000000
// console.log(`the generated random seed: ${randomSeed}`)



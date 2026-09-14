export type MapPoint={x:number;y:number};

export const TACTICAL_COLS=6;
export const TACTICAL_ROWS=8;

// Collision mask for the single illustrated battle-map background.
// Coordinates are zero-based: x 0–5 from left to right, y 0–7 from top to bottom.
// Every entry corresponds to a complete, visibly impassable 10-foot square.
export const TACTICAL_OBSTACLES:MapPoint[]=[
  {x:0,y:0},{x:5,y:0},
  {x:0,y:2},{x:5,y:2},
  {x:2,y:3},{x:3,y:3},
  {x:0,y:5},{x:5,y:5},
  {x:0,y:6},{x:1,y:6},{x:4,y:6},{x:5,y:6},
  {x:0,y:7},{x:5,y:7}
];

export type MapPoint={x:number;y:number};

export const TACTICAL_COLS=6;
export const TACTICAL_ROWS=8;

// Quiet meadow variants dominate the board. Earth and moss are contained patches,
// not edge-to-edge roads, so the painterly surface reads as one continuous field.
const tiles:number[][]=[
  [8,0,1,0,2,8],
  [1,0,4,1,0,2],
  [13,2,0,5,1,10],
  [0,1,9,0,2,1],
  [2,0,1,6,0,3],
  [12,1,0,2,1,14],
  [0,11,2,0,13,1],
  [1,0,2,3,0,1]
];

export const TACTICAL_TILES=tiles;
export const TACTICAL_OBSTACLES:MapPoint[]=[];
for(let y=0;y<TACTICAL_ROWS;y++)for(let x=0;x<TACTICAL_COLS;x++)if(tiles[y][x]>=8)TACTICAL_OBSTACLES.push({x,y});

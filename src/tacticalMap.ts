export type MapPoint={x:number;y:number};

export const TACTICAL_COLS=6;
export const TACTICAL_ROWS=8;

const tiles=Array.from({length:TACTICAL_ROWS},(_,y)=>
  Array.from({length:TACTICAL_COLS},(_,x)=>(x*7+y*5+(x*y)%3)%4)
);

const paint=(tile:number,points:MapPoint[])=>points.forEach(({x,y})=>{tiles[y][x]=tile;});

// A compact woodland ruin: four quiet walkable surfaces and unmistakable solid scenery.
paint(2,Array.from({length:8},(_,y)=>({x:2,y})));
paint(2,Array.from({length:8},(_,y)=>({x:3,y})));
paint(3,[{x:1,y:3},{x:2,y:3},{x:3,y:3},{x:4,y:3},{x:1,y:4},{x:2,y:4},{x:3,y:4},{x:4,y:4}]);
paint(8,[{x:0,y:0},{x:5,y:0},{x:0,y:7},{x:5,y:7}]);
paint(9,[{x:0,y:3},{x:5,y:4}]);
paint(10,[{x:1,y:2},{x:4,y:5}]);
paint(11,[{x:4,y:2},{x:1,y:5}]);
paint(13,[{x:0,y:5},{x:5,y:2}]);

export const TACTICAL_TILES=tiles;
export const TACTICAL_OBSTACLES:MapPoint[]=[];
for(let y=0;y<TACTICAL_ROWS;y++)for(let x=0;x<TACTICAL_COLS;x++)if(tiles[y][x]>=8)TACTICAL_OBSTACLES.push({x,y});

export type MapPoint={x:number;y:number};

export const TACTICAL_COLS=12;
export const TACTICAL_ROWS=16;

const tiles=Array.from({length:TACTICAL_ROWS},(_,y)=>
  Array.from({length:TACTICAL_COLS},(_,x)=>(x*7+y*5+(x*y)%3)%4)
);

const paint=(tile:number,points:MapPoint[])=>points.forEach(({x,y})=>{tiles[y][x]=tile;});

// A north-gate ruin, central flagstone yard, and south approach. Tiles 8–15 are solid scenery.
paint(5,Array.from({length:16},(_,y)=>({x:5,y})));
paint(5,Array.from({length:16},(_,y)=>({x:6,y})));
paint(7,Array.from({length:4},(_,dy)=>Array.from({length:6},(_,dx)=>({x:3+dx,y:6+dy}))).flat());
paint(8,[2,3,4,7,8,9].map(x=>({x,y:2})));
paint(9,[{x:2,y:3},{x:9,y:3}]);
paint(10,[{x:2,y:4},{x:9,y:4},{x:3,y:11},{x:8,y:11}]);
paint(11,[{x:3,y:4},{x:8,y:4},{x:2,y:10},{x:9,y:10}]);
paint(12,[{x:0,y:0},{x:1,y:0},{x:10,y:0},{x:11,y:0},{x:0,y:5},{x:11,y:6},{x:0,y:14},{x:11,y:15}]);
paint(13,[{x:1,y:7},{x:10,y:8},{x:1,y:12},{x:10,y:13}]);
paint(14,[{x:3,y:5},{x:8,y:10}]);
paint(15,[{x:1,y:4},{x:10,y:5},{x:2,y:13},{x:9,y:14}]);

export const TACTICAL_TILES=tiles;
export const TACTICAL_OBSTACLES:MapPoint[]=[];
for(let y=0;y<TACTICAL_ROWS;y++)for(let x=0;x<TACTICAL_COLS;x++)if(tiles[y][x]>=8)TACTICAL_OBSTACLES.push({x,y});
